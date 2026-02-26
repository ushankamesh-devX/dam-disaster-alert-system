package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "news_subscriptions")
@Getter
@Setter
public class NewsSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private NewsCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @Column(name = "min_priority", columnDefinition = "ENUM('low','medium','high','critical') DEFAULT 'medium'")
    private String minPriority;

    @Column(name = "push_enabled", columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean pushEnabled = true;

    @Column(name = "email_enabled", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean emailEnabled = false;

    @Column(name = "sms_enabled", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean smsEnabled = false;

    @Column(name = "is_active", columnDefinition = "BOOLEAN DEFAULT TRUE")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
