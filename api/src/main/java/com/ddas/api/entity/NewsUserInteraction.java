package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "news_user_interactions")
@Getter
@Setter
public class NewsUserInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private NewsArticle article;

    @Column(name = "has_viewed", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean hasViewed = false;

    @Column(name = "has_saved", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean hasSaved = false;

    @Column(name = "has_shared", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean hasShared = false;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "saved_at")
    private LocalDateTime savedAt;

    @Column(name = "shared_at")
    private LocalDateTime sharedAt;

    @Column(name = "share_platform", length = 50)
    private String sharePlatform;

    @Column(name = "read_progress", columnDefinition = "INT DEFAULT 0")
    private Integer readProgress = 0;

    @Column(name = "read_time_seconds", columnDefinition = "INT DEFAULT 0")
    private Integer readTimeSeconds = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
