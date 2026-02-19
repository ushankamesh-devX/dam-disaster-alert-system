package com.ddas.api.repository;

import com.ddas.api.entity.Sensor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SensorRepository extends JpaRepository<Sensor, Long> {

    Optional<Sensor> findBySensorUid(String sensorUid);

    List<Sensor> findByDamId(Long damId);

    Page<Sensor> findByDamId(Long damId, Pageable pageable);

    List<Sensor> findByDamIdAndStatus(Long damId, Sensor.SensorStatus status);

    List<Sensor> findBySensorTypeId(Long sensorTypeId);

    List<Sensor> findByStatus(Sensor.SensorStatus status);

    @Query("SELECT s FROM Sensor s WHERE s.dam.id = :damId AND s.status = 'active'")
    List<Sensor> findActiveSensorsByDamId(@Param("damId") Long damId);

    @Query("SELECT s FROM Sensor s WHERE s.dam.id = :damId AND s.status IN ('faulty', 'offline')")
    List<Sensor> findProblematicSensorsByDamId(@Param("damId") Long damId);

    @Query("SELECT COUNT(s) FROM Sensor s WHERE s.dam.id = :damId")
    long countSensorsByDamId(@Param("damId") Long damId);

    @Query("SELECT COUNT(s) FROM Sensor s WHERE s.dam.id = :damId AND s.status = 'active'")
    long countActiveSensorsByDamId(@Param("damId") Long damId);

    boolean existsBySensorUid(String sensorUid);
}
