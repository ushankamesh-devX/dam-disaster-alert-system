package com.ddas.api.controller;

import com.ddas.api.repository.UserRepository;
import com.ddas.api.service.HazardAssessmentService;
import com.ddas.api.service.NotifyLkSmsGateway;
import com.ddas.api.service.SmsControlService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Admin control for real SMS: a switch (off after every API start) and a per-alert send.
 */
@RestController
@RequestMapping("/api/v1/sms")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class SmsControlController {

    private final SmsControlService smsControlService;
    private final HazardAssessmentService hazardAssessmentService;
    private final NotifyLkSmsGateway notifyLkGateway;
    private final UserRepository userRepository;

    @Value("${sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${sms.provider:mock}")
    private String smsProvider;

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> settings() {
        long recipients = userRepository.findAllActiveUsers().stream()
                .filter(u -> u.getPhoneNumber() != null && !u.getPhoneNumber().isBlank())
                .filter(u -> !Boolean.FALSE.equals(u.getNotificationEnabled()))
                .count();
        return ResponseEntity.ok(Map.of(
                "sendingAllowed", smsControlService.isSendingAllowed(),
                "serverEnabled", smsEnabled,
                "provider", smsProvider,
                "providerConfigured", notifyLkGateway.isConfigured(),
                "recipients", recipients));
    }

    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, Boolean> body) {
        smsControlService.setSendingAllowed(Boolean.TRUE.equals(body.get("sendingAllowed")));
        return settings();
    }

    /** Queue one alert's SMS now for every registered user with a phone number. */
    @PostMapping("/alerts/{alertId}/send")
    public ResponseEntity<Map<String, Integer>> sendForAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(Map.of("queued", hazardAssessmentService.queueSmsForAlert(alertId)));
    }
}
