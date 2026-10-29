package com.ddas.api.service;

import com.ddas.api.exception.BadRequestException;
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
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiRagService {

    private final ObjectMapper objectMapper;

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
            } else if ("DELETE".equalsIgnoreCase(method)) {
                reqBuilder.DELETE();
            } else {
                reqBuilder.GET();
            }

            HttpResponse<String> response = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("FastAPI RAG call failed: {} {} -> HTTP {}", method, subPath, response.statusCode());
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

    public Object chat(Map<String, Object> body) {
        return forwardRequest("POST", "/internal/rag/chat", body);
    }

    public Object indexDocument(Map<String, Object> body) {
        return forwardRequest("POST", "/internal/rag/documents", body);
    }

    public Object listDocuments(String category, Long damId) {
        StringBuilder query = new StringBuilder("/internal/rag/documents?");
        if (category != null && !category.isBlank()) {
            query.append("category=").append(category).append("&");
        }
        if (damId != null) {
            query.append("dam_id=").append(damId).append("&");
        }
        String path = query.toString().replaceAll("[&?]$", "");
        return forwardRequest("GET", path, null);
    }

    public Object getDocument(String docId) {
        return forwardRequest("GET", "/internal/rag/documents/" + docId, null);
    }

    public Object deleteDocument(String docId) {
        return forwardRequest("DELETE", "/internal/rag/documents/" + docId, null);
    }
}

