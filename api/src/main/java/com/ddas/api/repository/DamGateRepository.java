package com.ddas.api.repository;

import com.ddas.api.entity.DamGate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DamGateRepository extends JpaRepository<DamGate, Long> {

    List<DamGate> findByDamId(Long damId);

    Optional<DamGate> findByDamIdAndGateNumber(Long damId, String gateNumber);

    List<DamGate> findByDamIdAndStatus(Long damId, DamGate.GateStatus status);

    @Query("SELECT g FROM DamGate g WHERE g.dam.id = :damId AND g.status != 'closed'")
    List<DamGate> findOpenGatesByDamId(@Param("damId") Long damId);

    @Query("SELECT COUNT(g) FROM DamGate g WHERE g.dam.id = :damId")
    long countGatesByDamId(@Param("damId") Long damId);

    @Query("SELECT COUNT(g) FROM DamGate g WHERE g.dam.id = :damId AND g.status != 'closed'")
    long countOpenGatesByDamId(@Param("damId") Long damId);

    boolean existsByDamIdAndGateNumber(Long damId, String gateNumber);
}
