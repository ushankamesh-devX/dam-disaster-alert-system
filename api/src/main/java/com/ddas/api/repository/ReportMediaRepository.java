package com.ddas.api.repository;

import com.ddas.api.entity.ReportMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportMediaRepository extends JpaRepository<ReportMedia, Long> {

    List<ReportMedia> findByReportId(Long reportId);

    Optional<ReportMedia> findByFileName(String fileName);

    Optional<ReportMedia> findByUuid(String uuid);
}

