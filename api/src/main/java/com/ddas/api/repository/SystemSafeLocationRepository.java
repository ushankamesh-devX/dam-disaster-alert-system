package com.ddas.api.repository;

import com.ddas.api.entity.SystemSafeLocation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemSafeLocationRepository extends JpaRepository<SystemSafeLocation, Long> {

    Optional<SystemSafeLocation> findByIdAndDeletedAtIsNull(Long id);

    Optional<SystemSafeLocation> findByUuidAndDeletedAtIsNull(String uuid);

    Optional<SystemSafeLocation> findByUuid(String uuid);

    boolean existsByUuid(String uuid);

    boolean existsByCode(String code);

    List<SystemSafeLocation> findAllByDeletedAtIsNull();

    Page<SystemSafeLocation> findAllByDeletedAtIsNull(Pageable pageable);
}
