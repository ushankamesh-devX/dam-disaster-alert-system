package com.ddas.api.controller;

import com.ddas.api.dto.response.AlertResponseDTO;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.CommandCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Evacuation command center for operators: live picture, SOS handling and zone broadcast. */
@RestController
@RequestMapping("/api/v1/command-center")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'DAM_OPERATOR')")
public class CommandCenterController {

    private final CommandCenterService service;

    @GetMapping("/snapshot")
    public ResponseEntity<Map<String, Object>> snapshot() {
        return ResponseEntity.ok(service.snapshot());
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
