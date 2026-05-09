package com.ddas.api.repository;

import com.ddas.api.entity.ReportType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReportTypeRepository extends JpaRepository<ReportType, Long> {

    List<ReportType> findByIsActiveTrueOrderByDisplayOrderAsc();

    Optional<ReportType> findByCode(String code);

    List<ReportType> findByCategoryAndIsActiveTrue(ReportType.ReportCategory category);

    boolean existsByCode(String code);
}
