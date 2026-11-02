package com.ddas.api.repository;

import com.ddas.api.entity.BlockedRoad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BlockedRoadRepository extends JpaRepository<BlockedRoad, Long> {

    @Query("SELECT b FROM BlockedRoad b WHERE b.isActive = true AND (b.expiresAt IS NULL OR b.expiresAt > :now)")
    List<BlockedRoad> findCurrentlyBlocked(@Param("now") LocalDateTime now);

    List<BlockedRoad> findAllByOrderByCreatedAtDesc();
}
