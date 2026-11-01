package com.ddas.api.service;

import com.ddas.api.dto.response.EvacuationStatusResponse;
import com.ddas.api.entity.EvacuationDevice;
import com.ddas.api.entity.SystemSafeLocation;
import com.ddas.api.repository.BlockedRoadRepository;
import com.ddas.api.repository.EvacuationDeviceRepository;
import com.ddas.api.repository.SystemSafeLocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Builds the live evacuation picture and streams it to dashboards over Server-Sent Events.
 * Browsers reconnect an EventSource by themselves, so a dropped connection heals on its own.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvacuationLiveService {

    static final int DEVICE_FRESH_HOURS = 6;
    private static final long STREAM_TIMEOUT_MS = 30 * 60 * 1000L;

    private final EvacuationRouteService routeService;
    private final SystemSafeLocationRepository safeLocationRepository;
    private final BlockedRoadRepository blockedRoadRepository;
    private final EvacuationDeviceRepository deviceRepository;
    private final com.ddas.api.repository.DamHazardZoneRepository hazardZoneRepository;

    private final List<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    @Transactional(readOnly = true)
    public EvacuationStatusResponse status() {
        List<EvacuationRouteService.ZoneShape> zones = routeService.currentDangerZones();
        List<EvacuationDevice> devices = deviceRepository.findByLastSeenAtAfter(
                LocalDateTime.now().minusHours(DEVICE_FRESH_HOURS));

        List<EvacuationStatusResponse.Zone> zoneRows = zones.stream().map(z -> {
            var zone = z.zone();
            int inside = (int) devices.stream()
                    .filter(d -> z.contains(d.getLatitude().doubleValue(), d.getLongitude().doubleValue()))
                    .count();
            return EvacuationStatusResponse.Zone.builder()
                    .id(zone.getId())
                    .name(zone.getZoneName())
                    .damName(zone.getDam().getName())
                    .hazardLevel(zone.getHazardLevel().getLevelNumber())
                    .color(zone.getFillColor() != null ? zone.getFillColor() : zone.getHazardLevel().getColor())
                    .boundaryGeojson(zone.getBoundaryGeojson())
                    .floodEtaMin(zone.getEstimatedFloodArrivalMinutes() != null
                            ? zone.getEstimatedFloodArrivalMinutes()
                            : zone.getHazardLevel().getEstimatedFloodTimeMinutes())
                    .devicesInside(inside)
                    .build();
        }).toList();

        List<EvacuationStatusResponse.Shelter> shelters = safeLocationRepository.findAllByDeletedAtIsNull().stream()
                .filter(s -> s.getLatitude() != null && s.getLongitude() != null)
                .map(s -> toShelter(s, zones))
                .toList();

        List<EvacuationStatusResponse.Blocked> blocked = blockedRoadRepository.findCurrentlyBlocked(LocalDateTime.now())
                .stream()
                .map(b -> EvacuationStatusResponse.Blocked.builder()
                        .id(b.getId())
                        .name(b.getName())
                        .reason(b.getReason())
                        .boundaryGeojson(b.getBoundaryGeojson())
                        .expiresAt(b.getExpiresAt())
                        .build())
                .toList();

        int inDanger = (int) devices.stream()
                .filter(d -> zones.stream().anyMatch(z -> z.contains(
                        d.getLatitude().doubleValue(), d.getLongitude().doubleValue())))
                .count();

        // L4/L5 of the same dams: no evacuation, shown lighter on the map as watch areas
        List<EvacuationStatusResponse.Zone> watchRows = hazardZoneRepository.findCurrentWatchZones().stream()
                .map(EvacuationLiveService::zoneRow)
                .toList();
        // Zones of safe dams: a faint planning view, so the map is never empty
        List<EvacuationStatusResponse.Zone> planningRows = hazardZoneRepository.findPlanningZones().stream()
                .map(EvacuationLiveService::zoneRow)
                .toList();

        return EvacuationStatusResponse.builder()
                .dangerZones(zoneRows)
                .watchZones(watchRows)
                .planningZones(planningRows)
                .shelters(shelters)
                .blockedRoads(blocked)
                .activeDevices(devices.size())
                .devicesInDanger(inDanger)
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private static EvacuationStatusResponse.Zone zoneRow(com.ddas.api.entity.DamHazardZone zone) {
        return EvacuationStatusResponse.Zone.builder()
                .id(zone.getId())
                .name(zone.getZoneName())
                .damName(zone.getDam().getName())
                .hazardLevel(zone.getHazardLevel().getLevelNumber())
                .color(zone.getFillColor() != null ? zone.getFillColor() : zone.getHazardLevel().getColor())
                .boundaryGeojson(zone.getBoundaryGeojson())
                .floodEtaMin(zone.getEstimatedFloodArrivalMinutes() != null
                        ? zone.getEstimatedFloodArrivalMinutes()
                        : zone.getHazardLevel().getEstimatedFloodTimeMinutes())
                .build();
    }

    private static EvacuationStatusResponse.Shelter toShelter(SystemSafeLocation s,
                                                             List<EvacuationRouteService.ZoneShape> zones) {
        double lat = s.getLatitude().doubleValue();
        double lng = s.getLongitude().doubleValue();
        return EvacuationStatusResponse.Shelter.builder()
                .id(s.getId())
                .name(s.getName())
                .lat(lat)
                .lng(lng)
                .capacity(s.getCapacityPersons())
                .occupancy(s.getCurrentOccupancy())
                .status(s.getStatus() == null ? null : s.getStatus().name())
                .inDangerZone(zones.stream().anyMatch(z -> z.contains(lat, lng)))
                .build();
    }

    public SseEmitter subscribe() {
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        emitters.add(emitter);
        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> emitters.remove(emitter));
        emitter.onError(e -> emitters.remove(emitter));
        try {
            emitter.send(SseEmitter.event().name("status").data(status()));
        } catch (IOException e) {
            emitters.remove(emitter);
        }
        return emitter;
    }

    public void broadcast(EvacuationStatusResponse status) {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("status").data(status));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }

    /** Keeps idle connections open through nginx (its default read timeout is 60 s). */
    public void heartbeat() {
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().comment("ping"));
            } catch (Exception e) {
                emitters.remove(emitter);
            }
        }
    }
}
