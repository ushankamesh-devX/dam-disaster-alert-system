package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

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

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AlertCategory category = AlertCategory.general;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AlertSeverity severity = AlertSeverity.warning;

    @Column(length = 100)
    private String icon;

    @Column(length = 20)
    private String color;

    @Column(length = 100)
    private String sound;

    @Column(name = "requires_acknowledgment")
    @Builder.Default
    private boolean acknowledgmentRequired = false;

    @Column(name = "auto_expire_hours")
    private Integer autoExpireHours;

    @Column(name = "title_template", length = 255)
    private String titleTemplate;

    @Column(name = "title_template_si", length = 255)
    private String titleTemplateSi;

    @Column(name = "body_template", columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "body_template_si", columnDefinition = "TEXT")
    private String bodyTemplateSi;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum AlertSeverity {
        info, warning, critical, emergency
    }

    public enum AlertCategory {
        dam, weather, flood, evacuation, system, general
    }
}
