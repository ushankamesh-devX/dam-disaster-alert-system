package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/** Live evacuation picture for the dashboard map; also pushed over the SSE stream. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvacuationStatusResponse {

    private List<Zone> dangerZones;
    /** Lower levels (L4/L5) of the same dams: no evacuation needed, shown as watch areas. */
    private List<Zone> watchZones;
    /** Zones of dams that are safe right now: drawn faintly as a planning view. */
    private List<Zone> planningZones;
    private List<Shelter> shelters;
    private List<Blocked> blockedRoads;
    /** Phones that reported a location in the last 6 hours. */
    private int activeDevices;
    private int devicesInDanger;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Zone {
        private Long id;
        private String name;
        private String damName;
        private Integer hazardLevel;
        private String color;
        private String boundaryGeojson;
        private Integer floodEtaMin;
        private int devicesInside;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Shelter {
        private Long id;
        private String name;
        private double lat;
        private double lng;
        private Integer capacity;
        private Integer occupancy;
        private String status;
        /** Inside a danger zone, so routes don't send people there. */
        private boolean inDangerZone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Blocked {
        private Long id;
        private String name;
        private String reason;
        private String boundaryGeojson;
        private LocalDateTime expiresAt;
    }
}
