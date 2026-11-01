package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * A phone running the mobile app: where it is and how to reach it when a zone must evacuate.
 */
@Entity
@Table(name = "evacuation_devices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvacuationDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "expo_push_token", nullable = false, unique = true, length = 255)
    private String expoPushToken;

    /** Optional SMS fallback, +94 format. */
    @Column(length = 20)
    private String phone;

    @Column(name = "latitude", precision = 10, scale = 8, nullable = false)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8, nullable = false)
    private BigDecimal longitude;

    /** walk or drive */
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String mode = "walk";

    /** Zone the device was last warned about, so it isn't warned twice. */
    @Column(name = "last_notified_zone_id")
    private Long lastNotifiedZoneId;

    @Column(name = "last_notified_at")
    private LocalDateTime lastNotifiedAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
