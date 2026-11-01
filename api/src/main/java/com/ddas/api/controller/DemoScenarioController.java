package com.ddas.api.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Start / stop / reset the demo evacuation scenario from the web page.
 * Passes the request to the ddas-scenario runner pod (k8s/scenario.yaml), which runs the Python script.
 */
@RestController
@RequestMapping("/api/v1/demo/scenario")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class DemoScenarioController {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Value("${ddas.scenario.runner-url:http://ddas-scenario:8090}")
    private String runnerUrl;

    @GetMapping("/status")
    public ResponseEntity<String> status() {
        return forward("GET", "/status", null);
    }

    @PostMapping("/start")
    public ResponseEntity<String> start(@RequestBody(required = false) String body) {
        return forward("POST", "/start", body);
    }

    @PostMapping("/stop")
    public ResponseEntity<String> stop() {
        return forward("POST", "/stop", null);
    }

    @PostMapping("/reset")
    public ResponseEntity<String> reset() {
        return forward("POST", "/reset", null);
    }

    private ResponseEntity<String> forward(String method, String path, String body) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(runnerUrl + path))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(response.statusCode()).contentType(MediaType.APPLICATION_JSON).body(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return unavailable();
        } catch (Exception e) {
            return unavailable();
        }
    }

    private static ResponseEntity<String> unavailable() {
        return ResponseEntity.status(503).contentType(MediaType.APPLICATION_JSON)
                .body("{\"message\":\"Scenario runner is not running. Apply k8s/scenario.yaml on the server.\",\"available\":false}");
    }
}
