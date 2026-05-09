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

    @Column(unique = true, nullable = false, length = 50)
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
    private ReportCategory category = ReportCategory.other;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_priority", columnDefinition = "ENUM('low','medium','high','critical') DEFAULT 'medium'")
    private Priority defaultPriority = Priority.medium;

    @Column(name = "requires_photo")
    private Boolean requiresPhoto = false;

    @Column(name = "requires_location")
    private Boolean requiresLocation = true;

    @Column(name = "auto_alert_threshold")
    private Integer autoAlertThreshold;

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

    public enum ReportCategory {
        structural, water, environmental, equipment, safety, other
    }

    public enum Priority {
        low, medium, high, critical
    }
}
