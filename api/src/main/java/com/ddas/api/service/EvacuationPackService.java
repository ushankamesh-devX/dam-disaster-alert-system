package com.ddas.api.service;

import com.ddas.api.dto.response.EvacuationRouteResponse;
import com.ddas.api.entity.DamHazardZone;
import com.ddas.api.entity.EvacuationRoutePack;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.DamHazardZoneRepository;
import com.ddas.api.repository.EvacuationRoutePackRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Offline route packs: for every evacuation-level zone, the route from the zone's center to its
 * best shelter, computed as if that zone's dam were in danger. The app downloads them in advance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvacuationPackService {

    private static final List<String> MODES = List.of("walk", "drive");

    private final DamHazardZoneRepository hazardZoneRepository;
    private final EvacuationRoutePackRepository packRepository;
    private final EvacuationRouteService routeService;
    private final ObjectMapper objectMapper;

    @Scheduled(cron = "${ddas.routing.packs.cron:0 15 */6 * * *}")
    @Transactional
    public int rebuildAll() {
        List<DamHazardZone> zones = hazardZoneRepository.findAllEvacuationZones();
        Map<Long, List<EvacuationRouteService.ZoneShape>> byDam = zones.stream()
                .collect(Collectors.groupingBy(z -> z.getDam().getId(),
                        Collectors.collectingAndThen(Collectors.toList(), routeService::shapes)));

        int built = 0;
        for (List<EvacuationRouteService.ZoneShape> damZones : byDam.values()) {
            for (EvacuationRouteService.ZoneShape shape : damZones) {
                double[] center = center(shape);
                if (center == null) {
                    continue;
                }
                for (String mode : MODES) {
                    try {
                        EvacuationRouteResponse route = routeService.findRoute(
                                center[0], center[1], "drive".equals(mode), damZones);
                        save(shape.zone().getId(), mode, route);
                        built++;
                    } catch (ResourceNotFoundException e) {
                        log.debug("No shelter for zone {}: {}", shape.zone().getId(), e.getMessage());
                    } catch (Exception e) {
                        log.warn("Route pack for zone {} ({}) failed: {}", shape.zone().getId(), mode, e.getMessage());
                    }
                }
            }
        }
        log.info("Built {} evacuation route packs for {} zones", built, zones.size());
        return built;
    }

    /** Stored center if set, otherwise the average of the outer ring's points. Returns [lat, lng]. */
    private static double[] center(EvacuationRouteService.ZoneShape shape) {
        DamHazardZone z = shape.zone();
        if (z.getCenterLatitude() != null && z.getCenterLongitude() != null) {
            return new double[]{z.getCenterLatitude().doubleValue(), z.getCenterLongitude().doubleValue()};
        }
        if (shape.rings().isEmpty() || shape.rings().get(0).isEmpty()) {
            return null;
        }
        List<double[]> ring = shape.rings().get(0);
        double lat = ring.stream().mapToDouble(p -> p[1]).average().orElse(0);
        double lng = ring.stream().mapToDouble(p -> p[0]).average().orElse(0);
        return new double[]{lat, lng};
    }

    private void save(Long zoneId, String mode, EvacuationRouteResponse route) throws Exception {
        EvacuationRoutePack pack = packRepository.findByHazardZoneIdAndMode(zoneId, mode)
                .orElseGet(() -> EvacuationRoutePack.builder().hazardZoneId(zoneId).mode(mode).build());
        pack.setRouteJson(objectMapper.writeValueAsString(route));
        pack.setComputedAt(LocalDateTime.now());
        packRepository.save(pack);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> packs(Long zoneId) {
        List<EvacuationRoutePack> packs = zoneId != null
                ? packRepository.findByHazardZoneId(zoneId)
                : packRepository.findAll();
        return packs.stream().map(p -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("zoneId", p.getHazardZoneId());
            row.put("mode", p.getMode());
            row.put("computedAt", p.getComputedAt().toString());
            row.put("route", parse(p.getRouteJson()));
            return row;
        }).toList();
    }

    private Object parse(String json) {
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return null;
        }
    }
}
