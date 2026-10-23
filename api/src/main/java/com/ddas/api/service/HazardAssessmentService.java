package com.ddas.api.service;

import com.ddas.api.entity.*;
import com.ddas.api.entity.AlertUserDelivery.SmsStatus;
import com.ddas.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Hazard Assessment Service — DDAS Step 5
 *
 * ESP32 sensor reading DB-ට save වූ ගමන් ස්වයංක්‍රීයව call කෙරේ.
 * ජල මට්ටම danger_level_meters ට වඩා ඉහළ ගිය විට:
 *   1. alerts table-ට "High Water Level" alert insert කරයි.
 *   2. alert_user_deliveries table-ට affected users' SMS records insert කරයි (pending).
 *   3. dam_current_status hazard_status update කරයි.
 *
 * ── Call Chain ──────────────────────────────────────────────────────────────
 * MqttSubscriberService.saveReading()
 *     → HazardAssessmentService.assessReading(sensor, reading)
 *         → [if danger] createHighWaterAlert()
 *             → [if new alert] queueSmsDeliveries(alert, users)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HazardAssessmentService {

    // ── Repositories ───────────────────────────────────────────────────────────
    private final DamCurrentStatusRepository    damCurrentStatusRepository;
    private final AlertRepository               alertRepository;
    private final AlertTypeRepository           alertTypeRepository;
    private final AlertUserDeliveryRepository   alertUserDeliveryRepository;
    private final UserRepository                userRepository;

    // ── Constants ──────────────────────────────────────────────────────────────

    /**
     * "HIGH_WATER_LEVEL" alert type code — alert_types table-ට seed කරා insert.
     * Code එක නොතිබිය හොත් auto-fallback to id=1.
     */
    private static final String ALERT_TYPE_CODE_HIGH_WATER = "HIGH_WATER_LEVEL";

    /** Sensor type code — water level sensors පමණක් check කෙරේ */
    private static final String SENSOR_TYPE_WATER_LEVEL = "WATER_LEVEL";

    /** Recent duplicate alert window — same dam-ය same hour-ල duplicate alert create නොවේ */
    private static final long DUPLICATE_ALERT_WINDOW_MINUTES = 60L;

    // ── Main Assessment Entry Point ────────────────────────────────────────────

    /**
     * MqttSubscriberService.saveReading() → මෙය call කෙරේ.
     *
     * Water level sensor reading check කර, danger_level_meters ට වඩා
     * ඉහළ ගිය නම් alert + SMS deliveries create කරයි.
     *
     * @param sensor  Reading send කළ Sensor
     * @param reading DB-ට save කළ SensorReading
     */
    @Transactional
    public void assessReading(Sensor sensor, SensorReading reading) {
        // Water level sensors පමණක් assess කෙරේ
        if (!isWaterLevelSensor(sensor)) {
            log.debug("[HAZARD] Sensor {} is not a water level sensor — skipping.", sensor.getSensorUid());
            return;
        }

        Long damId = sensor.getDam().getId();

        // DamCurrentStatus — danger_level_meters fetch
        Optional<DamCurrentStatus> statusOpt = damCurrentStatusRepository.findByDamId(damId);
        if (statusOpt.isEmpty()) {
            log.warn("[HAZARD] No DamCurrentStatus found for dam {} — cannot assess.", damId);
            return;
        }

        DamCurrentStatus damStatus = statusOpt.get();
        BigDecimal dangerLevel = damStatus.getDangerLevelMeters();

        if (dangerLevel == null) {
            log.debug("[HAZARD] Dam {} has no danger_level_meters configured — skipping assessment.", damId);
            return;
        }

        BigDecimal currentLevel = reading.getReadingValue();

        log.debug("[HAZARD] Dam {}: current={} m, danger={} m", damId, currentLevel, dangerLevel);

        // ── Danger Check ──────────────────────────────────────────────────────
        if (currentLevel.compareTo(dangerLevel) >= 0) {
            log.warn("[HAZARD] 🚨 Dam {} water level {}m >= danger level {}m! Triggering alert.",
                    damId, currentLevel, dangerLevel);

            // Duplicate alert check — same dam-ය, last hour-ල HIGH_WATER_LEVEL alert නැද්ද?
            if (recentHighWaterAlertExists(damId)) {
                log.info("[HAZARD] Duplicate alert suppressed for dam {} — recent alert exists within {}min window.",
                        damId, DUPLICATE_ALERT_WINDOW_MINUTES);
                return;
            }

            // Alert create + SMS queue
            Alert alert = createHighWaterAlert(sensor.getDam(), currentLevel, dangerLevel, damStatus);
            queueSmsDeliveries(alert, damId);

            // DamCurrentStatus hazard_status update
            updateDamHazardStatus(damStatus, currentLevel, dangerLevel);

        } else if (currentLevel.compareTo(dangerLevel.multiply(new BigDecimal("0.90"))) >= 0) {
            // Warning range: 90-100% of danger level
            log.info("[HAZARD] Dam {} approaching danger: {}m / {}m ({:.1f}%)",
                    damId, currentLevel, dangerLevel,
                    currentLevel.divide(dangerLevel, 4, java.math.RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)));
        } else {
            log.debug("[HAZARD] Dam {} water level {} m is within safe range.", damId, currentLevel);
        }
    }

    // ── Alert Creation ─────────────────────────────────────────────────────────

    /**
     * High water level alert alerts table-ට insert කරයි.
     * Status = active, Severity = critical.
     */
    private Alert createHighWaterAlert(Dam dam, BigDecimal currentLevel,
                                        BigDecimal dangerLevel, DamCurrentStatus damStatus) {
        // alert_types table-ෙ HIGH_WATER_LEVEL type fetch — නොතිබිය හොත් id=1
        AlertType alertType = alertTypeRepository.findByCode(ALERT_TYPE_CODE_HIGH_WATER)
                .orElseGet(() -> alertTypeRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException(
                                "[HAZARD] No alert types found in database. Please seed alert_types table.")));

        String title = String.format("⚠️ High Water Level Alert — %s", dam.getName());
        String message = String.format(
                "URGENT: Water level at %s dam has reached %.2f meters, exceeding the danger level of %.2f meters. " +
                "Immediate action required. Please follow evacuation procedures if you are in a hazard zone.",
                dam.getName(), currentLevel, dangerLevel
        );

        Alert alert = Alert.builder()
                .alertType(alertType)
                .title(title)
                .message(message)
                .severity(AlertType.AlertSeverity.critical)
                .status(Alert.AlertStatus.active)
                .damId(dam.getId())
                .regionId(dam.getRegion() != null ? dam.getRegion().getId() : null)
                .simulationMode(false)
                .build();

        Alert saved = alertRepository.save(alert);

        log.warn("[HAZARD] ✅ Alert created: id={}, dam={}, level={}m, danger={}m",
                saved.getId(), dam.getName(), currentLevel, dangerLevel);

        return saved;
    }

    // ── SMS Delivery Queue ─────────────────────────────────────────────────────

    /**
     * Alert-ය සම්බන්ධ dam-ය හා region-ය කලාපයේ ඇති users all ට
     * alert_user_deliveries table-ේ SMS pending records insert කරයි.
     *
     * Strategy:
     *   1. Dam-ය region-ය-ෙ active users සෙවීම
     *   2. Phone number ඇති users filter කිරීම
     *   3. Duplicate delivery check
     *   4. AlertUserDelivery records batch insert
     */
    @Transactional
    public void queueSmsDeliveries(Alert alert, Long damId) {
        List<User> usersToNotify;

        if (alert.getRegionId() != null) {
            // Region-based targeting
            usersToNotify = userRepository.findAllActiveUsers();
            // TODO: Region-filtered query — users table region_id field add
            // For now, notify ALL active users with phone numbers
        } else {
            usersToNotify = userRepository.findAllActiveUsers();
        }

        // Phone number ඇති users filter + deliver
        int queued = 0;
        for (User user : usersToNotify) {
            // Phone number නැති users skip
            if (user.getPhoneNumber() == null || user.getPhoneNumber().isBlank()) {
                continue;
            }

            // SMS notifications disabled users skip
            if (Boolean.FALSE.equals(user.getNotificationEnabled())) {
                continue;
            }

            // Duplicate check — same alert + same user
            if (alertUserDeliveryRepository.existsByAlertIdAndUserId(alert.getId(), user.getId())) {
                continue;
            }

            // SMS message compose
            String smsMessage = composeSmsMessage(alert, user);

            AlertUserDelivery delivery = AlertUserDelivery.builder()
                    .alert(alert)
                    .user(user)
                    .phoneNumber(user.getPhoneNumber())   // snapshot
                    .smsMessage(smsMessage)
                    .smsStatus(SmsStatus.pending)
                    .attemptCount(0)
                    .build();

            alertUserDeliveryRepository.save(delivery);
            queued++;
        }

        log.info("[HAZARD] SMS delivery queue: {} records created for alert id={}", queued, alert.getId());
    }

    // ── Dam Status Update ──────────────────────────────────────────────────────

    /**
     * DamCurrentStatus-ය hazard_status + last_hazard_assessment_at update කරයි.
     */
    @Transactional
    protected void updateDamHazardStatus(DamCurrentStatus damStatus,
                                          BigDecimal currentLevel, BigDecimal dangerLevel) {
        // Percentage above danger
        BigDecimal overPercentage = currentLevel.subtract(dangerLevel)
                .divide(dangerLevel, 4, java.math.RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));

        Dam.HazardStatus newStatus;
        if (overPercentage.compareTo(BigDecimal.valueOf(10)) >= 0) {
            newStatus = Dam.HazardStatus.critical;
        } else if (overPercentage.compareTo(BigDecimal.valueOf(5)) >= 0) {
            newStatus = Dam.HazardStatus.severe;
        } else {
            newStatus = Dam.HazardStatus.high;
        }

        damStatus.setHazardStatus(newStatus);
        damStatus.setWaterLevelMeters(currentLevel);
        damStatus.setLastHazardAssessmentAt(LocalDateTime.now());
        damCurrentStatusRepository.save(damStatus);

        log.info("[HAZARD] Dam status updated to: {}", newStatus);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Water level sensor type check.
     */
    private boolean isWaterLevelSensor(Sensor sensor) {
        return sensor.getSensorType() != null &&
               SENSOR_TYPE_WATER_LEVEL.equalsIgnoreCase(sensor.getSensorType().getCode());
    }

    /**
     * Same dam-ය, last DUPLICATE_ALERT_WINDOW_MINUTES ඇතුළත
     * HIGH_WATER_LEVEL active alert exists check.
     */
    private boolean recentHighWaterAlertExists(Long damId) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(DUPLICATE_ALERT_WINDOW_MINUTES);
        List<Alert> recentAlerts = alertRepository.findActiveAlertsByDamId(damId);
        return recentAlerts.stream()
                .anyMatch(a -> a.getCreatedAt() != null
                        && a.getCreatedAt().isAfter(since)
                        && a.getTitle() != null
                        && a.getTitle().contains("High Water Level"));
    }

    /**
     * SMS message compose — alert + user info සමග.
     * 160 character limit ට fit වන ලෙස.
     */
    private String composeSmsMessage(Alert alert, User user) {
        String name = user.getFullName() != null ? user.getFullName().split(" ")[0] : "Resident";
        return String.format(
                "[DDAS ALERT] Dear %s, %s Danger level exceeded. Please evacuate immediately. Helpline: 1990",
                name,
                alert.getTitle().replace("⚠️ ", "").replace(" Alert — ", " - ")
        );
    }
}
