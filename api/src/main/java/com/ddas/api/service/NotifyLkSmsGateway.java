package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Notify.lk SMS gateway (Sri Lankan numbers).
 * Credentials come from secrets: NOTIFY_USER_ID, NOTIFY_API_KEY, NOTIFY_SENDER_ID.
 * The free "NotifyDEMO" sender only delivers to numbers registered on the Notify.lk account.
 */
@Slf4j
@Component
public class NotifyLkSmsGateway {

    private static final String SEND_URL = "https://app.notify.lk/api/v1/send";
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${notify.user-id:}")
    private String userId;

    @Value("${notify.api-key:}")
    private String apiKey;

    @Value("${notify.sender-id:NotifyDEMO}")
    private String senderId;

    public boolean isConfigured() {
        return userId != null && !userId.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    /**
     * @return a reference stored as the delivery's gateway SID
     * @throws RuntimeException when Notify.lk rejects the message, so the dispatcher retries
     */
    public String send(String to, String message) {
        if (!isConfigured()) {
            throw new IllegalStateException("Notify.lk not configured (NOTIFY_USER_ID / NOTIFY_API_KEY)");
        }
        Map<String, String> form = new LinkedHashMap<>();
        form.put("user_id", userId.trim());
        form.put("api_key", apiKey.trim());
        form.put("sender_id", senderId.trim());
        form.put("to", toNotifyLkNumber(to));
        form.put("message", message);
        String body = form.entrySet().stream()
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SEND_URL))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            // Success: {"status":"success","data":"Sent"}
            if (response.statusCode() != 200 || !response.body().contains("\"success\"")) {
                throw new RuntimeException("Notify.lk error: HTTP " + response.statusCode() + " " + response.body());
            }
            log.info("[NOTIFY.LK] SMS sent to {}", form.get("to"));
            return "NOTIFYLK-" + System.currentTimeMillis();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Notify.lk send interrupted", e);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Notify.lk send failed: " + e.getMessage(), e);
        }
    }

    /** Notify.lk wants 94XXXXXXXXX: no "+", no leading 0. */
    static String toNotifyLkNumber(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("[^0-9]", "");
        if (digits.startsWith("0")) {
            digits = "94" + digits.substring(1);
        } else if (digits.length() == 9) {
            digits = "94" + digits;
        }
        return digits;
    }
}
