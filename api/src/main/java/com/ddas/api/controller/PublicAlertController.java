package com.ddas.api.controller;

import com.ddas.api.dto.response.PublicAlertResponseDTO;
import com.ddas.api.entity.Alert;
import com.ddas.api.entity.Dam;
import com.ddas.api.repository.AlertRepository;
import com.ddas.api.repository.DamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Public Alert Controller — DDAS Step 7
 *
 * Authentication නොමැතිව public-ව access කළ හැකි API endpoints.
 * React Frontend / Mobile App / Any public consumer → data ලබාගත හැකිය.
 *
 * Base Path: /api/public
 *
 * Endpoints:
 *   GET /api/public/active-alerts          — All active + escalated alerts
 *   GET /api/public/active-alerts/dam/{id} — Alerts for specific dam
 *   GET /api/public/active-alerts/summary  — Count summary (dashboard widget)
 *
 * Security: SecurityConfig-ෙ /api/public/** permitAll() list-ට add කෙරේ.
 */
@Slf4j
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicAlertController {

    private final AlertRepository alertRepository;
    private final DamRepository   damRepository;

    // ── Endpoints ──────────────────────────────────────────────────────────────

    /**
     * GET /api/public/active-alerts
     *
     * Database-ෙ active + escalated alerts all fetch කර
     * Dam + Region info enrich කර JSON-ය frontend-ට return.
     *
     * React Web UI public information page-ෙ alert ticker/cards use කරයි.
     * Authentication: NONE — Open to public.
     *
     * @return List of active alerts with dam and region details
     */
    @GetMapping("/active-alerts")
    public ResponseEntity<Map<String, Object>> getActiveAlerts() {
        log.debug("[PUBLIC] GET /api/public/active-alerts — Fetching active alerts for public");

        // Active + escalated alerts fetch (draft/resolved/expired exclude)
        List<Alert> activeAlerts = alertRepository.findByStatus(Alert.AlertStatus.active);
        List<Alert> escalatedAlerts = alertRepository.findByStatus(Alert.AlertStatus.escalated);

        List<Alert> allAlerts = new java.util.ArrayList<>(activeAlerts);
        allAlerts.addAll(escalatedAlerts);

        // Dam info cache — reduce DB queries (N+1 prevention)
        List<Long> damIds = allAlerts.stream()
                .filter(a -> a.getDamId() != null)
                .map(Alert::getDamId)
                .distinct()
                .toList();

        Map<Long, Dam> damCache = damRepository.findAllById(damIds).stream()
                .collect(Collectors.toMap(Dam::getId, d -> d));

        // Map to public-safe DTOs
        List<PublicAlertResponseDTO> dtos = allAlerts.stream()
                .filter(a -> !a.isSimulationMode()) // Simulation alerts exclude — public-ට නොපෙනේ
                .map(alert -> toPublicDTO(alert, damCache))
                .sorted((a, b) -> {
                    // Emergency > critical > warning > info ordering
                    int severityOrder = compareSeverity(b.getSeverity(), a.getSeverity());
                    if (severityOrder != 0) return severityOrder;
                    // Same severity — newest first
                    if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                        return b.getCreatedAt().compareTo(a.getCreatedAt());
                    }
                    return 0;
                })
                .toList();

        log.info("[PUBLIC] Returning {} active alerts (total: active={}, escalated={})",
                dtos.size(), activeAlerts.size(), escalatedAlerts.size());

        return ResponseEntity.ok(Map.of(
                "success", true,
                "timestamp", LocalDateTime.now().toString(),
                "totalCount", dtos.size(),
                "data", dtos
        ));
    }

    /**
     * GET /api/public/active-alerts/dam/{damId}
     *
     * Specific dam-ය-ෙ active alerts — Dam detail page-ෙ alert section use කරයි.
     * Authentication: NONE.
     *
     * @param damId Dam ID
     */
    @GetMapping("/active-alerts/dam/{damId}")
    public ResponseEntity<Map<String, Object>> getActiveAlertsByDam(@PathVariable Long damId) {
        log.debug("[PUBLIC] GET /api/public/active-alerts/dam/{} — Fetching dam-specific alerts", damId);

        List<Alert> alerts = alertRepository.findActiveAlertsByDamId(damId);

        Optional<Dam> damOpt = damRepository.findByIdWithRegion(damId);
        Map<Long, Dam> damCache = damOpt.map(d -> Map.of(damId, d)).orElse(Map.of());

        List<PublicAlertResponseDTO> dtos = alerts.stream()
                .filter(a -> !a.isSimulationMode())
                .map(alert -> toPublicDTO(alert, damCache))
                .toList();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "damId", damId,
                "totalCount", dtos.size(),
                "data", dtos
        ));
    }

    /**
     * GET /api/public/active-alerts/summary
     *
     * Alert count summary — Dashboard widget / public status page use.
     * Authentication: NONE.
     */
    @GetMapping("/active-alerts/summary")
    public ResponseEntity<Map<String, Object>> getAlertSummary() {
        long activeCount   = alertRepository.countByStatus(Alert.AlertStatus.active);
        long escalatedCount = alertRepository.countByStatus(Alert.AlertStatus.escalated);
        long totalActive   = activeCount + escalatedCount;

        // Highest severity active alert
        List<Alert> activeAlerts = alertRepository.findByStatus(Alert.AlertStatus.active);
        String highestSeverity = activeAlerts.stream()
                .map(a -> a.getSeverity() != null ? a.getSeverity().name() : "info")
                .max(PublicAlertController::compareSeverity)
                .orElse("none");

        return ResponseEntity.ok(Map.of(
                "success", true,
                "activeAlerts", activeCount,
                "escalatedAlerts", escalatedCount,
                "totalActiveAlerts", totalActive,
                "highestSeverity", highestSeverity,
                "hasActiveEmergency", activeAlerts.stream()
                        .anyMatch(a -> "emergency".equalsIgnoreCase(
                                a.getSeverity() != null ? a.getSeverity().name() : "")),
                "timestamp", LocalDateTime.now().toString()
        ));
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    /**
     * Alert entity → PublicAlertResponseDTO.
     * Dam + Region info enrich from cache.
     */
    private PublicAlertResponseDTO toPublicDTO(Alert alert, Map<Long, Dam> damCache) {
        Dam dam = alert.getDamId() != null ? damCache.get(alert.getDamId()) : null;

        return PublicAlertResponseDTO.builder()
                .id(alert.getId())
                .uuid(alert.getUuid())
                .title(alert.getTitle())
                .message(alert.getMessage())
                .severity(alert.getSeverity() != null ? alert.getSeverity().name() : "info")
                .status(alert.getStatus() != null ? alert.getStatus().name() : "active")
                .damId(alert.getDamId())
                .damName(dam != null ? dam.getName() : null)
                .damCode(dam != null ? dam.getCode() : null)
                .damLatitude(dam != null && dam.getLatitude() != null ? dam.getLatitude().doubleValue() : null)
                .damLongitude(dam != null && dam.getLongitude() != null ? dam.getLongitude().doubleValue() : null)
                .regionId(alert.getRegionId() != null ? alert.getRegionId() :
                        (dam != null && dam.getRegion() != null ? dam.getRegion().getId() : null))
                .regionName(dam != null && dam.getRegion() != null ? dam.getRegion().getName() : null)
                .alertTypeCode(alert.getAlertType() != null ? alert.getAlertType().getCode() : null)
                .alertTypeName(alert.getAlertType() != null ? alert.getAlertType().getName() : null)
                .alertTypeCategory(alert.getAlertType() != null ? alert.getAlertType().getCategory() : null)
                .simulationMode(alert.isSimulationMode())
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getUpdatedAt())
                .build();
    }

    // ── Severity Comparator ───────────────────────────────────────────────────

    private static int compareSeverity(String a, String b) {
        return Integer.compare(severityOrder(a), severityOrder(b));
    }

    private static int severityOrder(String severity) {
        if (severity == null) return 0;
        return switch (severity.toLowerCase()) {
            case "emergency" -> 4;
            case "critical"  -> 3;
            case "warning"   -> 2;
            case "info"      -> 1;
            default          -> 0;
        };
    }
}
