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
@Table(name = "report_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportType {

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

    @Column(length = 100)
    private String icon;

    @Column(length = 20)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('structural','water','environmental','equipment','safety','other') DEFAULT 'other'")
    @Builder.Default
    private Category category = Category.other;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_priority", columnDefinition = "ENUM('low','medium','high','critical') DEFAULT 'medium'")
    @Builder.Default
    private Priority defaultPriority = Priority.medium;

    @Column(name = "requires_photo")
    @Builder.Default
    private Boolean requiresPhoto = false;

    @Column(name = "requires_location")
    @Builder.Default
    private Boolean requiresLocation = true;

    @Column(name = "auto_alert_threshold")
    private Integer autoAlertThreshold;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Category {
        structural, water, environmental, equipment, safety, other
    }

    public enum Priority {
        low, medium, high, critical
    }
}

