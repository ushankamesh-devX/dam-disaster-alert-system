package com.ddas.api.repository;

import com.ddas.api.entity.DamOverflowConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DamOverflowConfigRepository extends JpaRepository<DamOverflowConfig, Long> {

    @Query("SELECT c FROM DamOverflowConfig c WHERE c.dam.id = :damId " +
           "AND c.isActive = true AND c.effectiveFrom <= :now " +
           "AND (c.effectiveTo IS NULL OR c.effectiveTo >= :now) " +
           "ORDER BY c.version DESC LIMIT 1")
    Optional<DamOverflowConfig> findActiveConfigByDamId(
            @Param("damId") Long damId,
            @Param("now") LocalDateTime now
    );

    List<DamOverflowConfig> findByDamIdOrderByVersionDesc(Long damId);

    Optional<DamOverflowConfig> findTopByDamIdOrderByVersionDesc(Long damId);
}

