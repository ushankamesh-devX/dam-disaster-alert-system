package com.ddas.api.repository;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    // ── Basic finders ─────────────────────────────────────────────────────────

    List<Alert> findByStatus(Alert.AlertStatus status);

    long countByStatus(Alert.AlertStatus status);

    List<Alert> findByDamId(Long damId);

    List<Alert> findByRegionId(Long regionId);

    Optional<Alert> findByUuid(String uuid);

    // ── Active alert queries ───────────────────────────────────────────────────

    @Query("SELECT a FROM Alert a WHERE a.status = 'active' AND a.damId = :damId")
    List<Alert> findActiveAlertsByDamId(@Param("damId") Long damId);

    @Query("SELECT a FROM Alert a WHERE a.status = 'active' AND a.regionId = :regionId")
    List<Alert> findActiveAlertsByRegionId(@Param("regionId") Long regionId);

    @Query("SELECT a FROM Alert a WHERE a.status = 'active' AND a.hazardZoneId = :zoneId")
    List<Alert> findActiveAlertsByHazardZoneId(@Param("zoneId") Long zoneId);

    /**
     * Active alerts that have not yet expired.
     * Matches the v_active_alerts DB view logic.
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.status = 'active'
              AND (a.expiresAt IS NULL OR a.expiresAt > :now)
            ORDER BY a.issuedAt DESC
            """)
    List<Alert> findNonExpiredActiveAlerts(@Param("now") LocalDateTime now);

    // ── Search / filter ───────────────────────────────────────────────────────

    @Query("""
            SELECT a FROM Alert a
            WHERE (:status   IS NULL OR a.status   = :status)
              AND (:severity  IS NULL OR a.severity = :severity)
              AND (:regionId  IS NULL OR a.regionId = :regionId)
              AND (:damId     IS NULL OR a.damId    = :damId)
            ORDER BY a.createdAt DESC
            """)
    List<Alert> searchAlerts(
            @Param("status")   Alert.AlertStatus status,
            @Param("severity") AlertType.AlertSeverity severity,
            @Param("regionId") Long regionId,
            @Param("damId")    Long damId);

    // ── Bulk operations ───────────────────────────────────────────────────────

    /**
     * Fetch active alerts for bulk resolve/escalate.
     * At least one of damId or severity must be non-null (enforced in service).
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.status = com.ddas.api.entity.Alert.AlertStatus.active
              AND (:damId    IS NULL OR a.damId    = :damId)
              AND (:severity IS NULL OR a.severity = :severity)
            ORDER BY a.createdAt DESC
            """)
    List<Alert> findActiveAlertsForBulkAction(
            @Param("damId")    Long damId,
            @Param("severity") AlertType.AlertSeverity severity);

    // ── Expiry management ─────────────────────────────────────────────────────

    /**
     * Find active alerts whose expiresAt is in the past — used by the
     * expiry scheduler to auto-transition them to status=expired.
     */
    @Query("""
            SELECT a FROM Alert a
            WHERE a.status = 'active'
              AND a.expiresAt IS NOT NULL
              AND a.expiresAt < :now
            """)
    List<Alert> findExpiredActiveAlerts(@Param("now") LocalDateTime now);

    /**
     * Bulk-expire alerts that have passed their expiresAt.
     * Returns number of rows updated.
     */
    @Modifying
    @Query("""
            UPDATE Alert a SET a.status = 'expired'
            WHERE a.status = 'active'
              AND a.expiresAt IS NOT NULL
              AND a.expiresAt < :now
            """)
    int bulkExpireAlerts(@Param("now") LocalDateTime now);

    // ── Stats ─────────────────────────────────────────────────────────────────

    @Query("SELECT COUNT(a) FROM Alert a WHERE a.damId = :damId AND a.status = 'active'")
    long countActiveAlertsByDam(@Param("damId") Long damId);

    @Query("""
            SELECT a.severity, COUNT(a) FROM Alert a
            WHERE a.status = 'active'
            GROUP BY a.severity
            """)
    List<Object[]> countActiveAlertsBySeverity();

    // ── Near-location query (Haversine) ───────────────────────────────────────

    /**
     * Returns active alerts within radiusKm of the given lat/lng.
     * Matches the sample query in alerts_schema.md.
     */
    @Query(value = """
            SELECT * FROM alerts a
            WHERE a.status = 'active'
              AND a.latitude  IS NOT NULL
              AND a.longitude IS NOT NULL
              AND (a.expires_at IS NULL OR a.expires_at > NOW())
            HAVING (
               6371 * ACOS(
                 COS(RADIANS(:lat)) * COS(RADIANS(a.latitude)) *
                 COS(RADIANS(a.longitude) - RADIANS(:lng)) +
                 SIN(RADIANS(:lat)) * SIN(RADIANS(a.latitude))
               )
            ) <= COALESCE(a.radius_km, :defaultRadius)
            ORDER BY a.severity = 'emergency' DESC, a.issued_at DESC
            """,
            nativeQuery = true)
    List<Alert> findActiveAlertsNearLocation(
            @Param("lat")           double lat,
            @Param("lng")           double lng,
            @Param("defaultRadius") double defaultRadius);
}
