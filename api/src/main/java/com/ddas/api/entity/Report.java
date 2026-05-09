package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 36)
    private String uuid;

    @Column(name = "report_number", unique = true, nullable = false, length = 20)
    private String reportNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "is_anonymous")
    private Boolean isAnonymous = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_type_id", nullable = false)
    private ReportType reportType;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "ENUM('low','medium','high','critical') DEFAULT 'medium'")
    private ReportType.Priority priority = ReportType.Priority.medium;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id")
    private Dam dam;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "location_description", length = 500)
    private String locationDescription;

    @Column(name = "location_description_si", length = 500)
    private String locationDescriptionSi;

    @Column(length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "description_si", columnDefinition = "TEXT")
    private String descriptionSi;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "ENUM('pending','reviewing','in_progress','resolved','rejected','duplicate') DEFAULT 'pending'")
    private ReportStatus status = ReportStatus.pending;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private User assignedBy;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolution_notes_si", columnDefinition = "TEXT")
    private String resolutionNotesSi;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private User resolvedBy;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private User verifiedBy;

    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;

    @Column(name = "requires_followup")
    private Boolean requiresFollowup = false;

    @Column(name = "followup_date")
    private LocalDate followupDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "duplicate_of_id")
    private Report duplicateOf;

    @Column(name = "related_alert_id")
    private Long relatedAlertId;

    @Column(name = "view_count", columnDefinition = "INT DEFAULT 0")
    private Integer viewCount = 0;

    @Column(name = "upvote_count", columnDefinition = "INT DEFAULT 0")
    private Integer upvoteCount = 0;

    @Column(name = "comment_count", columnDefinition = "INT DEFAULT 0")
    private Integer commentCount = 0;

    @Column(columnDefinition = "JSON")
    private String metadata;

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReportMedia> media = new ArrayList<>();

    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    @Builder.Default
    private List<ReportStatusHistory> statusHistory = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    public void prePersist() {
        if (this.uuid == null || this.uuid.isBlank()) {
            this.uuid = UUID.randomUUID().toString();
        }
    }

    public enum ReportStatus {
        pending, reviewing, in_progress, resolved, rejected, duplicate
    }
}
