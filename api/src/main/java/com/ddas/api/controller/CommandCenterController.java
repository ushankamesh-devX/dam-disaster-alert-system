package com.ddas.api.controller;

import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.CommandCenterService;
import com.ddas.api.service.EvacuationAnalyticsService;
import com.ddas.api.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Evacuation command center for operators: live picture, SOS handling and zone broadcast. */
@RestController
@RequestMapping("/api/v1/command-center")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DAM_OPERATOR')")
public class CommandCenterController {

    private final CommandCenterService service;
    private final EvacuationAnalyticsService analytics;
    private final TeamService teams;

    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> snapshot() {
        return ResponseEntity.ok(service.snapshot());
    }

    /** Each (simulated) person: position, trail, state, likely shelter and ETA. */
    @GetMapping("/people")
    public ResponseEntity<List<EvacuationAnalyticsService.Person>> people() {
        return ResponseEntity.ok(analytics.people());
    }

    /** Zone clearance, shelter forecast, bottlenecks, stragglers, progress and the incident summary. */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> analytics() {
        return ResponseEntity.ok(analytics.analytics());
    }

    /** Replay frames every 15 s over the last {@code minutes} (default 60). */
    @GetMapping("/replay")
    public ResponseEntity<List<Map<String, Object>>> replay(@RequestParam(defaultValue = "60") int minutes) {
        return ResponseEntity.ok(analytics.replay(minutes));
    }

    @PostMapping("/sos/{id}/acknowledge")
    public ResponseEntity<Void> acknowledge(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal me) {
        service.acknowledge(id, me.getUser().getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sos/{id}/assign")
    public ResponseEntity<Void> assign(@PathVariable Long id, @RequestBody Map<String, Long> body) {
        service.assign(id, body.get("providerId"));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sos/{id}/resolve")
    public ResponseEntity<Void> resolve(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body,
                                        @AuthenticationPrincipal UserPrincipal me) {
        service.resolve(id, me.getUser().getId(), body == null ? null : body.get("notes"));
        return ResponseEntity.noContent().build();
    }

    /** Body: { damId, title, message } — raises an Evacuation Order for that dam's zones. */
    /** Tools: clear the real phones (mobile app) from the map. */
    @PostMapping("/phones/reset")
    public ResponseEntity<Map<String, Integer>> resetPhones(@AuthenticationPrincipal UserPrincipal me) {
        return ResponseEntity.ok(service.resetPhones(me.getUser().getId()));
    }

    // ── Response teams ─────────────────────────────────────────────────────────

    /** Every team: status, live position, current mission. */
    @GetMapping("/teams")
    public ResponseEntity<List<Map<String, Object>>> teams() {
        return ResponseEntity.ok(teams.teams());
    }

    /** Teams ranked for this SOS (right kind, free, road time); the best is marked recommended. */
    @GetMapping("/sos/{id}/teams")
    public ResponseEntity<List<Map<String, Object>>> recommend(@PathVariable Long id) {
        return ResponseEntity.ok(teams.recommend(id));
    }

    @GetMapping("/sos/{id}/messages")
    public ResponseEntity<List<Map<String, Object>>> messages(@PathVariable Long id) {
        return ResponseEntity.ok(teams.messages(id));
    }

    /** Body: { text } — to the teams on this SOS. */
    @PostMapping("/sos/{id}/messages")
    public ResponseEntity<Void> send(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        teams.message(id, "control", null, "Control room", String.valueOf(body.getOrDefault("text", "")), false);
        return ResponseEntity.noContent().build();
    }

    /** Body: { text, type? } — to every team, or one kind (police / hospital / fire_brigade). */
    @PostMapping("/teams/broadcast")
    public ResponseEntity<Map<String, Integer>> teamBroadcast(@RequestBody Map<String, Object> body) {
        Object type = body.get("type");
        return ResponseEntity.ok(Map.of("sent", teams.broadcast(String.valueOf(body.getOrDefault("text", "")),
                type == null ? null : String.valueOf(type), "Control room")));
    }


    /** Body: { damId, title, message } — raises an Evacuation Order for that dam's zones. */
    @PostMapping("/broadcast")
    public ResponseEntity<AlertResponseDTO> broadcast(@RequestBody Map<String, Object> body) {
        Long damId = body.get("damId") == null ? null : Long.valueOf(String.valueOf(body.get("damId")));
        return ResponseEntity.ok(service.broadcast(damId, String.valueOf(body.get("title")), String.valueOf(body.get("message"))));
    }
}
