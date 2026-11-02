package com.ddas.api.service;

import com.ddas.api.dto.request.AlertRequestDTO;
import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.AlertTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Evacuation command center: live people (grouped for privacy), SOS calls, emergency services and
 * a timeline. Reads the existing sos_events, location_sharing_sessions and emergency_service_providers
 * tables with plain SQL (no new entities, so Hibernate's schema validation is unaffected).
 */
@Service
@RequiredArgsConstructor
public class CommandCenterService {

    /** People are shown as counts per ~450 m cell; an exact position is only shown for an SOS. */
    private static final double CELL_DEG = 0.004;
    private static final int FRESH_MINUTES = 30;
    private static final List<String> OPEN_SOS = List.of("triggered", "acknowledged", "responding");

    private final JdbcTemplate jdbc;
    private final EvacuationRouteService routeService;
    private final AlertService alertService;
    private final AlertTypeRepository alertTypeRepository;
    private final TeamService teamService;

    @Transactional(readOnly = true)
    public Map<String, Object> snapshot() {
        List<EvacuationRouteService.ZoneShape> zones = routeService.currentDangerZones();

        // ── People sharing their location ──────────────────────────────────────
        List<Map<String, Object>> people = jdbc.queryForList(
                "SELECT last_latitude lat, last_longitude lng, session_type type FROM location_sharing_sessions " +
                "WHERE status = 'active' AND share_with_authorities = 1 AND last_latitude IS NOT NULL " +
                "AND last_update_at > NOW() - INTERVAL " + FRESH_MINUTES + " MINUTE");
        Map<String, double[]> cells = new LinkedHashMap<>();   // key -> [sumLat, sumLng, count, inDanger]
        int inDanger = 0;
        for (Map<String, Object> p : people) {
            double lat = ((Number) p.get("lat")).doubleValue();
            double lng = ((Number) p.get("lng")).doubleValue();
            boolean danger = zones.stream().anyMatch(z -> z.contains(lat, lng));
            if (danger) inDanger++;
            String key = Math.floor(lat / CELL_DEG) + ":" + Math.floor(lng / CELL_DEG);
            double[] c = cells.computeIfAbsent(key, k -> new double[4]);
            c[0] += lat; c[1] += lng; c[2]++; if (danger) c[3]++;
        }
        List<Map<String, Object>> peopleCells = cells.values().stream().map(c -> Map.<String, Object>of(
                "lat", c[0] / c[2], "lng", c[1] / c[2], "count", (int) c[2], "inDanger", (int) c[3])).toList();

        Integer arrived = jdbc.queryForObject(
                "SELECT COUNT(*) FROM location_sharing_sessions WHERE status = 'ended' AND ended_at > NOW() - INTERVAL 6 HOUR", Integer.class);

        // ── SOS calls: open ones, plus those resolved in the last 30 minutes ───
        List<Map<String, Object>> sos = jdbc.queryForList(
                "SELECT e.id, e.status, e.latitude lat, e.longitude lng, e.custom_message message, e.triggered_at triggeredAt, " +
                "e.acknowledged_at acknowledgedAt, e.responding_at respondingAt, e.resolved_at resolvedAt, e.battery_level battery, " +
                "e.response_notes responseNotes, e.response_time_seconds responseSeconds, t.name type, u.full_name person, d.name damName, " +
                // a real phone (mobile app user), not a simulated resident of the scenario
                "u.email NOT LIKE '%@scenario.ddas.local' phone, " +
                "JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.assignedProviderName')) assignedTo, e.metadata " +
                "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id JOIN users u ON u.id = e.user_id " +
                "LEFT JOIN dams d ON d.id = e.dam_id " +
                "WHERE e.status IN ('triggered','acknowledged','responding') OR e.resolved_at > NOW() - INTERVAL 30 MINUTE " +
                "ORDER BY FIELD(e.status,'triggered','acknowledged','responding','resolved'), e.triggered_at DESC LIMIT 100");
        // the teams on each SOS (several can go to one), and whether one asked for backup
        sos.forEach(s -> {
            Object meta = s.remove("metadata");
            s.put("teams", teamService.teamList(meta));
            s.put("backupRequested", teamService.backupRequested(meta));
        });
        long sosOpen = sos.stream().filter(s -> OPEN_SOS.contains(String.valueOf(s.get("status")))).count();

        // ── Emergency services and shelters ─────────────────────────────────────
        List<Map<String, Object>> services = jdbc.queryForList(
                "SELECT id, name, service_type type, latitude lat, longitude lng, address_text address " +
                "FROM emergency_service_providers WHERE status <> 'inactive' AND show_on_map = 1 AND deleted_at IS NULL");
        Map<String, Object> shelterTotals = jdbc.queryForMap(
                "SELECT COALESCE(SUM(capacity_persons),0) capacity, COALESCE(SUM(current_occupancy),0) occupancy, COUNT(*) shelters " +
                "FROM system_safe_locations WHERE deleted_at IS NULL AND status = 'active'");

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("peopleSharing", people.size());
        summary.put("peopleInDanger", inDanger);
        summary.put("arrivedAtShelters", arrived);
        summary.put("sosOpen", sosOpen);
        summary.put("zonesActive", zones.size());
        summary.putAll(shelterTotals);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("summary", summary);
        out.put("peopleCells", peopleCells);
        out.put("sos", sos);
        out.put("services", services);
        out.put("timeline", timeline());
        // Downstream rivers (OpenStreetMap lines) for the flood-path layer; active = dam not safe
        out.put("rivers", jdbc.queryForList(
                "SELECT d.id damId, d.name damName, d.downstream_river_geojson geojson, " +
                "COALESCE(s.hazard_status, 'safe') <> 'safe' active, s.last_hazard_assessment_at activeSince " +
                "FROM dams d LEFT JOIN dam_current_status s ON s.dam_id = d.id " +
                "WHERE d.status <> 'decommissioned' AND d.downstream_river_geojson IS NOT NULL"));
        return out;
    }

    private static final String RECENT = " > NOW() - INTERVAL 24 HOUR";

    /**
     * Last 40 things that happened, newest first. One query per source, merged here: the tables
     * use different text collations, so a single SQL UNION fails with "Illegal mix of collations".
     * Never fails the snapshot; on error the timeline is just empty.
     */
    private List<Map<String, Object>> timeline() {
        String[] sources = {
                "SELECT created_at ts, 'alert' kind, title text, severity detail FROM alerts WHERE created_at" + RECENT,
                "SELECT e.triggered_at ts, 'sos' kind, CONCAT('SOS: ', t.name) text, u.full_name detail FROM sos_events e " +
                        "JOIN sos_event_types t ON t.id = e.sos_type_id JOIN users u ON u.id = e.user_id WHERE e.triggered_at" + RECENT,
                "SELECT e.responding_at ts, 'sos_assigned' kind, COALESCE(e.response_notes, 'Responder assigned') text, t.name detail " +
                        "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.responding_at" + RECENT,
                "SELECT e.resolved_at ts, 'sos_resolved' kind, CONCAT('SOS resolved: ', t.name) text, e.resolution_notes detail " +
                        "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.resolved_at" + RECENT,
                "SELECT created_at ts, 'blocked' kind, CONCAT('Road blocked: ', name) text, reason detail FROM blocked_roads WHERE created_at" + RECENT,
        };
        List<Map<String, Object>> all = new ArrayList<>();
        for (String sql : sources) {
            try {
                all.addAll(jdbc.queryForList(sql + " ORDER BY ts DESC LIMIT 40"));
            } catch (Exception e) {
                // One broken source must not hide the rest of the command center
            }
        }
        all.sort(Comparator.comparing((Map<String, Object> m) -> String.valueOf(m.get("ts"))).reversed());
        return all.size() > 40 ? all.subList(0, 40) : all;
    }

    @Transactional
    public void acknowledge(Long sosId, Long userId) {
        update(sosId, "UPDATE sos_events SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = ? " +
                "WHERE id = ? AND status = 'triggered'", userId, sosId);
    }

    @Transactional
    public void assign(Long sosId, Long providerId) {
        // The station's team account gets the mission on its phone (TeamService)
        teamService.dispatch(sosId, providerId);
    }

    @Transactional
    public void resolve(Long sosId, Long userId, String notes) {
        update(sosId, "UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, resolution_notes = ? " +
                "WHERE id = ? AND status IN ('triggered','acknowledged','responding')",
                userId, notes == null || notes.isBlank() ? "Resolved by operator" : notes, sosId);
    }

    /**
     * Clear the real phones (mobile app users) from the map: end their sharing and close their open SOS.
     * Sessions are dated back past the 30-minute window so they drop off at once. Scenario people are untouched.
     */
    @Transactional
    public Map<String, Integer> resetPhones(Long userId) {
        String phones = "SELECT id FROM users WHERE email NOT LIKE '%@scenario.ddas.local'";
        int sos = jdbc.update("UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, " +
                "resolution_notes = 'Reset by operator' WHERE status IN ('triggered','acknowledged','responding') " +
                "AND user_id IN (" + phones + ")", userId);
        int sessions = jdbc.update("UPDATE location_sharing_sessions SET status = 'ended', " +
                "ended_at = NOW() - INTERVAL 31 MINUTE WHERE user_id IN (" + phones + ") " +
                "AND (status = 'active' OR ended_at > NOW() - INTERVAL 31 MINUTE)");
        return Map.of("sessions", sessions, "sos", sos);
    }

    private void update(Long sosId, String sql, Object... params) {
        if (jdbc.update(sql, params) == 0) {
            throw new BadRequestException("SOS " + sosId + " not found or already closed");
        }
    }

    /** Evacuation Order for one dam's downstream zones, through the normal alert flow (SMS only if switched on). */
    @Transactional
    public AlertResponseDTO broadcast(Long damId, String title, String message) {
        AlertType type = alertTypeRepository.findByCode("EVACUATION_ORDER")
                .orElseThrow(() -> new BadRequestException("Alert type EVACUATION_ORDER is missing"));
        AlertRequestDTO request = new AlertRequestDTO();
        request.setAlertTypeId(type.getId());
        request.setDamId(damId);
        request.setTitle(title);
        request.setMessage(message);
        request.setSeverity(AlertType.AlertSeverity.critical);
        request.setStatus(Alert.AlertStatus.active);
        return alertService.createAlert(request);
    }
}
