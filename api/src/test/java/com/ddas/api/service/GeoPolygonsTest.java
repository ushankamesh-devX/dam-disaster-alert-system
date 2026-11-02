package com.ddas.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GeoPolygonsTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private static final String SQUARE =
            "{\"type\":\"Polygon\",\"coordinates\":[[[80.0,7.0],[81.0,7.0],[81.0,8.0],[80.0,8.0],[80.0,7.0]]]}";

    @Test
    void pointInsideAndOutsidePolygon() {
        List<List<double[]>> rings = GeoPolygons.outerRings(mapper, SQUARE);
        assertEquals(1, rings.size());
        assertTrue(GeoPolygons.containsAny(rings, 7.5, 80.5));
        assertFalse(GeoPolygons.containsAny(rings, 8.5, 80.5));
    }

    @Test
    void readsFeatureAndMultiPolygon() {
        String feature = "{\"type\":\"Feature\",\"geometry\":" + SQUARE + "}";
        assertEquals(1, GeoPolygons.outerRings(mapper, feature).size());
        String multi = "{\"type\":\"MultiPolygon\",\"coordinates\":[[[[0,0],[1,0],[1,1],[0,0]]],[[[2,2],[3,2],[3,3],[2,2]]]]}";
        assertEquals(2, GeoPolygons.outerRings(mapper, multi).size());
    }

    @Test
    void malformedGeojsonIsEmpty() {
        assertTrue(GeoPolygons.outerRings(mapper, "not json").isEmpty());
        assertTrue(GeoPolygons.outerRings(mapper, null).isEmpty());
    }

    @Test
    void decodesPolyline6AsLngLat() {
        // Google's reference polyline; at precision 6 the values are 10x smaller
        List<double[]> points = GeoPolygons.decodePolyline6("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
        assertEquals(3, points.size());
        assertEquals(-12.02, points.get(0)[0], 1e-6);
        assertEquals(3.85, points.get(0)[1], 1e-6);
        assertEquals(4.3252, points.get(2)[1], 1e-6);
    }

    @Test
    void distanceBetweenKandyAndColombo() {
        double km = GeoPolygons.distanceKm(7.2906, 80.6337, 6.9271, 79.8612);
        assertEquals(94, km, 3);
    }
}
