package com.ddas.api.repository;

import com.ddas.api.entity.NewsSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NewsSubscriptionRepository extends JpaRepository<NewsSubscription, Long> {
    List<NewsSubscription> findByUserId(Long userId);

    Optional<NewsSubscription> findByUserIdAndCategoryIdAndRegionId(Long userId, Long categoryId, Long regionId);
}
