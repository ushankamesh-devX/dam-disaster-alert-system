package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Alert User Delivery — SMS Delivery Tracking Table
 *
 * Alert එකක් generate වූ විට, සෑම affected user කෙනෙකු සඳහාම
 * මෙහි record එකක් 'pending' status සමග insert කෙරේ.
 * SmsDispatcherService @Scheduled job pending records process කරා SMS යවයි.
 *
 * DB Table: alert_user_deliveries
 */
@Entity
@Table(name = "alert_user_deliveries",
    indexes = {
        @Index(name = "idx_delivery_alert", columnList = "alert_id"),
        @Index(name = "idx_delivery_user", columnList = "user_id"),
        @Index(name = "idx_delivery_sms_status", columnList = "sms_status"),
        @Index(name = "idx_delivery_pending", columnList = "sms_status, created_at")
    })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertUserDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Foreign Keys ───────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "alert_id", nullable = false)
    private Alert alert;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // ── Delivery Info ──────────────────────────────────────────────────────────

    /** Phone number at the time of delivery (snapshot — prevents issues if user updates phone later) */
    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    /** SMS message content that was/will be sent */
    @Column(name = "sms_message", columnDefinition = "TEXT")
    private String smsMessage;

    // ── SMS Delivery Status ────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "sms_status", nullable = false)
    @Builder.Default
    private SmsStatus smsStatus = SmsStatus.pending;

    /** Twilio/Dialog SID or external reference returned by SMS gateway */
    @Column(name = "sms_gateway_sid", length = 100)
    private String smsGatewaySid;

    /** Error message if SMS delivery failed */
    @Column(name = "sms_error_message", columnDefinition = "TEXT")
    private String smsErrorMessage;

    /** Number of send attempts (for retry logic) */
    @Column(name = "attempt_count")
    @Builder.Default
    private Integer attemptCount = 0;

    /** Timestamp when SMS was successfully sent */
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    // ── Audit ──────────────────────────────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Enum ───────────────────────────────────────────────────────────────────

    public enum SmsStatus {
        /** Queued, not yet sent */
        pending,
        /** Successfully delivered to SMS gateway */
        sent,
        /** Gateway confirmed delivery to handset */
        delivered,
        /** Failed after max retries */
        failed,
        /** User has no phone number — skipped */
        skipped
    }
}
