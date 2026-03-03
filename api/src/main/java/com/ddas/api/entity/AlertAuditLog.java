package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Persists a record every time an admin performs a significant action on an alert.
 * Provides full audit traceability for accountability.
 */
@Entity
@Table(name = "alert_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The alert that was acted upon. */
    @Column(name = "alert_id")
    private Long alertId;

    /** ID of the admin who performed the action (from JWT principal). */
    @Column(name = "admin_id")
    private Long adminId;

    /** Email of the admin for human-readable audit trail. */
    @Column(name = "admin_email", length = 255)
    private String adminEmail;

    /** Short action code, e.g. ALERT_CREATED, ALERT_RESOLVED, SIMULATION_TOGGLED. */
    @Column(name = "action", nullable = false, length = 100)
    private String action;

    /** Extra contextual detail about the action. */
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @CreationTimestamp
    @Column(name = "performed_at", updatable = false)
    private LocalDateTime performedAt;
}
