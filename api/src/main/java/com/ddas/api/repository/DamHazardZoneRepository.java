package com.ddas.api.repository;

import com.ddas.api.entity.DamHazardZone;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DamHazardZoneRepository extends JpaRepository<DamHazardZone, Long> {

    List<DamHazardZone> findByDamId(Long damId);

    Page<DamHazardZone> findByDamId(Long damId, Pageable pageable);

    List<DamHazardZone> findByDamIdAndIsActiveTrue(Long damId);

    List<DamHazardZone> findByHazardLevelId(Long hazardLevelId);

    Optional<DamHazardZone> findByDamIdAndZoneCode(Long damId, String zoneCode);

    @Query("SELECT z FROM DamHazardZone z WHERE z.dam.id = :damId AND z.hazardLevel.levelNumber = :levelNumber")
    List<DamHazardZone> findByDamIdAndHazardLevelNumber(@Param("damId") Long damId, @Param("levelNumber") Integer levelNumber);

    @Query("SELECT z FROM DamHazardZone z WHERE z.dam.id = :damId AND z.isActive = true ORDER BY z.hazardLevel.levelNumber, z.displayOrder")
    List<DamHazardZone> findActiveZonesByDamIdOrdered(@Param("damId") Long damId);

    @Query("SELECT z FROM DamHazardZone z WHERE z.dam.id = :damId AND z.isVerified = false")
    List<DamHazardZone> findUnverifiedZonesByDamId(@Param("damId") Long damId);

    @Query("SELECT COUNT(z) FROM DamHazardZone z WHERE z.dam.id = :damId AND z.isActive = true")
    long countActiveZonesByDamId(@Param("damId") Long damId);

    boolean existsByDamIdAndZoneCode(Long damId, String zoneCode);
}
