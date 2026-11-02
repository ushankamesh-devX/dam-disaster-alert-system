package com.ddas.api.service;

import com.ddas.api.dto.response.EvacuationRouteResponse;
import com.ddas.api.dto.response.EvacuationStatusResponse;
import com.ddas.api.entity.EvacuationDevice;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.EvacuationDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Every 15 s: refreshes the live dashboard when the evacuation picture changes, and (when
 * ddas.evacuation.warnings.enabled) warns phones inside a danger zone by Expo push and SMS.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EvacuationMonitor {

    // Routes are computed per device; cap the work per tick, the rest go next tick
    private static final int MAX_WARNINGS_PER_TICK = 50;

    private final EvacuationLiveService liveService;
    private final EvacuationRouteService routeService;
    private final EvacuationDeviceRepository deviceRepository;
    private final ExpoPushClient expoPushClient;
    private final NotifyLkSmsGateway smsGateway;

    @Value("${sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${ddas.evacuation.warnings.enabled:false}")
    private boolean warningsEnabled;

    private String lastSignature = "";

    @Scheduled(fixedDelay = 15_000, initialDelay = 30_000)
    @Transactional
    public void tick() {
        try {
            EvacuationStatusResponse status = liveService.status();
            String signature = signature(status);
            boolean changed = !signature.equals(lastSignature);
            if (changed) {
                lastSignature = signature;
                liveService.broadcast(status);
            } else {
                liveService.heartbeat();
            }
            if (warningsEnabled) {
                warnDevices(changed);
            }
        } catch (Exception e) {
            log.error("Evacuation monitor tick failed: {}", e.getMessage(), e);
        }
    }

    /** Everything the dashboard shows, minus the timestamp. */
    private static String signature(EvacuationStatusResponse s) {
        String zones = s.getDangerZones().stream()
                .map(z -> z.getId() + ":" + z.getDevicesInside()).collect(Collectors.joining(","));
        String shelters = s.getShelters().stream()
                .map(x -> x.getId() + ":" + x.getOccupancy() + ":" + x.getStatus() + ":" + x.isInDangerZone())
                .collect(Collectors.joining(","));
        String blocked = s.getBlockedRoads().stream()
                .map(b -> b.getId() + ":" + b.getBoundaryGeojson().hashCode()).collect(Collectors.joining(","));
        return zones + "|" + shelters + "|" + blocked + "|" + s.getActiveDevices();
    }

    private void warnDevices(boolean pictureChanged) {
        List<EvacuationRouteService.ZoneShape> zones = routeService.currentDangerZones();
        List<EvacuationDevice> devices = deviceRepository.findByLastSeenAtAfter(
                LocalDateTime.now().minusHours(EvacuationLiveService.DEVICE_FRESH_HOURS));

        List<ExpoPushClient.Message> pushes = new ArrayList<>();
        int warned = 0;
        for (EvacuationDevice d : devices) {
            double lat = d.getLatitude().doubleValue();
            double lng = d.getLongitude().doubleValue();
            Optional<EvacuationRouteService.ZoneShape> zone = EvacuationRouteService.zoneAt(zones, lat, lng);

            if (zone.isEmpty()) {
                if (d.getLastNotifiedZoneId() != null) {
                    pushes.add(new ExpoPushClient.Message(d.getExpoPushToken(), "All clear",
                            "Your area is no longer in a flood danger zone.", Map.of("type", "all_clear")));
                    d.setLastNotifiedZoneId(null);
                    d.setLastNotifiedAt(LocalDateTime.now());
                }
                continue;
            }

            Long zoneId = zone.get().zone().getId();
            boolean firstWarning = !zoneId.equals(d.getLastNotifiedZoneId());
            // Already warned about this zone: only resend when zones/blocked roads changed the route
            if ((!firstWarning && !pictureChanged) || warned >= MAX_WARNINGS_PER_TICK) {
                continue;
            }
            warned++;

            String zoneName = zone.get().zone().getZoneName();
            String title = firstWarning ? "EVACUATE NOW: " + zoneName : "Evacuation route updated";
            String body;
            Map<String, Object> data;
            try {
                EvacuationRouteResponse route = routeService.findRoute(lat, lng, "drive".equals(d.getMode()), zones);
                body = String.format("Go to %s (%.1f km, ~%d min).%s", route.getShelter().getName(),
                        route.getDistanceKm(), route.getEtaMin(),
                        route.getFloodEtaMin() != null ? " Flood expected in " + route.getFloodEtaMin() + " min." : "");
                data = Map.of("type", "evacuate", "zoneId", zoneId, "shelterId", route.getShelter().getId());
            } catch (ResourceNotFoundException e) {
                body = "No open shelter found. Move to high ground now and call 117.";
                data = Map.of("type", "evacuate", "zoneId", zoneId);
            }
            pushes.add(new ExpoPushClient.Message(d.getExpoPushToken(), title, body, data));
            if (firstWarning) {
                sendSms(d.getPhone(), title + ". " + body);
            }
            d.setLastNotifiedZoneId(zoneId);
            d.setLastNotifiedAt(LocalDateTime.now());
        }

        if (!pushes.isEmpty()) {
            log.info("Sending {} evacuation push notifications", pushes.size());
            expoPushClient.send(pushes);
        }
    }

    private void sendSms(String phone, String message) {
        if (!smsEnabled || phone == null || phone.isBlank()) {
            return;
        }
        try {
            smsGateway.send(phone, message.length() > 160 ? message.substring(0, 157) + "..." : message);
        } catch (Exception e) {
            log.warn("Evacuation SMS to {} failed: {}", phone, e.getMessage());
        }
    }
}
