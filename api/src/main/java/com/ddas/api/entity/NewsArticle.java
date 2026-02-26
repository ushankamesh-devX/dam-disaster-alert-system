package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "news_articles")
@Getter
@Setter
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "uuid", unique = true, nullable = false, length = 36)
    private String uuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private NewsCategory category;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "title_si", length = 255)
    private String titleSi;

    @Column(name = "title_ta", length = 255)
    private String titleTa;

    @Column(name = "summary", nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "summary_si", columnDefinition = "TEXT")
    private String summarySi;

    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "content_si", columnDefinition = "LONGTEXT")
    private String contentSi;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "image_alt", length = 255)
    private String imageAlt;

    @Column(name = "gallery_urls", columnDefinition = "JSON")
    private String galleryUrls;

    @Column(name = "priority_level", columnDefinition = "ENUM('low','medium','high','critical') DEFAULT 'medium'")
    private String priorityLevel;

    @Column(name = "source", length = 100)
    private String source;

    @Column(name = "is_nationwide", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isNationwide = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id")
    private Dam dam;

    @Column(name = "affected_regions", columnDefinition = "JSON")
    private String affectedRegions;

    @Column(name = "status", columnDefinition = "ENUM('draft','published','archived') DEFAULT 'draft'")
    private String status;

    @Column(name = "is_featured", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean isFeatured = false;

    @Column(name = "publish_date")
    private LocalDateTime publishDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "view_count", columnDefinition = "INT DEFAULT 0")
    private Integer viewCount = 0;

    @Column(name = "save_count", columnDefinition = "INT DEFAULT 0")
    private Integer saveCount = 0;

    @Column(name = "share_count", columnDefinition = "INT DEFAULT 0")
    private Integer shareCount = 0;

    @Column(name = "push_sent", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean pushSent = false;

    @Column(name = "push_sent_at")
    private LocalDateTime pushSentAt;

    @Column(name = "metadata", columnDefinition = "JSON")
    private String metadata;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
