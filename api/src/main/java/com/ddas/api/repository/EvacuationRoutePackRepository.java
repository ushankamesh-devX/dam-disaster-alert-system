package com.ddas.api.repository;

import com.ddas.api.entity.EvacuationRoutePack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvacuationRoutePackRepository extends JpaRepository<EvacuationRoutePack, Long> {

    Optional<EvacuationRoutePack> findByHazardZoneIdAndMode(Long hazardZoneId, String mode);

    List<EvacuationRoutePack> findByHazardZoneId(Long hazardZoneId);
}
