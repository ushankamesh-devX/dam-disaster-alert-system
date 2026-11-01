package com.ddas.api.controller;

import com.ddas.api.entity.User;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.repository.UserRepository;
import com.ddas.api.service.HazardAssessmentService;
import com.ddas.api.service.NotifyLkSmsGateway;
import com.ddas.api.service.SmsControlService;
import com.ddas.api.service.SmsDispatcherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin control for real SMS: a switch (off after every API start), a per-alert send and
 * a custom message to chosen users. Alerts never send SMS by themselves.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/sms")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class SmsControlController {

    private static final int MAX_MESSAGE_LENGTH = 480;   // three SMS parts

    private final SmsControlService smsControlService;
    private final HazardAssessmentService hazardAssessmentService;
    private final SmsDispatcherService smsDispatcherService;
    private final NotifyLkSmsGateway notifyLkGateway;
    private final UserRepository userRepository;

    @Value("${sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${sms.provider:mock}")
    private String smsProvider;

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> settings() {
        return ResponseEntity.ok(Map.of(
                "sendingAllowed", smsControlService.isSendingAllowed(),
                "serverEnabled", smsEnabled,
                "provider", smsProvider,
                "providerConfigured", notifyLkGateway.isConfigured(),
                "recipients", recipientUsers().size()));
    }

    @PutMapping("/settings")
    public ResponseEntity<Map<String, Object>> update(@RequestBody Map<String, Boolean> body) {
        smsControlService.setSendingAllowed(Boolean.TRUE.equals(body.get("sendingAllowed")));
        return settings();
    }

    /** Registered users who can get an SMS (phone number set, notifications not turned off). */
    @GetMapping("/recipients")
    public ResponseEntity<List<Map<String, Object>>> recipients() {
        return ResponseEntity.ok(recipientUsers().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("name", u.getFullName() != null ? u.getFullName() : u.getEmail());
            m.put("phone", maskPhone(u.getPhoneNumber()));
            return m;
        }).toList());
    }

    /** Send a custom message now to the chosen users. Body: { userIds: [..], message: ".." } */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendCustom(@RequestBody Map<String, Object> body) {
        String message = body.get("message") == null ? "" : body.get("message").toString().trim();
        if (message.isEmpty()) throw new BadRequestException("Write a message first.");
        if (message.length() > MAX_MESSAGE_LENGTH) {
            throw new BadRequestException("Message is too long (max " + MAX_MESSAGE_LENGTH + " characters).");
        }
        List<Long> ids = new ArrayList<>();
        if (body.get("userIds") instanceof List<?> list) {
            list.forEach(v -> ids.add(Long.valueOf(v.toString())));
        }
        List<User> users = recipientUsers().stream().filter(u -> ids.contains(u.getId())).toList();
        if (users.isEmpty()) throw new BadRequestException("Choose at least one user with a phone number.");

        List<String> sent = new ArrayList<>();
        List<String> failed = new ArrayList<>();
        for (User u : users) {
            String name = u.getFullName() != null ? u.getFullName() : u.getEmail();
            try {
                smsDispatcherService.sendNow(u.getPhoneNumber(), message);
                sent.add(name);
            } catch (BadRequestException e) {
                throw e;
            } catch (Exception e) {
                log.warn("[SMS] Custom SMS to user {} failed: {}", u.getId(), e.getMessage());
                failed.add(name);
            }
        }
        log.info("[SMS] Custom SMS by admin: sent={}, failed={}", sent.size(), failed.size());
        return ResponseEntity.ok(Map.of("sent", sent, "failed", failed));
    }

    /** Queue one alert's SMS now for every registered user with a phone number. */
    @PostMapping("/alerts/{alertId}/send")
    public ResponseEntity<Map<String, Integer>> sendForAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(Map.of("queued", hazardAssessmentService.queueSmsForAlert(alertId)));
    }

    private List<User> recipientUsers() {
        return userRepository.findAllActiveUsers().stream()
                .filter(u -> u.getPhoneNumber() != null && !u.getPhoneNumber().isBlank())
                .filter(u -> !Boolean.FALSE.equals(u.getNotificationEnabled()))
                .toList();
    }

    private static String maskPhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.length() <= 4 ? digits : "••••••" + digits.substring(digits.length() - 4);
    }
}
