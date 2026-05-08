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

@Entity
@Table(name = "alert_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique code — e.g. 'dam_water_critical', 'evacuation_order' */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_si", length = 100)
    private String nameSi;

    @Column(name = "name_ta", length = 100)
    private String nameTa;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Category: dam | weather | flood | evacuation | system | general
     * Matches the ENUM in the DB schema.
     */
    @Column(nullable = false, length = 50)
    private String category;

    /**
     * Default severity for this alert type.
     * Individual alerts can override this in the alerts.severity column.
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private AlertSeverity severity = AlertSeverity.warning;

    // ── Display ───────────────────────────────────────────────────────────────

    /** MaterialCommunityIcons icon name for the mobile app */
    @Column(length = 100)
    private String icon;

    /** Hex colour string — e.g. '#EF4444' */
    @Column(length = 20)
    private String color;

    /** Notification sound identifier */
    @Column(length = 100)
    private String sound;

    // ── Behaviour defaults ────────────────────────────────────────────────────

    @Column(name = "requires_acknowledgment", nullable = false)
    @Builder.Default
    private boolean requiresAcknowledgment = false;

    /** Auto-expire the alert after X hours (null = never expires by type rule) */
    @Column(name = "auto_expire_hours")
    private Integer autoExpireHours;

    /** JSON array — e.g. '["push","sms"]' */
    @Column(name = "default_channels", columnDefinition = "JSON")
    private String defaultChannels;

    // ── Message templates ─────────────────────────────────────────────────────

    @Column(name = "title_template", length = 255)
    private String titleTemplate;

    @Column(name = "title_template_si", length = 255)
    private String titleTemplateSi;

    @Column(name = "body_template", columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "body_template_si", columnDefinition = "TEXT")
    private String bodyTemplateSi;

    // ── Meta ──────────────────────────────────────────────────────────────────

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private int displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Severity enum ─────────────────────────────────────────────────────────

    public enum AlertSeverity {
        info, warning, critical, emergency
    }
}
