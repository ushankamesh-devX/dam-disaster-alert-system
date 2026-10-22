package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Twilio SMS Gateway — DDAS SMS Delivery Layer
 *
 * Twilio REST API හරහා Sri Lanka mobile numbers-ට SMS send කරයි.
 *
 * ── Setup ──────────────────────────────────────────────────────────────────
 * 1. https://www.twilio.com/try-twilio — Free trial account create කරන්න
 * 2. Console → Phone Numbers → Get a number (Sri Lanka prefix: +94)
 * 3. Account SID + Auth Token → application.properties-ට add
 *
 * ── application.properties ────────────────────────────────────────────────
 *  twilio.account-sid=${TWILIO_ACCOUNT_SID:}
 *  twilio.auth-token=${TWILIO_AUTH_TOKEN:}
 *  twilio.from-number=${TWILIO_FROM_NUMBER:+1234567890}
 *
 * ── Twilio Maven Dependency (pom.xml) ─────────────────────────────────────
 *  <dependency>
 *    <groupId>com.twilio.sdk</groupId>
 *    <artifactId>twilio</artifactId>
 *    <version>10.1.5</version>
 *  </dependency>
 *
 * NOTE: Twilio SDK dependency නොතිිබිය හොත් sms.provider=mock use කරන්න.
 *       Production-ට pom.xml-ට Twilio dependency add කර TWILIO_* env vars set කරන්න.
 */
@Slf4j
@Component
public class TwilioSmsGateway {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:+1234567890}")
    private String fromNumber;

    @Value("${sms.provider:mock}")
    private String smsProvider;

    /**
     * Twilio REST API හරහා SMS send කරයි.
     *
     * ── Phone number format ────────────────────────────────────────────────
     * Sri Lanka: +94771234567 (country code + number, no leading 0)
     * Twilio automatically handles formatting.
     *
     * @param to      Recipient phone number (+94xxxxxxxxx format)
     * @param message SMS message body (160 char limit for single SMS)
     * @return Twilio Message SID (e.g., SM1234567890abcdef)
     * @throws RuntimeException if SMS gateway call fails
     */
    public String send(String to, String message) {
        // Twilio credentials check
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            log.warn("[TWILIO] Credentials not configured. Falling back to mock SMS.");
            return sendMockSms(to, message);
        }

        try {
            /*
             * ── Twilio SDK Usage (uncomment when twilio dependency added to pom.xml) ──
             *
             * import com.twilio.Twilio;
             * import com.twilio.rest.api.v2010.account.Message;
             * import com.twilio.type.PhoneNumber;
             *
             * Twilio.init(accountSid, authToken);
             *
             * Message twilioMessage = Message.creator(
             *     new PhoneNumber(to),
             *     new PhoneNumber(fromNumber),
             *     message
             * ).create();
             *
             * log.info("[TWILIO] SMS sent to {} — SID: {}", to, twilioMessage.getSid());
             * return twilioMessage.getSid();
             */

            // ── Temporary HTTP-based fallback (no SDK needed) ────────────────
            return sendViaTwilioHttpApi(to, message);

        } catch (Exception e) {
            log.error("[TWILIO] Failed to send SMS to {}: {}", to, e.getMessage());
            throw new RuntimeException("Twilio SMS send failed: " + e.getMessage(), e);
        }
    }

    /**
     * Twilio REST API — HTTP POST via Java native HttpClient.
     * Twilio SDK dependency නොතිිබිය හොත් direct HTTP call.
     */
    private String sendViaTwilioHttpApi(String to, String message) throws Exception {
        String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";

        // URL-encode the form data
        String body = "To=" + java.net.URLEncoder.encode(to, java.nio.charset.StandardCharsets.UTF_8)
                + "&From=" + java.net.URLEncoder.encode(fromNumber, java.nio.charset.StandardCharsets.UTF_8)
                + "&Body=" + java.net.URLEncoder.encode(message, java.nio.charset.StandardCharsets.UTF_8);

        // Basic auth: Base64(accountSid:authToken)
        String credentials = java.util.Base64.getEncoder()
                .encodeToString((accountSid + ":" + authToken).getBytes());

        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                .uri(java.net.URI.create(url))
                .header("Authorization", "Basic " + credentials)
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
                .build();

        java.net.http.HttpResponse<String> response = httpClient.send(request,
                java.net.http.HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            // Extract SID from JSON response (simple parse)
            String responseBody = response.body();
            String sid = extractSidFromJson(responseBody);
            log.info("[TWILIO] SMS sent to {} — SID: {}, Status: {}", to, sid, response.statusCode());
            return sid;
        } else {
            log.error("[TWILIO] HTTP error {}: {}", response.statusCode(), response.body());
            throw new RuntimeException("Twilio API error: HTTP " + response.statusCode());
        }
    }

    /**
     * Simple SID extraction from Twilio JSON response.
     * Avoids Jackson dependency for this lightweight component.
     */
    private String extractSidFromJson(String json) {
        // e.g., {"sid":"SM1234567890abcdef","status":"queued",...}
        int sidStart = json.indexOf("\"sid\":\"");
        if (sidStart >= 0) {
            int valueStart = sidStart + 7;
            int valueEnd = json.indexOf("\"", valueStart);
            if (valueEnd > valueStart) {
                return json.substring(valueStart, valueEnd);
            }
        }
        return "UNKNOWN-SID";
    }

    /**
     * Mock SMS — Development/test mode.
     */
    private String sendMockSms(String to, String message) {
        log.info("[TWILIO-MOCK] 📱 Would send SMS: To={}, From={}, Message='{}'", to, fromNumber, message);
        return "MOCK-TWILIO-" + System.currentTimeMillis();
    }
}
