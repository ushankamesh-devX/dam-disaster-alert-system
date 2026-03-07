package com.ddas.api.repository;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
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
public interface AlertRepository extends JpaRepository<Alert, Long> {

    Optional<Alert> findByUuid(String uuid);

    /**
     * Comprehensive search for alerts with multiple filters.
     */
    @Query("SELECT a FROM Alert a WHERE " +
           "(:status IS NULL OR a.status = :status) AND " +
           "(:severity IS NULL OR a.severity = :severity) AND " +
           "(:regionId IS NULL OR a.regionId = :regionId) AND " +
           "(:damId IS NULL OR a.damId = :damId) AND " +
           "(a.expiresAt IS NULL OR a.expiresAt > CURRENT_TIMESTAMP OR a.status != 'active')")
    Page<Alert> searchAlerts(@Param("status") Alert.AlertStatus status,
                            @Param("severity") AlertType.AlertSeverity severity,
                            @Param("regionId") Long regionId,
                            @Param("damId") Long damId,
                            Pageable pageable);

    /**
     * Quick list of active alerts.
     */
    List<Alert> findByStatusAndExpiresAtAfterOrExpiresAtIsNull(Alert.AlertStatus status, LocalDateTime now);

    /**
     * Aggregation for Dashboard Stats.
     */
    @Query("SELECT a.status, COUNT(a) FROM Alert a GROUP BY a.status")
    List<Object[]> countByStatus();

    @Query("SELECT a.severity, COUNT(a) FROM Alert a GROUP BY a.severity")
    List<Object[]> countBySeverity();

    @Query("SELECT a.alertType.category, COUNT(a) FROM Alert a GROUP BY a.alertType.category")
    List<Object[]> countByCategory();

    @Query("SELECT a.damId, COUNT(a) FROM Alert a WHERE a.status = 'active' GROUP BY a.damId")
    List<Object[]> countActiveAlertsByDam();
}
