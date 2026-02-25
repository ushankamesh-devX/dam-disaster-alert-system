package com.ddas.api.repository;

import com.ddas.api.entity.SensorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SensorTypeRepository extends JpaRepository<SensorType, Long> {

    Optional<SensorType> findByCode(String code);

    boolean existsByCode(String code);
}
