package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Admin on/off switch for real SMS, on top of sms.enabled. SMS credits are limited, so it
 * starts OFF on every API start: nothing is queued or sent until an admin turns it on.
 */
@Slf4j
@Service
public class SmsControlService {

    private final AtomicBoolean sendingAllowed = new AtomicBoolean(false);

    public boolean isSendingAllowed() {
        return sendingAllowed.get();
    }

    public void setSendingAllowed(boolean allowed) {
        sendingAllowed.set(allowed);
        log.warn("[SMS] Admin switched SMS sending {}", allowed ? "ON" : "OFF");
    }
}
