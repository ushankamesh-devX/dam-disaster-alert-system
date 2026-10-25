package com.ddas.api.repository;

import com.ddas.api.entity.DamStatusHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DamStatusHistoryRepository extends JpaRepository<DamStatusHistory, Long> {

    @Query("SELECT h FROM DamStatusHistory h WHERE h.dam.id = :damId " +
           "AND h.recordedAt >= :from AND h.recordedAt <= :to " +
           "AND (:cursorId IS NULL OR h.id > :cursorId) " +
           "ORDER BY h.id ASC")
    List<DamStatusHistory> findHistoryForExport(
            @Param("damId") Long damId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("cursorId") Long cursorId,
            Pageable pageable
    );

    @Query("SELECT h FROM DamStatusHistory h WHERE h.dam.id = :damId ORDER BY h.recordedAt DESC LIMIT 1")
    Optional<DamStatusHistory> findLatestByDamId(@Param("damId") Long damId);
}

