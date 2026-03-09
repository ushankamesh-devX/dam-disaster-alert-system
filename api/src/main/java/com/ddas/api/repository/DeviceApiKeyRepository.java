package com.ddas.api.repository;

import com.ddas.api.entity.DeviceApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceApiKeyRepository extends JpaRepository<DeviceApiKey, Long> {

    Optional<DeviceApiKey> findByApiKeyHash(String apiKeyHash);

    List<DeviceApiKey> findBySensorId(Long sensorId);

    List<DeviceApiKey> findByIsActiveTrue();

    List<DeviceApiKey> findByIsActiveFalse();

    boolean existsBySensorIdAndIsActiveTrue(Long sensorId);

    @Modifying
    @Query("UPDATE DeviceApiKey d SET d.lastUsedAt = :timestamp WHERE d.id = :id")
    void updateLastUsedAt(@Param("id") Long id, @Param("timestamp") LocalDateTime timestamp);

    @Modifying
    @Query("UPDATE DeviceApiKey d SET d.isActive = false WHERE d.id = :id")
    void deactivateKey(@Param("id") Long id);

    @Query("SELECT d FROM DeviceApiKey d JOIN FETCH d.sensor WHERE d.apiKeyHash = :hash AND d.isActive = true")
    Optional<DeviceApiKey> findActiveByApiKeyHash(@Param("hash") String hash);

    long countByIsActiveTrue();

    long countBySensorId(Long sensorId);
}
