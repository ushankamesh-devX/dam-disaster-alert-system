package com.ddas.api.repository;

import com.ddas.api.entity.Dam;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DamRepository extends JpaRepository<Dam, Long>, JpaSpecificationExecutor<Dam> {

    Optional<Dam> findByCode(String code);

    boolean existsByCode(String code);

    List<Dam> findByRegionId(Long regionId);

    Page<Dam> findByRegionId(Long regionId, Pageable pageable);

    List<Dam> findByStatus(Dam.DamStatus status);

    Page<Dam> findByStatus(Dam.DamStatus status, Pageable pageable);

    List<Dam> findByOverallHazardStatus(Dam.HazardStatus hazardStatus);

    Page<Dam> findByOverallHazardStatus(Dam.HazardStatus hazardStatus, Pageable pageable);

    List<Dam> findByDamType(Dam.DamType damType);

    List<Dam> findByRiskClassification(Dam.RiskClassification riskClassification);

    @Query("SELECT d FROM Dam d WHERE " +
           "LOWER(d.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.nameSi) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(d.riverName) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Dam> searchDams(@Param("search") String search, Pageable pageable);

    @Query("SELECT d FROM Dam d WHERE d.overallHazardStatus IN ('high', 'severe', 'critical')")
    List<Dam> findDamsWithHighHazard();

    @Query("SELECT COUNT(d) FROM Dam d WHERE d.status = :status")
    long countByStatus(@Param("status") Dam.DamStatus status);

    @Query("SELECT COUNT(d) FROM Dam d WHERE d.overallHazardStatus = :hazardStatus")
    long countByHazardStatus(@Param("hazardStatus") Dam.HazardStatus hazardStatus);

    @Query("SELECT d FROM Dam d WHERE d.region.id = :regionId AND d.status = 'operational'")
    List<Dam> findOperationalDamsByRegion(@Param("regionId") Long regionId);

    @Query("SELECT d FROM Dam d LEFT JOIN FETCH d.region WHERE d.id = :id")
    Optional<Dam> findByIdWithRegion(@Param("id") Long id);

    @Query("SELECT d FROM Dam d LEFT JOIN FETCH d.region LEFT JOIN FETCH d.overallHazardLevel WHERE d.id = :id")
    Optional<Dam> findByIdWithDetails(@Param("id") Long id);
}
