package com.ddas.api.service;

import com.ddas.api.dto.request.EvacuationRouteRequest;
import com.ddas.api.dto.response.EvacuationRouteResponse;
import com.ddas.api.entity.BlockedRoad;
import com.ddas.api.entity.DamHazardZone;
import com.ddas.api.entity.SystemSafeLocation;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.BlockedRoadRepository;
import com.ddas.api.repository.DamHazardZoneRepository;
import com.ddas.api.repository.SystemSafeLocationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Finds the fastest route from a person to an open shelter outside every active danger zone.
 *
 * 1. Danger zones = evacuation-level hazard zones of dams that are not "safe".
 * 2. Candidate shelters = open, not full, not inside a danger zone; nearest 5 by straight line.
 * 3. Valhalla routes to each, avoiding danger zones and blocked roads; the fastest wins.
 * 4. The route is "safe" only if it arrives before the flood reaches the person's zone.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EvacuationRouteService {

    private static final int CANDIDATE_SHELTERS = 5;
    // Used only for the straight-line fallback when Valhalla is unreachable
    private static final double WALK_KMH = 4.5;
    private static final double DRIVE_KMH = 30.0;

    private final DamHazardZoneRepository hazardZoneRepository;
    private final SystemSafeLocationRepository safeLocationRepository;
    private final BlockedRoadRepository blockedRoadRepository;
    private final ValhallaClient valhallaClient;
    private final ObjectMapper objectMapper;

    private record ZoneShape(DamHazardZone zone, List<List<double[]>> rings) {
    }

    private record Candidate(SystemSafeLocation shelter, double straightKm) {
    }

    private record Routed(Candidate candidate, ValhallaClient.Route route) {
    }

    public EvacuationRouteResponse findRoute(EvacuationRouteRequest request) {
        double lat = request.getLat();
        double lng = request.getLng();
        boolean drive = "drive".equals(request.getMode());

        List<ZoneShape> dangerZones = hazardZoneRepository.findCurrentDangerZones().stream()
                .map(z -> new ZoneShape(z, GeoPolygons.outerRings(objectMapper, z.getBoundaryGeojson())))
                .toList();

        // The most severe zone (lowest level number) the person is standing in
        Optional<ZoneShape> userZone = dangerZones.stream()
                .filter(z -> GeoPolygons.containsAny(z.rings(), lat, lng))
                .min(Comparator.comparing(z -> z.zone().getHazardLevel().getLevelNumber()));

        // Valhalla can't start inside an excluded area, so the person's own zones stay routable
        List<List<double[]>> avoid = new ArrayList<>();
        for (ZoneShape z : dangerZones) {
            z.rings().stream().filter(r -> !GeoPolygons.contains(r, lat, lng)).forEach(avoid::add);
        }
        for (BlockedRoad b : blockedRoadRepository.findCurrentlyBlocked(LocalDateTime.now())) {
            GeoPolygons.outerRings(objectMapper, b.getBoundaryGeojson()).stream()
                    .filter(r -> !GeoPolygons.contains(r, lat, lng)).forEach(avoid::add);
        }

        List<Candidate> candidates = safeLocationRepository.findAllByDeletedAtIsNull().stream()
                .filter(s -> s.getStatus() == SystemSafeLocation.Status.active)
                .filter(s -> freeCapacity(s) == null || freeCapacity(s) > 0)
                .filter(s -> dangerZones.stream().noneMatch(z -> GeoPolygons.containsAny(
                        z.rings(), s.getLatitude().doubleValue(), s.getLongitude().doubleValue())))
                .map(s -> new Candidate(s, GeoPolygons.distanceKm(
                        lat, lng, s.getLatitude().doubleValue(), s.getLongitude().doubleValue())))
                .sorted(Comparator.comparingDouble(Candidate::straightKm))
                .limit(CANDIDATE_SHELTERS)
                .toList();
        if (candidates.isEmpty()) {
            throw new ResourceNotFoundException("No open shelter found outside the danger zones");
        }

        String costing = drive ? "auto" : "pedestrian";
        List<Routed> routed = new ArrayList<>();
        for (Candidate c : candidates) {
            valhallaClient.route(lat, lng, c.shelter().getLatitude().doubleValue(),
                            c.shelter().getLongitude().doubleValue(), costing, avoid)
                    .ifPresent(route -> routed.add(new Routed(c, route)));
        }
        routed.sort(Comparator.comparingDouble(r -> r.route().timeMinutes()));

        Integer floodEtaMin = userZone.map(z -> floodEta(z.zone())).orElse(null);
        EvacuationRouteResponse.EvacuationRouteResponseBuilder response = EvacuationRouteResponse.builder()
                .inDangerZone(userZone.isPresent())
                .zone(userZone.map(z -> toZone(z.zone())).orElse(null))
                .floodEtaMin(floodEtaMin);

        if (routed.isEmpty()) {
            // Routing engine down or no road avoids the zones: point to the nearest shelter
            Candidate nearest = candidates.get(0);
            int etaMin = (int) Math.ceil(nearest.straightKm() / (drive ? DRIVE_KMH : WALK_KMH) * 60);
            return response
                    .shelter(toShelter(nearest.shelter()))
                    .distanceKm(round(nearest.straightKm()))
                    .etaMin(etaMin)
                    .safe(floodEtaMin == null || etaMin <= floodEtaMin)
                    .routingAvailable(false)
                    .instructions(List.of("Head to " + nearest.shelter().getName() + " by the safest road you know"))
                    .alternatives(List.of())
                    .build();
        }

        Routed best = routed.get(0);
        int etaMin = (int) Math.ceil(best.route().timeMinutes());
        return response
                .shelter(toShelter(best.candidate().shelter()))
                .route(EvacuationRouteResponse.LineString.builder().coordinates(best.route().shape()).build())
                .distanceKm(round(best.route().distanceKm()))
                .etaMin(etaMin)
                .safe(floodEtaMin == null || etaMin <= floodEtaMin)
                .routingAvailable(true)
                .instructions(best.route().instructions())
                .alternatives(routed.stream().skip(1).map(r -> EvacuationRouteResponse.Alternative.builder()
                        .shelter(toShelter(r.candidate().shelter()))
                        .distanceKm(round(r.route().distanceKm()))
                        .etaMin((int) Math.ceil(r.route().timeMinutes()))
                        .build()).toList())
                .build();
    }

    private static Integer freeCapacity(SystemSafeLocation s) {
        if (s.getCapacityPersons() == null) {
            return null;
        }
        int occupied = s.getCurrentOccupancy() == null ? 0 : s.getCurrentOccupancy();
        return Math.max(0, s.getCapacityPersons() - occupied);
    }

    private static Integer floodEta(DamHazardZone zone) {
        return zone.getEstimatedFloodArrivalMinutes() != null
                ? zone.getEstimatedFloodArrivalMinutes()
                : zone.getHazardLevel().getEstimatedFloodTimeMinutes();
    }

    private static EvacuationRouteResponse.Zone toZone(DamHazardZone z) {
        return EvacuationRouteResponse.Zone.builder()
                .id(z.getId())
                .name(z.getZoneName())
                .nameSi(z.getZoneNameSi())
                .hazardLevel(z.getHazardLevel().getLevelNumber())
                .damName(z.getDam().getName())
                .build();
    }

    private static EvacuationRouteResponse.Shelter toShelter(SystemSafeLocation s) {
        return EvacuationRouteResponse.Shelter.builder()
                .id(s.getId())
                .name(s.getName())
                .nameSi(s.getNameSi())
                .lat(s.getLatitude().doubleValue())
                .lng(s.getLongitude().doubleValue())
                .freeCapacity(freeCapacity(s))
                .contactPhone(s.getEmergencyPhone() != null ? s.getEmergencyPhone() : s.getContactPhone())
                .build();
    }

    private static double round(double km) {
        return Math.round(km * 10) / 10.0;
    }
}
