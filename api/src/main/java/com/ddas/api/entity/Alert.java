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

    // ── Content ───────────────────────────────────────────────────────────────

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

    // ── Classification ────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertType.AlertSeverity severity;

    /** automatic | manual | scheduled | external */
    @Column(length = 20)
    @Builder.Default
    private String source = "manual";

    @Column(name = "source_system", length = 100)
    private String sourceSystem;

    // ── Geographic scope ──────────────────────────────────────────────────────

    /** nationwide | regional | dam_specific | zone_specific */
    @Column(length = 20)
    @Builder.Default
    private String scope = "regional";

    @Column(name = "region_id")
    private Long regionId;

    @Column(name = "dam_id")
    private Long damId;

    @Column(name = "hazard_zone_id")
    private Long hazardZoneId;

    /** JSON array of zone IDs */
    @Column(name = "affected_zones", columnDefinition = "JSON")
    private String affectedZones;

    /** JSON array of region IDs */
    @Column(name = "affected_regions", columnDefinition = "JSON")
    private String affectedRegions;

    // ── Location (for map display) ────────────────────────────────────────────

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "radius_km", precision = 8, scale = 2)
    private BigDecimal radiusKm;

    // ── Hazard context ────────────────────────────────────────────────────────

    @Column(name = "hazard_level_id")
    private Long hazardLevelId;

    @Column(name = "risk_score", precision = 5, scale = 2)
    private BigDecimal riskScore;

    // ── Instructions ──────────────────────────────────────────────────────────

    @Column(name = "action_required", length = 255)
    private String actionRequired;

    @Column(name = "action_required_si", length = 255)
    private String actionRequiredSi;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "instructions_si", columnDefinition = "TEXT")
    private String instructionsSi;

    /** JSON array of safe_location IDs */
    @Column(name = "safe_location_ids", columnDefinition = "JSON")
    private String safeLocationIds;

    // ── Media ─────────────────────────────────────────────────────────────────

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // ── Status ────────────────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AlertStatus status = AlertStatus.draft;

    // ── Timing ────────────────────────────────────────────────────────────────

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "effective_from")
    private LocalDateTime effectiveFrom;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    // ── Resolution ────────────────────────────────────────────────────────────

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    // ── Denormalised stats (updated by scheduler / acknowledgment service) ────

    @Column(name = "recipient_count")
    @Builder.Default
    private int recipientCount = 0;

    @Column(name = "delivered_count")
    @Builder.Default
    private int deliveredCount = 0;

    @Column(name = "read_count")
    @Builder.Default
    private int readCount = 0;

    @Column(name = "acknowledged_count")
    @Builder.Default
    private int acknowledgedCount = 0;

    // ── Simulation flag ───────────────────────────────────────────────────────

    /**
     * When true the mobile app must suppress real emergency UI and show a
     * drill indicator instead.
     */
    @Column(name = "simulation_mode", nullable = false)
    @Builder.Default
    private boolean simulationMode = false;

    // ── Audit ─────────────────────────────────────────────────────────────────

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Status enum ───────────────────────────────────────────────────────────

    public enum AlertStatus {
        draft, active, escalated, resolved, expired, cancelled
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @PrePersist
    public void prePersist() {
        if (this.uuid == null || this.uuid.isBlank()) {
            this.uuid = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = AlertStatus.draft;
        }
        // Auto-set issuedAt when alert goes active
        if (this.status == AlertStatus.active && this.issuedAt == null) {
            this.issuedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        // Auto-set issuedAt on first activation
        if (this.status == AlertStatus.active && this.issuedAt == null) {
            this.issuedAt = LocalDateTime.now();
        }
        // Auto-set resolvedAt when resolved
        if (this.status == AlertStatus.resolved && this.resolvedAt == null) {
            this.resolvedAt = LocalDateTime.now();
        }
    }
}
