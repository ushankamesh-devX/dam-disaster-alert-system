package com.ddas.api.repository;

import com.ddas.api.entity.HazardLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HazardLevelRepository extends JpaRepository<HazardLevel, Long> {

    Optional<HazardLevel> findByCode(String code);

    Optional<HazardLevel> findByLevelNumber(Integer levelNumber);

    List<HazardLevel> findByIsActiveTrueOrderByLevelNumberAsc();

    List<HazardLevel> findAllByOrderByLevelNumberAsc();

    List<HazardLevel> findByEvacuationRequiredTrue();

    boolean existsByCode(String code);

    boolean existsByLevelNumber(Integer levelNumber);
}
