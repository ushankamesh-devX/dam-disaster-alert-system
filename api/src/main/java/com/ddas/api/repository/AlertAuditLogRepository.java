package com.ddas.api.repository;

import com.ddas.api.entity.AlertAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertAuditLogRepository extends JpaRepository<AlertAuditLog, Long> {

    /** Retrieve all audit log entries for a specific alert (chronological). */
    List<AlertAuditLog> findByAlertIdOrderByPerformedAtAsc(Long alertId);

    /** Retrieve all audit log entries performed by a specific admin. */
    List<AlertAuditLog> findByAdminIdOrderByPerformedAtDesc(Long adminId);
}
