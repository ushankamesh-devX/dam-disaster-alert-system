package com.ddas.api.service;

import com.ddas.api.entity.Dam;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.repository.DamRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlAdminService {

    private final ObjectMapper objectMapper;
    private final DamRepository damRepository;
    private final DamForecastService damForecastService;

    @Value("${ddas.ai.backend.url:http://localhost:8000}")
    private String aiBackendUrl;

    @Value("${ddas.ai.incoming-service-token:}")
    private String incomingServiceToken;

    private Object forwardRequest(String method, String subPath, Object body) {
        if (incomingServiceToken == null || incomingServiceToken.isBlank()) {
            throw new BadRequestException("AI service authentication is unconfigured");
        }

        String url = aiBackendUrl.replaceAll("/+$", "") + subPath;
        try {
            HttpClient client = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(Duration.ofSeconds(15))
                    .build();

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + incomingServiceToken.trim())
                    .header("Content-Type", "application/json");

            if ("POST".equalsIgnoreCase(method)) {
                String bodyJson = body != null ? objectMapper.writeValueAsString(body) : "{}";
                reqBuilder.POST(HttpRequest.BodyPublishers.ofString(bodyJson));
            } else if ("PUT".equalsIgnoreCase(method)) {
                String bodyJson = body != null ? objectMapper.writeValueAsString(body) : "{}";
                reqBuilder.PUT(HttpRequest.BodyPublishers.ofString(bodyJson));
            } else {
                reqBuilder.GET();
            }

            HttpResponse<String> response = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 404 && "/internal/ml/active-release".equals(subPath)) {
                return null;
            }
            if (response.statusCode() >= 400) {
                log.warn("FastAPI ML admin call failed: {} {} -> HTTP {}", method, subPath, response.statusCode());
                throw new BadRequestException("AI backend error: " + response.body());
            }

            return objectMapper.readValue(response.body(), Object.class);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Exception communicating with AI backend at {}: {}", url, e.getMessage(), e);
            throw new BadRequestException("Failed communicating with AI backend: " + e.getMessage());
        }
    }

    public Object createJob(Map<String, Object> body) {
        return forwardRequest("POST", "/internal/ml/jobs", body);
    }

    public Object getJob(String jobId) {
        return forwardRequest("GET", "/internal/ml/jobs/" + jobId, null);
    }

    public Object listJobs() {
        return forwardRequest("GET", "/internal/ml/jobs", null);
    }

    public Object getReleases() {
        return forwardRequest("GET", "/internal/ml/releases", null);
    }

    public Object getActiveRelease() {
        return forwardRequest("GET", "/internal/ml/active-release", null);
    }

    public Object updateActiveRelease(Map<String, Object> body) {
        return forwardRequest("PUT", "/internal/ml/active-release", body);
    }

    public Object getMonitoring() {
        return forwardRequest("GET", "/internal/ml/monitoring", null);
    }

    public Map<String, Object> getForecastEvaluation(Long damId, Integer horizon) {
        return damForecastService.evaluateRealVsPredicted(damId, horizon);
    }

    public Map<String, Object> runForecastCycle() {
        log.info("Admin initiated forecast cycle across all dams");
        int successful = 0;
        List<Dam> dams = damRepository.findAll();
        for (Dam dam : dams) {
            try {
                var saved = damForecastService.requestAndStoreForecast(dam.getId());
                if (!saved.isEmpty()) {
                    successful++;
                }
            } catch (Exception e) {
                log.error("Failed manual forecast cycle for dam {}: {}", dam.getId(), e.getMessage());
            }
        }
        return Map.of(
            "status", "completed",
            "damsProcessed", dams.size(),
            "damsUpdated", successful,
            "message", "Forecast cycle completed: " + successful + "/" + dams.size() + " dams updated."
        );
    }
}

