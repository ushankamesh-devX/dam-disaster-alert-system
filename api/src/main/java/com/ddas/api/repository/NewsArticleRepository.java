package com.ddas.api.repository;

import com.ddas.api.entity.NewsArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    Optional<NewsArticle> findByUuid(String uuid);

    Page<NewsArticle> findByStatusAndDeletedAtIsNull(String status, Pageable pageable);

    Page<NewsArticle> findByCategoryIdAndDeletedAtIsNull(Long categoryId, Pageable pageable);

    Page<NewsArticle> findByIsFeaturedTrueAndDeletedAtIsNull(Pageable pageable);

    Page<NewsArticle> findByTitleContainingIgnoreCaseAndDeletedAtIsNull(String title, Pageable pageable);

    long countByCategoryId(Long categoryId);
}
