package com.ddas.api.controller;

import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.CommandCenterService;
import com.ddas.api.service.EvacuationAnalyticsService;
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
    @PostMapping("/broadcast")
    public ResponseEntity<AlertResponseDTO> broadcast(@RequestBody Map<String, Object> body) {
        Long damId = body.get("damId") == null ? null : Long.valueOf(String.valueOf(body.get("damId")));
        return ResponseEntity.ok(service.broadcast(damId, String.valueOf(body.get("title")), String.valueOf(body.get("message"))));
    }
}
