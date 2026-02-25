package com.ddas.api.repository;

import com.ddas.api.entity.DamCurrentStatus;
import com.ddas.api.entity.Dam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DamCurrentStatusRepository extends JpaRepository<DamCurrentStatus, Long> {

    Optional<DamCurrentStatus> findByDamId(Long damId);

    Optional<DamCurrentStatus> findByDam(Dam dam);

    @Query("SELECT s FROM DamCurrentStatus s WHERE s.hazardStatus IN ('high', 'severe', 'critical')")
    List<DamCurrentStatus> findHighRiskDams();

    @Query("SELECT s FROM DamCurrentStatus s WHERE s.waterLevelPercentage >= :threshold")
    List<DamCurrentStatus> findDamsWithWaterLevelAbove(@Param("threshold") java.math.BigDecimal threshold);

    @Query("SELECT s FROM DamCurrentStatus s WHERE s.hazardStatus = :status")
    List<DamCurrentStatus> findByHazardStatus(@Param("status") Dam.HazardStatus status);

    @Query("SELECT s FROM DamCurrentStatus s LEFT JOIN FETCH s.dam LEFT JOIN FETCH s.currentHazardLevel WHERE s.dam.id = :damId")
    Optional<DamCurrentStatus> findByDamIdWithDetails(@Param("damId") Long damId);
}
