package com.ddas.api.repository;

import com.ddas.api.entity.SensorReading;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    Page<SensorReading> findBySensorIdOrderByRecordedAtDesc(Long sensorId, Pageable pageable);

    List<SensorReading> findBySensorIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long sensorId, LocalDateTime start, LocalDateTime end);

    Page<SensorReading> findByDamIdOrderByRecordedAtDesc(Long damId, Pageable pageable);

    @Query("SELECT r FROM SensorReading r WHERE r.sensor.id = :sensorId ORDER BY r.recordedAt DESC LIMIT 1")
    Optional<SensorReading> findLatestBySensorId(@Param("sensorId") Long sensorId);

    @Query("SELECT r FROM SensorReading r WHERE r.dam.id = :damId AND r.recordedAt >= :since ORDER BY r.recordedAt DESC")
    List<SensorReading> findRecentReadingsByDamId(@Param("damId") Long damId, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(r.readingValue) FROM SensorReading r WHERE r.sensor.id = :sensorId AND r.recordedAt BETWEEN :start AND :end")
    Double findAverageReadingBySensorIdAndPeriod(@Param("sensorId") Long sensorId, 
                                                  @Param("start") LocalDateTime start, 
                                                  @Param("end") LocalDateTime end);

    @Query("SELECT MAX(r.readingValue) FROM SensorReading r WHERE r.sensor.id = :sensorId AND r.recordedAt BETWEEN :start AND :end")
    java.math.BigDecimal findMaxReadingBySensorIdAndPeriod(@Param("sensorId") Long sensorId,
                                                            @Param("start") LocalDateTime start,
                                                            @Param("end") LocalDateTime end);

    @Query("SELECT MIN(r.readingValue) FROM SensorReading r WHERE r.sensor.id = :sensorId AND r.recordedAt BETWEEN :start AND :end")
    java.math.BigDecimal findMinReadingBySensorIdAndPeriod(@Param("sensorId") Long sensorId,
                                                            @Param("start") LocalDateTime start,
                                                            @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(r) FROM SensorReading r WHERE r.sensor.id = :sensorId AND r.recordedAt >= :since")
    long countReadingsBySensorIdSince(@Param("sensorId") Long sensorId, @Param("since") LocalDateTime since);
}
