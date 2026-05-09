package com.ddas.api.repository;

import com.ddas.api.entity.Report;
import com.ddas.api.entity.ReportType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    Page<Report> findByDeletedAtIsNull(Pageable pageable);

    Page<Report> findByStatusAndDeletedAtIsNull(Report.ReportStatus status, Pageable pageable);

    Page<Report> findByUserIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    Page<Report> findByDamIdAndDeletedAtIsNull(Long damId, Pageable pageable);

    Page<Report> findByReportTypeIdAndDeletedAtIsNull(Long reportTypeId, Pageable pageable);

    Page<Report> findByPriorityAndDeletedAtIsNull(ReportType.Priority priority, Pageable pageable);

    Page<Report> findByAssignedToIdAndDeletedAtIsNull(Long userId, Pageable pageable);

    @Query("SELECT r FROM Report r WHERE r.deletedAt IS NULL " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:reportTypeId IS NULL OR r.reportType.id = :reportTypeId) " +
            "AND (:damId IS NULL OR r.dam.id = :damId) " +
            "AND (:priority IS NULL OR r.priority = :priority)")
    Page<Report> findAllWithFilters(
            @Param("status") Report.ReportStatus status,
            @Param("reportTypeId") Long reportTypeId,
            @Param("damId") Long damId,
            @Param("priority") ReportType.Priority priority,
            Pageable pageable);

    long countByStatusAndDeletedAtIsNull(Report.ReportStatus status);

    long countByDeletedAtIsNull();

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(r.reportNumber, 10) AS int)), 0) " +
            "FROM Report r WHERE r.reportNumber LIKE :prefix")
    int findMaxReportSequence(@Param("prefix") String prefix);
}
