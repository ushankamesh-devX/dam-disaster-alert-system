package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvacuationRouteResponse {

    /** True when the user stands inside a zone that must evacuate now. */
    private boolean inDangerZone;
    private Zone zone;
    /** Minutes until flood water is expected at the user's zone; null when not in a zone. */
    private Integer floodEtaMin;

    private Shelter shelter;
    /** GeoJSON LineString ([lng, lat] points); null when routingAvailable is false. */
    private LineString route;
    private Double distanceKm;
    private Integer etaMin;
    /** False when the route takes longer than the flood ETA. */
    private boolean safe;
    /** False when the routing engine was unreachable; shelter is then the nearest by straight line. */
    private boolean routingAvailable;
    private List<String> instructions;
    private List<Alternative> alternatives;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Zone {
        private Long id;
        private String name;
        private String nameSi;
        private Integer hazardLevel;
        private String damName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Shelter {
        private Long id;
        private String name;
        private String nameSi;
        private double lat;
        private double lng;
        /** Null when capacity is unknown. */
        private Integer freeCapacity;
        private String contactPhone;
        /** Metres above the expected flood water; null if not rated. */
        private Integer aboveFloodM;
        /** "high_ground" (assembly point) or "shelter". */
        private String kind;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineString {
        @Builder.Default
        private String type = "LineString";
        private List<double[]> coordinates;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Alternative {
        private Shelter shelter;
        private Double distanceKm;
        private Integer etaMin;
    }
}
