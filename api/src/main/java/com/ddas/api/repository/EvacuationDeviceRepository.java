package com.ddas.api.repository;

import com.ddas.api.entity.EvacuationDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EvacuationDeviceRepository extends JpaRepository<EvacuationDevice, Long> {

    Optional<EvacuationDevice> findByExpoPushToken(String expoPushToken);

    /** Devices that reported a location recently; older positions are too stale to act on. */
    List<EvacuationDevice> findByLastSeenAtAfter(LocalDateTime since);

    void deleteByExpoPushToken(String expoPushToken);
}
