package com.ddas.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends push notifications through Expo's push service, which the mobile app (Expo) receives
 * even when it is closed. No key needed; EXPO_ACCESS_TOKEN is only for "enhanced security" projects.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpoPushClient {

    public record Message(String to, String title, String body, Map<String, Object> data) {
    }

    private static final String EXPO_URL = "https://exp.host/--/api/v2/push/send";
    private static final int BATCH = 100;   // Expo's per-request limit
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper;

    @Value("${ddas.push.expo-access-token:}")
    private String accessToken;

    public void send(List<Message> messages) {
        for (int i = 0; i < messages.size(); i += BATCH) {
            List<Map<String, Object>> batch = messages.subList(i, Math.min(i + BATCH, messages.size())).stream()
                    .map(m -> Map.<String, Object>of(
                            "to", m.to(), "title", m.title(), "body", m.body(), "data", m.data(),
                            "sound", "default", "priority", "high", "channelId", "evacuation"))
                    .toList();
            try {
                HttpRequest.Builder request = HttpRequest.newBuilder()
                        .uri(URI.create(EXPO_URL))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(batch)));
                if (accessToken != null && !accessToken.isBlank()) {
                    request.header("Authorization", "Bearer " + accessToken.trim());
                }
                HttpResponse<String> response = HTTP.send(request.build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    log.warn("Expo push returned {}: {}", response.statusCode(), response.body());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception e) {
                log.warn("Expo push failed: {}", e.getMessage());
            }
        }
    }
}
