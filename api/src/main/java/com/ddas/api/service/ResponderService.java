package com.ddas.api.service;

import com.ddas.api.entity.BlockedRoad;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.BlockedRoadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Demo responder teams (role RESPONDER, accounts from seed_responders.py): the SOS calls assigned to
 * their station, their own live position, and a road route to the person. Simulated teams only:
 * no real police, hospital or fire service is contacted. Uses the existing sos_events columns
 * (assigned_responder_id, metadata) and location_sharing_sessions.
 */
@Service
@RequiredArgsConstructor
public class ResponderService {

    private final JdbcTemplate jdbc;
    private final ValhallaClient valhallaClient;
    private final BlockedRoadRepository blockedRoadRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    /** The team and its station. */
    public Map<String, Object> me(Long userId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("station", jdbc.queryForList(
                "SELECT id, name, service_type type, latitude lat, longitude lng, address_text address " +
                "FROM emergency_service_providers WHERE JSON_EXTRACT(metadata, '$.responderUserId') = ? LIMIT 1", userId)
                .stream().findFirst().orElse(null));
        return out;
    }

    /** Missions: open SOS calls assigned to this team, plus the ones closed in the last 6 hours. */
    public List<Map<String, Object>> missions(Long userId) {
        return jdbc.queryForList(
                "SELECT e.id, e.status, t.code typeCode, t.name type, e.custom_message message, e.battery_level battery, " +
                "e.triggered_at triggeredAt, e.responding_at assignedAt, e.resolved_at resolvedAt, u.full_name person, " +
                "d.name damName, " +
                // the person's live position while they share it, else where the SOS was sent
                "COALESCE(s.last_latitude, e.latitude) lat, COALESCE(s.last_longitude, e.longitude) lng, " +
                "TIMESTAMPDIFF(SECOND, COALESCE(s.last_update_at, e.triggered_at), NOW()) positionAgeSeconds, " +
                "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(e.metadata, '$.teamStatus')), 'assigned') teamStatus, " +
                "e.resolution_notes resolutionNotes " +
                "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id JOIN users u ON u.id = e.user_id " +
                "LEFT JOIN dams d ON d.id = e.dam_id " +
                "LEFT JOIN location_sharing_sessions s ON s.id = (SELECT MAX(id) FROM location_sharing_sessions " +
                "  WHERE user_id = e.user_id AND status = 'active') " +
                "WHERE e.assigned_responder_id = ? AND (e.status IN ('triggered','acknowledged','responding') " +
                "  OR e.resolved_at > NOW() - INTERVAL 6 HOUR) " +
                "ORDER BY e.status = 'resolved', e.triggered_at DESC", userId);
    }

    /** accept -> on_the_way, arrived, or resolve (with a note). */
    @Transactional
    public void update(Long userId, Long sosId, String action, String notes) {
        int n = switch (action) {
            case "accept" -> jdbc.update("UPDATE sos_events SET status = 'responding', responding_at = COALESCE(responding_at, NOW()), " +
                    "metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), '$.teamStatus', 'on_the_way', '$.acceptedAt', NOW()) " +
                    "WHERE id = ? AND assigned_responder_id = ? AND status IN ('triggered','acknowledged','responding')", sosId, userId);
            case "arrived" -> jdbc.update("UPDATE sos_events SET " +
                    "metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), '$.teamStatus', 'arrived', '$.arrivedAt', NOW()) " +
                    "WHERE id = ? AND assigned_responder_id = ? AND status IN ('triggered','acknowledged','responding')", sosId, userId);
            case "resolve" -> jdbc.update("UPDATE sos_events SET status = 'resolved', resolved_at = NOW(), resolved_by = ?, " +
                    "resolution_notes = ?, metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), '$.teamStatus', 'rescued') " +
                    "WHERE id = ? AND assigned_responder_id = ? AND status IN ('triggered','acknowledged','responding')",
                    userId, notes == null || notes.isBlank() ? "Rescued by the response team" : notes, sosId, userId);
            default -> throw new BadRequestException("Unknown action: " + action);
        };
        if (n == 0) throw new ResourceNotFoundException("Mission " + sosId + " not found or already closed");
    }

    /** The team's position, shown to the person who called and on the command center map. */
    public int location(Long userId, double lat, double lng) {
        return jdbc.update("UPDATE sos_events SET metadata = JSON_SET(COALESCE(metadata, JSON_OBJECT()), " +
                "'$.teamLat', ?, '$.teamLng', ?, '$.teamAt', DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s')) " +
                "WHERE assigned_responder_id = ? AND status IN ('triggered','acknowledged','responding')", lat, lng, userId);
    }

    /** Road route (driving) from the team to the person; avoids blocked roads, not the flood zones they must enter. */
    public Map<String, Object> route(double fromLat, double fromLng, double toLat, double toLng) {
        List<List<double[]>> avoid = new ArrayList<>();
        for (BlockedRoad b : blockedRoadRepository.findCurrentlyBlocked(LocalDateTime.now())) {
            GeoPolygons.outerRings(objectMapper, b.getBoundaryGeojson()).stream()
                    .filter(r -> !GeoPolygons.contains(r, fromLat, fromLng) && !GeoPolygons.contains(r, toLat, toLng))
                    .forEach(avoid::add);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        valhallaClient.route(fromLat, fromLng, toLat, toLng, "auto", avoid).ifPresentOrElse(r -> {
            out.put("route", Map.of("type", "LineString", "coordinates", r.shape()));
            out.put("distanceKm", Math.round(r.distanceKm() * 10) / 10.0);
            out.put("etaMin", (int) Math.ceil(r.timeMinutes()));
            out.put("instructions", r.instructions());
            out.put("routingAvailable", true);
        }, () -> {
            out.put("route", Map.of("type", "LineString", "coordinates", List.of(new double[]{fromLng, fromLat}, new double[]{toLng, toLat})));
            double km = GeoPolygons.distanceKm(fromLat, fromLng, toLat, toLng);
            out.put("distanceKm", Math.round(km * 10) / 10.0);
            out.put("etaMin", (int) Math.ceil(km / 40 * 60));
            out.put("instructions", List.of());
            out.put("routingAvailable", false);
        });
        return out;
    }
}
