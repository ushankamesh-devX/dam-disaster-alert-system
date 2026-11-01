package com.ddas.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

/**
 * Small geometry helpers for GeoJSON polygons stored in the database.
 * A ring is a list of [lng, lat] points, matching GeoJSON and Valhalla's exclude_polygons.
 */
public final class GeoPolygons {

    private static final double EARTH_RADIUS_KM = 6371.0;

    private GeoPolygons() {
    }

    /** Outer rings of a GeoJSON Polygon, MultiPolygon or Feature; holes are ignored. */
    public static List<List<double[]>> outerRings(ObjectMapper mapper, String geojson) {
        List<List<double[]>> rings = new ArrayList<>();
        if (geojson == null || geojson.isBlank()) {
            return rings;
        }
        try {
            JsonNode node = mapper.readTree(geojson);
            if (node.has("geometry")) {
                node = node.get("geometry");
            }
            String type = node.path("type").asText();
            JsonNode coords = node.path("coordinates");
            if ("Polygon".equals(type)) {
                rings.add(ring(coords.get(0)));
            } else if ("MultiPolygon".equals(type)) {
                for (JsonNode polygon : coords) {
                    rings.add(ring(polygon.get(0)));
                }
            }
        } catch (Exception e) {
            // Malformed polygon: treat as empty so one bad row can't break routing
        }
        return rings;
    }

    private static List<double[]> ring(JsonNode points) {
        List<double[]> ring = new ArrayList<>();
        if (points != null) {
            for (JsonNode p : points) {
                ring.add(new double[]{p.get(0).asDouble(), p.get(1).asDouble()});
            }
        }
        return ring;
    }

    /** Ray casting point-in-polygon test. */
    public static boolean contains(List<double[]> ring, double lat, double lng) {
        boolean inside = false;
        for (int i = 0, j = ring.size() - 1; i < ring.size(); j = i++) {
            double xi = ring.get(i)[0], yi = ring.get(i)[1];
            double xj = ring.get(j)[0], yj = ring.get(j)[1];
            if ((yi > lat) != (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    public static boolean containsAny(List<List<double[]>> rings, double lat, double lng) {
        return rings.stream().anyMatch(r -> contains(r, lat, lng));
    }

    public static double distanceKm(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Decodes a Valhalla shape (encoded polyline, precision 6) into [lng, lat] points. */
    public static List<double[]> decodePolyline6(String encoded) {
        List<double[]> points = new ArrayList<>();
        int index = 0, lat = 0, lng = 0;
        while (index < encoded.length()) {
            int[] result = new int[2];
            for (int k = 0; k < 2; k++) {
                int shift = 0, value = 0, b;
                do {
                    b = encoded.charAt(index++) - 63;
                    value |= (b & 0x1f) << shift;
                    shift += 5;
                } while (b >= 0x20);
                result[k] = (value & 1) != 0 ? ~(value >> 1) : (value >> 1);
            }
            lat += result[0];
            lng += result[1];
            points.add(new double[]{lng / 1e6, lat / 1e6});
        }
        return points;
    }
}
