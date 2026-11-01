package com.ddas.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Calls the self-hosted Valhalla routing engine (k8s service "valhalla").
 * Only the API talks to Valhalla; web and mobile clients never reach it directly.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ValhallaClient {

    public record Route(double distanceKm, double timeMinutes, List<double[]> shape, List<String> instructions) {
    }

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper;

    @Value("${ddas.routing.valhalla.url:http://localhost:8002}")
    private String valhallaUrl;

    /**
     * @param costing "pedestrian" or "auto"
     * @param avoid   rings of [lng, lat] points the route must not cross
     * @return empty if Valhalla is down or no path avoids the areas
     */
    public Optional<Route> route(double fromLat, double fromLng, double toLat, double toLng,
                                 String costing, List<List<double[]>> avoid) {
        ObjectNode body = objectMapper.createObjectNode();
        ArrayNode locations = body.putArray("locations");
        locations.addObject().put("lat", fromLat).put("lon", fromLng);
        locations.addObject().put("lat", toLat).put("lon", toLng);
        body.put("costing", costing);
        body.putObject("directions_options").put("units", "kilometers");
        if (!avoid.isEmpty()) {
            ArrayNode polygons = body.putArray("exclude_polygons");
            for (List<double[]> ring : avoid) {
                ArrayNode r = polygons.addArray();
                ring.forEach(p -> r.addArray().add(p[0]).add(p[1]));
            }
        }

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(valhallaUrl.replaceAll("/+$", "") + "/route"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();
            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                String err = response.body();
                log.warn("Valhalla returned {}: {}", response.statusCode(),
                        err.length() > 300 ? err.substring(0, 300) : err);
                return Optional.empty();
            }

            JsonNode trip = objectMapper.readTree(response.body()).path("trip");
            JsonNode leg = trip.path("legs").path(0);
            List<String> instructions = new ArrayList<>();
            leg.path("maneuvers").forEach(m -> instructions.add(m.path("instruction").asText()));
            return Optional.of(new Route(
                    trip.path("summary").path("length").asDouble(),
                    trip.path("summary").path("time").asDouble() / 60.0,
                    GeoPolygons.decodePolyline6(leg.path("shape").asText()),
                    instructions));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Valhalla routing failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
