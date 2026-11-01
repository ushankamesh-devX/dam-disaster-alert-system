package com.ddas.api.controller;

import com.ddas.api.exception.BadRequestException;
import com.ddas.api.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * For the mobile app (signed-in residents): share location with authorities during an emergency,
 * send an SOS, and say "I'm safe". Feeds the evacuation command center. Uses the existing
 * location_sharing_sessions / location_sharing_updates / sos_events tables.
 */
@RestController
@RequestMapping("/api/v1/safety")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class SafetyController {

    private final JdbcTemplate jdbc;

    @GetMapping("/sos-types")
    public ResponseEntity<List<Map<String, Object>>> sosTypes() {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT code, name, name_si nameSi, default_message defaultMessage FROM sos_event_types " +
                "WHERE is_active = 1 ORDER BY display_order, id"));
    }

    /** Body: { lat, lng, speedMps?, battery? }. Starts sharing on the first call; send about every 30 s. */
    @PostMapping("/location")
    @Transactional
    public ResponseEntity<Map<String, Object>> location(@RequestBody Map<String, Object> body,
                                                        @AuthenticationPrincipal UserPrincipal me) {
        double lat = number(body, "lat"), lng = number(body, "lng");
        Long session = activeSession(me.getUser().getId());
        if (session == null) {
            jdbc.update("INSERT INTO location_sharing_sessions (uuid, user_id, session_type, share_token, expires_at, status, " +
                    "update_interval_seconds, share_with_authorities, last_latitude, last_longitude, last_update_at) " +
                    "VALUES (?, ?, 'manual', ?, NOW() + INTERVAL 12 HOUR, 'active', 30, 1, ?, ?, NOW())",
                    UUID.randomUUID().toString(), me.getUser().getId(), "app-" + UUID.randomUUID(), lat, lng);
            session = activeSession(me.getUser().getId());
        } else {
            jdbc.update("UPDATE location_sharing_sessions SET last_latitude = ?, last_longitude = ?, last_update_at = NOW(), " +
                    "location_update_count = location_update_count + 1 WHERE id = ?", lat, lng, session);
        }
        jdbc.update("INSERT INTO location_sharing_updates (session_id, latitude, longitude, speed_mps, battery_level) VALUES (?, ?, ?, ?, ?)",
                session, lat, lng, body.get("speedMps"), body.get("battery"));
        return ResponseEntity.ok(Map.of("sharing", true, "sessionId", session));
    }

    /** Stop sharing (e.g. the person turned it off). */
    @PostMapping("/location/stop")
    public ResponseEntity<Void> stop(@AuthenticationPrincipal UserPrincipal me) {
        jdbc.update("UPDATE location_sharing_sessions SET status = 'ended', ended_at = NOW() WHERE user_id = ? AND status = 'active'",
                me.getUser().getId());
        return ResponseEntity.noContent().build();
    }

    /** "I'm safe": ends sharing; the command center counts the person as having reached safety. */
    @PostMapping("/safe")
    public ResponseEntity<Void> safe(@AuthenticationPrincipal UserPrincipal me) {
        return stop(me);
    }

    /** Body: { type: 'flood_trapped' | 'injured' | 'medical' | ..., message?, lat, lng, battery? } */
    @PostMapping("/sos")
    @Transactional
    public ResponseEntity<Map<String, Object>> sos(@RequestBody Map<String, Object> body, @AuthenticationPrincipal UserPrincipal me) {
        double lat = number(body, "lat"), lng = number(body, "lng");
        List<Long> types = jdbc.queryForList("SELECT id FROM sos_event_types WHERE code = ? OR ? IS NULL ORDER BY id LIMIT 1",
                Long.class, body.get("type"), body.get("type"));
        if (types.isEmpty()) {
            throw new BadRequestException("Unknown SOS type: " + body.get("type"));
        }
        String uuid = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO sos_events (uuid, user_id, sos_type_id, custom_message, status, latitude, longitude, battery_level) " +
                        "VALUES (?, ?, ?, ?, 'triggered', ?, ?, ?)",
                uuid, me.getUser().getId(), types.get(0), body.get("message"), lat, lng, body.get("battery"));
        // An SOS keeps sharing the location so responders can follow the person
        location(Map.of("lat", lat, "lng", lng), me);
        jdbc.update("UPDATE location_sharing_sessions SET session_type = 'sos' WHERE user_id = ? AND status = 'active'", me.getUser().getId());
        Long id = jdbc.queryForObject("SELECT id FROM sos_events WHERE uuid = ?", Long.class, uuid);
        return ResponseEntity.ok(Map.of("sosId", id, "status", "triggered"));
    }

    /** The person's own SOS calls, newest first, so the app can show "help is on the way". */
    @GetMapping("/sos")
    public ResponseEntity<List<Map<String, Object>>> mySos(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(jdbc.queryForList(
                "SELECT e.id, e.status, t.name type, e.triggered_at triggeredAt, e.response_notes responseNotes, e.resolved_at resolvedAt " +
                "FROM sos_events e JOIN sos_event_types t ON t.id = e.sos_type_id WHERE e.user_id = ? ORDER BY e.id DESC LIMIT 10",
                me.getUser().getId()));
    }

    private Long activeSession(Long userId) {
        List<Long> ids = jdbc.queryForList("SELECT id FROM location_sharing_sessions WHERE user_id = ? AND status = 'active' " +
                "ORDER BY id DESC LIMIT 1", Long.class, userId);
        return ids.isEmpty() ? null : ids.get(0);
    }

    private static double number(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) throw new BadRequestException(key + " is required");
        double d = Double.parseDouble(String.valueOf(v));
        if (key.equals("lat") ? Math.abs(d) > 90 : Math.abs(d) > 180) throw new BadRequestException(key + " is out of range");
        return d;
    }
}
