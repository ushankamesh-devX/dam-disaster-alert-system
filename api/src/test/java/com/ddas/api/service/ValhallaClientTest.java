package com.ddas.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ValhallaClientTest {

    private static List<double[]> circle(double lat, double lng, int points) {
        List<double[]> ring = new ArrayList<>();
        for (int i = 0; i < points; i++) {
            double a = 2 * Math.PI * i / points;
            ring.add(new double[]{lng + 0.01 * Math.cos(a), lat + 0.01 * Math.sin(a)});
        }
        ring.add(ring.get(0));
        return ring;
    }

    private static ValhallaClient client(int limit) {
        ValhallaClient c = new ValhallaClient(new ObjectMapper());
        ReflectionTestUtils.setField(c, "maxExcludeVertices", limit);
        return c;
    }

    @Test
    void thinsLargeRingsToFitTheLimit() {
        List<List<double[]>> rings = List.of(circle(7.0, 80.6, 300), circle(7.1, 80.7, 250));
        List<List<double[]>> fitted = client(100).fitVertexBudget(rings, 7.05, 80.65);
        int total = fitted.stream().mapToInt(List::size).sum();
        assertEquals(2, fitted.size());
        assertTrue(total <= 100, "total vertices " + total);
        fitted.forEach(r -> assertArrayEquals(r.get(0), r.get(r.size() - 1)));   // still closed
    }

    @Test
    void dropsFarthestRingsWhenTooMany() {
        List<List<double[]>> rings = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            rings.add(circle(7.0 + i * 0.1, 80.6, 10));
        }
        List<List<double[]>> fitted = client(100).fitVertexBudget(rings, 7.0, 80.6);
        assertEquals(12, fitted.size());   // 100 / 8 vertices minimum each
        assertTrue(fitted.stream().mapToInt(List::size).sum() <= 100);
        assertEquals(7.0, fitted.get(0).get(0)[1], 0.02);   // nearest ring kept first
    }

    @Test
    void smallRingsAreUnchanged() {
        List<double[]> ring = circle(7.0, 80.6, 5);
        assertSame(ring, client(100).fitVertexBudget(List.of(ring), 7.0, 80.6).get(0));
    }
}
