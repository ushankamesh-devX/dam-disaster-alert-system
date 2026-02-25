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
@Table(name = "hazard_levels")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HazardLevel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "level_number", unique = true, nullable = false)
    private Integer levelNumber;

    @Column(unique = true, nullable = false, length = 20)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_si", length = 100)
    private String nameSi;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_si", columnDefinition = "TEXT")
    private String descriptionSi;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(name = "fill_opacity", precision = 3, scale = 2)
    private BigDecimal fillOpacity = new BigDecimal("0.35");

    @Column(name = "stroke_color", length = 20)
    private String strokeColor;

    @Column(name = "stroke_width")
    private Integer strokeWidth = 2;

    @Column(length = 100)
    private String icon;

    @Column(name = "risk_score_min", precision = 5, scale = 2)
    private BigDecimal riskScoreMin;

    @Column(name = "risk_score_max", precision = 5, scale = 2)
    private BigDecimal riskScoreMax;

    @Column(name = "evacuation_required")
    private Boolean evacuationRequired = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_priority")
    private NotificationPriority notificationPriority = NotificationPriority.medium;

    @Column(name = "estimated_flood_time_minutes")
    private Integer estimatedFloodTimeMinutes;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum NotificationPriority {
        low, medium, high, critical
    }
}
