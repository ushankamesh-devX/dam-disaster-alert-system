package com.ddas.api.repository;

import com.ddas.api.entity.ReportMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportMediaRepository extends JpaRepository<ReportMedia, Long> {

    List<ReportMedia> findByReportIdOrderByDisplayOrderAsc(Long reportId);

    void deleteByReportId(Long reportId);

    long countByReportId(Long reportId);
}
