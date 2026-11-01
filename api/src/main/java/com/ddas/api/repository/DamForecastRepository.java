package com.ddas.api.repository;

import com.ddas.api.entity.DamForecast;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DamForecastRepository extends JpaRepository<DamForecast, Long> {

    Optional<DamForecast> findByDamIdAndAsOfAndHorizonHours(Long damId, LocalDateTime asOf, Integer horizonHours);

    @Query("SELECT f FROM DamForecast f WHERE f.dam.id = :damId AND f.isPublished = true " +
            "AND f.asOf = (SELECT MAX(f2.asOf) FROM DamForecast f2 WHERE f2.dam.id = :damId AND f2.isPublished = true) " +
            "ORDER BY f.horizonHours ASC")
    List<DamForecast> findLatestPublishedForecastsByDamId(@Param("damId") Long damId);

    @Query("SELECT f FROM DamForecast f WHERE f.dam.id = :damId " +
            "AND (:from IS NULL OR f.asOf >= :from) " +
            "AND (:to IS NULL OR f.asOf <= :to) " +
            "AND (:cursor IS NULL OR f.id > :cursor) " +
            "ORDER BY f.id ASC")
    List<DamForecast> findForecastsForExport(
            @Param("damId") Long damId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("cursor") Long cursor,
            Pageable pageable
    );

    @Query("SELECT f FROM DamForecast f WHERE f.dam.id = :damId " +
            "AND f.targetTime <= :now AND f.isPublished = true " +
            "AND (:horizon IS NULL OR f.horizonHours = :horizon) " +
            "ORDER BY f.targetTime DESC")
    List<DamForecast> findMaturedForecasts(
            @Param("damId") Long damId,
            @Param("now") LocalDateTime now,
            @Param("horizon") Integer horizon,
            Pageable pageable
    );
}

