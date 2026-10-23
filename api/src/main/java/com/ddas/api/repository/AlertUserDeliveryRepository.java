package com.ddas.api.repository;

import com.ddas.api.entity.AlertUserDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for AlertUserDelivery — SMS Delivery Tracking.
 *
 * SmsDispatcherService pending records fetch + update status operations.
 */
@Repository
public interface AlertUserDeliveryRepository extends JpaRepository<AlertUserDelivery, Long> {

    /**
     * Pending SMS deliveries — SmsDispatcherService මේ records process කරයි.
     * attempt_count < 3 limit: max retries 3 ට limit කරයි.
     */
    @Query("""
            SELECT d FROM AlertUserDelivery d
            JOIN FETCH d.user u
            JOIN FETCH d.alert a
            WHERE d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.pending
              AND d.attemptCount < 3
            ORDER BY d.createdAt ASC
            LIMIT 100
            """)
    List<AlertUserDelivery> findPendingDeliveries();

    /**
     * Specific alert සඳහා user deliveries list.
     */
    List<AlertUserDelivery> findByAlertId(Long alertId);

    /**
     * Check if delivery record already exists for this alert + user combo.
     * Duplicate deliveries prevent කිරීමට.
     */
    boolean existsByAlertIdAndUserId(Long alertId, Long userId);

    /**
     * Failed deliveries with attempt count below threshold — retry eligibility.
     */
    @Query("""
            SELECT d FROM AlertUserDelivery d
            WHERE d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.failed
              AND d.attemptCount < 3
            ORDER BY d.updatedAt ASC
            LIMIT 50
            """)
    List<AlertUserDelivery> findRetryableFailedDeliveries();

    /**
     * Count pending SMS deliveries for monitoring/health checks.
     */
    @Query("SELECT COUNT(d) FROM AlertUserDelivery d WHERE d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.pending")
    long countPendingDeliveries();

    /**
     * Count sent deliveries for a specific alert.
     */
    @Query("SELECT COUNT(d) FROM AlertUserDelivery d WHERE d.alert.id = :alertId AND d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.sent")
    long countSentByAlertId(@Param("alertId") Long alertId);

    /**
     * Reset failed deliveries back to pending for manual retry.
     */
    @Modifying
    @Query("UPDATE AlertUserDelivery d SET d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.pending, d.attemptCount = 0 WHERE d.alert.id = :alertId AND d.smsStatus = com.ddas.api.entity.AlertUserDelivery.SmsStatus.failed")
    int resetFailedDeliveriesToPending(@Param("alertId") Long alertId);
}
