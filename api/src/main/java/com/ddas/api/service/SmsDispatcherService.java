package com.ddas.api.service;

import com.ddas.api.entity.AlertUserDelivery;
import com.ddas.api.entity.AlertUserDelivery.SmsStatus;
import com.ddas.api.repository.AlertUserDeliveryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * SMS Dispatcher Service — DDAS Step 6
 *
 * @Scheduled task-ය ශ්‍රී ලංකා වේලාවට සෑම තත්පර 10 කට වරක් ක්‍රියාත්මක වේ.
 * alert_user_deliveries table-ෙ 'pending' status records fetch කර,
 * Twilio (හෝ Dialog/Mobitel) SMS API හරහා real SMS yawayī.
 *
 * ── Flow ─────────────────────────────────────────────────────────────────
 *  @Scheduled (10s)
 *    → findPendingDeliveries() [max 100 per batch]
 *    → sendViaTwilio(phoneNumber, message)
 *    → update status = 'sent' / 'failed'
 *    → log result
 *
 * ── Configuration (application.properties) ───────────────────────────────
 *  sms.provider=twilio         (twilio | dialog | mock)
 *  sms.enabled=true
 *  twilio.account-sid=ACxxxx
 *  twilio.auth-token=xxxx
 *  twilio.from-number=+94xxxxxxxxxx
 *
 * ── SMS Provider Support ──────────────────────────────────────────────────
 *  1. Twilio (default)      — Global, reliable, easy test with trial account
 *  2. Dialog SLT            — Local SL carrier (SMPP / HTTP API)
 *  3. Mock (dev/test mode)  — Logs SMS to console without sending
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsDispatcherService {

    // ── Dependencies ───────────────────────────────────────────────────────────
    private final AlertUserDeliveryRepository deliveryRepository;
    private final TwilioSmsGateway            twilioGateway;      // SMS gateway implementation

    // ── Configuration ──────────────────────────────────────────────────────────

    @Value("${sms.enabled:false}")
    private boolean smsEnabled;

    @Value("${sms.provider:mock}")
    private String smsProvider;

    @Value("${sms.max-retries:3}")
    private int maxRetries;

    // ── Scheduled Dispatcher ───────────────────────────────────────────────────

    /**
     * සෑම තත්පර 10 කට වරක් ක්‍රියාත්මක වේ.
     * Pending SMS deliveries process කර real SMS gateway-ය හරහා send කරයි.
     *
     * initialDelay=15000 — Application startup time allow කිරීමට
     * fixedDelay=10000    — Previous batch complete වූ ගමන් 10s wait
     */
    @Scheduled(initialDelay = 15_000, fixedDelay = 10_000)
    public void dispatchPendingSms() {
        if (!smsEnabled) {
            log.debug("[SMS] SMS disabled (sms.enabled=false). Skipping dispatch.");
            return;
        }

        List<AlertUserDelivery> pending = deliveryRepository.findPendingDeliveries();

        if (pending.isEmpty()) {
            log.debug("[SMS] No pending SMS deliveries.");
            return;
        }

        log.info("[SMS] Processing {} pending SMS deliveries via {}", pending.size(), smsProvider);

        int sent = 0, failed = 0, skipped = 0;

        for (AlertUserDelivery delivery : pending) {
            try {
                String result = sendSms(delivery.getPhoneNumber(), delivery.getSmsMessage());
                markSent(delivery, result);
                sent++;
            } catch (Exception e) {
                log.error("[SMS] Failed to send SMS to {}: {}", delivery.getPhoneNumber(), e.getMessage());
                markFailed(delivery, e.getMessage());
                failed++;
            }
        }

        log.info("[SMS] Batch complete — sent={}, failed={}, skipped={}", sent, failed, skipped);
    }

    // ── SMS Send Logic ─────────────────────────────────────────────────────────

    /**
     * SMS provider ට අනුව appropriate gateway call කරයි.
     * @return Gateway SID or reference string
     */
    private String sendSms(String to, String message) {
        return switch (smsProvider.toLowerCase()) {
            case "twilio"   -> twilioGateway.send(to, message);
            case "mock", "dev" -> sendMockSms(to, message);
            default -> {
                log.warn("[SMS] Unknown provider '{}' — using mock", smsProvider);
                yield sendMockSms(to, message);
            }
        };
    }

    /**
     * Development/test mode — SMS console-ය-ට print කෙරේ, actual send නොවේ.
     */
    private String sendMockSms(String to, String message) {
        log.info("[SMS-MOCK] 📱 To: {} | Message: {}", to, message);
        return "MOCK-" + System.currentTimeMillis();
    }

    // ── Status Update Helpers ──────────────────────────────────────────────────

    /**
     * SMS send success — status 'sent', timestamp, gateway SID update.
     */
    @Transactional
    protected void markSent(AlertUserDelivery delivery, String gatewaySid) {
        delivery.setSmsStatus(SmsStatus.sent);
        delivery.setSmsGatewaySid(gatewaySid);
        delivery.setSentAt(LocalDateTime.now());
        delivery.setAttemptCount(delivery.getAttemptCount() + 1);
        deliveryRepository.save(delivery);
        log.debug("[SMS] ✅ Sent to {} — SID: {}", delivery.getPhoneNumber(), gatewaySid);
    }

    /**
     * SMS send failure — attempt count increase, error message save.
     * Max retries reached → status 'failed'.
     */
    @Transactional
    protected void markFailed(AlertUserDelivery delivery, String errorMsg) {
        delivery.setAttemptCount(delivery.getAttemptCount() + 1);
        delivery.setSmsErrorMessage(errorMsg);

        if (delivery.getAttemptCount() >= maxRetries) {
            delivery.setSmsStatus(SmsStatus.failed);
            log.warn("[SMS] ❌ Max retries reached for {} — marking failed.", delivery.getPhoneNumber());
        } else {
            // Still pending for next batch retry
            log.info("[SMS] Attempt {}/{} failed for {} — will retry.",
                    delivery.getAttemptCount(), maxRetries, delivery.getPhoneNumber());
        }

        deliveryRepository.save(delivery);
    }
}
