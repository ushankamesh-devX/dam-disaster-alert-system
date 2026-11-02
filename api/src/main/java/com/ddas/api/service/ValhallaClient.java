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

    /** turnIndex: for each instruction, the index of the shape point where it starts (for turn-by-turn). */
    public record Route(double distanceKm, double timeMinutes, List<double[]> shape, List<String> instructions, List<Integer> turnIndex) {
    }

    // HTTP/1.1: Java's default HTTP/2 sends an h2c upgrade on plain http, which Valhalla's server rejects
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ObjectMapper objectMapper;

    @Value("${ddas.routing.valhalla.url:http://localhost:8002}")
    private String valhallaUrl;

    /** Valhalla's service_limits.max_exclude_polygons vertex limit (default 100, all rings combined). */
    @Value("${ddas.routing.valhalla.max-exclude-vertices:100}")
    private int maxExcludeVertices;

    private static final int MIN_RING_VERTICES = 8;

    /**
     * Thins rings so their vertices fit Valhalla's limit. Nearest rings to the start come first;
     * if there are too many to give each one MIN_RING_VERTICES, the farthest are dropped.
     */
    List<List<double[]>> fitVertexBudget(List<List<double[]>> rings, double lat, double lng) {
        List<List<double[]>> nearestFirst = rings.stream()
                .filter(r -> r.size() >= 3)
                .sorted(java.util.Comparator.comparingDouble(r -> r.stream()
                        .mapToDouble(p -> GeoPolygons.distanceKm(lat, lng, p[1], p[0])).min().orElse(0)))
                .toList();
        int keep = Math.min(nearestFirst.size(), Math.max(1, maxExcludeVertices / MIN_RING_VERTICES));
        int perRing = maxExcludeVertices / Math.max(1, keep);

        List<List<double[]>> result = new ArrayList<>();
        for (List<double[]> ring : nearestFirst.subList(0, keep)) {
            if (ring.size() <= perRing) {
                result.add(ring);
                continue;
            }
            // Keep evenly spaced points, then close the ring again
            List<double[]> thin = new ArrayList<>();
            double step = (double) (ring.size() - 1) / (perRing - 1);
            for (int i = 0; i < perRing - 1; i++) {
                thin.add(ring.get((int) Math.round(i * step)));
            }
            thin.add(thin.get(0));
            result.add(thin);
        }
        return result;
    }

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
            for (List<double[]> ring : fitVertexBudget(avoid, fromLat, fromLng)) {
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
            List<Integer> turnIndex = new ArrayList<>();
            leg.path("maneuvers").forEach(m -> {
                instructions.add(m.path("instruction").asText());
                turnIndex.add(m.path("begin_shape_index").asInt(0));
            });
            return Optional.of(new Route(
                    trip.path("summary").path("length").asDouble(),
                    trip.path("summary").path("time").asDouble() / 60.0,
                    GeoPolygons.decodePolyline6(leg.path("shape").asText()),
                    instructions, turnIndex));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Valhalla routing failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
