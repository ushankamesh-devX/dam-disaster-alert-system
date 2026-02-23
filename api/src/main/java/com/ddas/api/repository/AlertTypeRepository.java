package com.ddas.api.repository;

import com.ddas.api.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AlertTypeRepository extends JpaRepository<AlertType, Long> {

    Optional<AlertType> findByCode(String code);
}
