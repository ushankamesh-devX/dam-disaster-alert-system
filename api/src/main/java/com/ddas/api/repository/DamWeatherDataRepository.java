package com.ddas.api.repository;

import com.ddas.api.entity.DamWeatherData;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DamWeatherDataRepository extends JpaRepository<DamWeatherData, Long> {

    @Query("SELECT w FROM DamWeatherData w WHERE w.dam.id = :damId " +
           "AND w.validTime >= :from AND w.validTime <= :to " +
           "AND (:asOf IS NULL OR w.fetchTime <= :asOf) " +
           "AND (:cursorId IS NULL OR w.id > :cursorId) " +
           "ORDER BY w.id ASC")
    List<DamWeatherData> findWeatherForExport(
            @Param("damId") Long damId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("asOf") LocalDateTime asOf,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    Optional<DamWeatherData> findTopByDamIdOrderByValidTimeDesc(Long damId);
}

