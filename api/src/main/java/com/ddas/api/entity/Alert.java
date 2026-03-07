package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 36)
    private String uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alert_type_id", nullable = false)
    private AlertType alertType;

    // --- Content ---
    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "title_si", length = 255)
    private String titleSi;

    @Column(name = "title_ta", length = 255)
    private String titleTa;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "message_si", columnDefinition = "TEXT")
    private String messageSi;

    @Column(name = "message_ta", columnDefinition = "TEXT")
    private String messageTa;

    // --- Severity & Source ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType.AlertSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlertSource source = AlertSource.manual;

    @Column(name = "source_system", length = 100)
    private String sourceSystem;

    // --- Geographic Scope ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlertScope scope = AlertScope.regional;

    @Column(name = "region_id")
    private Long regionId;

    @Column(name = "dam_id")
    private Long damId;

    @Column(name = "hazard_zone_id")
    private Long hazardZoneId;

    // --- Location for map display ---
    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "radius_km", precision = 8, scale = 2)
    private BigDecimal radiusKm;

    // --- Hazard Context ---
    @Column(name = "hazard_level_id")
    private Long hazardLevelId;

    @Column(name = "risk_score", precision = 5, scale = 2)
    private BigDecimal riskScore;

    // --- Media & Instructions ---
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "action_required", length = 255)
    private String actionRequired;

    @Column(name = "action_required_si", length = 255)
    private String actionRequiredSi;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "instructions_si", columnDefinition = "TEXT")
    private String instructionsSi;

    // --- Status ---
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlertStatus status = AlertStatus.draft;

    // --- Timing ---
    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    // --- Resolution ---
    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    // --- Stats (denormalized) ---
    @Column(name = "recipient_count")
    @Builder.Default
    private Integer recipientCount = 0;

    @Column(name = "delivered_count")
    @Builder.Default
    private Integer deliveredCount = 0;

    @Column(name = "read_count")
    @Builder.Default
    private Integer readCount = 0;

    @Column(name = "acknowledged_count")
    @Builder.Default
    private Integer acknowledgedCount = 0;

    // --- Audit ---
    @Column(name = "simulation_mode", nullable = false)
    @Builder.Default
    private boolean simulationMode = false;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum AlertStatus {
        draft, active, escalated, resolved, expired, cancelled
    }

    public enum AlertSource {
        automatic, manual, scheduled, external
    }

    public enum AlertScope {
        nationwide, regional, dam_specific, zone_specific
    }

    @PrePersist
    public void prePersist() {
        if (this.uuid == null || this.uuid.isBlank()) {
            this.uuid = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = AlertStatus.draft;
        }
    }
}
