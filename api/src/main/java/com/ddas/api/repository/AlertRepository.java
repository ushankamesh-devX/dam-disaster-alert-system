package com.ddas.api.repository;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatus(Alert.AlertStatus status);

    @Query("SELECT a FROM Alert a WHERE a.status = 'active' AND a.damId = :damId")
    List<Alert> findActiveAlertsByDamId(@Param("damId") Long damId);

    @Query("""
            SELECT a FROM Alert a
            WHERE (:status IS NULL OR a.status = :status)
              AND (:severity IS NULL OR a.severity = :severity)
              AND (:regionId IS NULL OR a.regionId = :regionId)
            ORDER BY a.createdAt DESC
            """)
    List<Alert> searchAlerts(@Param("status") Alert.AlertStatus status,
                             @Param("severity") AlertType.AlertSeverity severity,
                             @Param("regionId") Long regionId);
}
