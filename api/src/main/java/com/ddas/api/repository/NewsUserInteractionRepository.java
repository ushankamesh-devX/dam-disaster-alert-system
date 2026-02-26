package com.ddas.api.repository;

import com.ddas.api.entity.NewsUserInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NewsUserInteractionRepository extends JpaRepository<NewsUserInteraction, Long> {
    Optional<NewsUserInteraction> findByUserIdAndArticleId(Long userId, Long articleId);

    List<NewsUserInteraction> findByUserIdAndHasSavedTrue(Long userId);
}
