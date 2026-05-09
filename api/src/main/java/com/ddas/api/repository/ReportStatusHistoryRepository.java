package com.ddas.api.repository;

import com.ddas.api.entity.ReportStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportStatusHistoryRepository extends JpaRepository<ReportStatusHistory, Long> {

    List<ReportStatusHistory> findByReportIdOrderByCreatedAtDesc(Long reportId);
}
