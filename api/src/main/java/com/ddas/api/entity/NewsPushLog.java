package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "news_push_logs")
@Getter
@Setter
public class NewsPushLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private NewsArticle article;

    @Column(name = "total_recipients", columnDefinition = "INT DEFAULT 0")
    private Integer totalRecipients = 0;

    @Column(name = "sent_count", columnDefinition = "INT DEFAULT 0")
    private Integer sentCount = 0;

    @Column(name = "delivered_count", columnDefinition = "INT DEFAULT 0")
    private Integer deliveredCount = 0;

    @Column(name = "failed_count", columnDefinition = "INT DEFAULT 0")
    private Integer failedCount = 0;

    @Column(name = "opened_count", columnDefinition = "INT DEFAULT 0")
    private Integer openedCount = 0;

    @Column(name = "provider", length = 50)
    private String provider;

    @Column(name = "batch_id", length = 100)
    private String batchId;

    @CreationTimestamp
    @Column(name = "sent_at", updatable = false)
    private LocalDateTime sentAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "error_summary", columnDefinition = "JSON")
    private String errorSummary;
}
