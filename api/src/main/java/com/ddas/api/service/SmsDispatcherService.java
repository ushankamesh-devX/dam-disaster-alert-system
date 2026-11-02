package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class SmsDispatcherService {

    @Value("${notify.user-id:}")
    private String userId;

    @Value("${notify.api-key:}")
    private String apiKey;

    public void sendSms(String phoneNumber, String message) {
        if (userId == null || userId.isBlank() || apiKey == null || apiKey.isBlank()) {
            log.warn("SMS dispatch skipped: notify.user-id or notify.api-key is not configured.");
            return;
        }
        try {
            // ශ්‍රී ලංකාවේ අංක වලට ගැළපෙන පරිදි format කිරීම (උදා: +94 වෙනුවට 94)
            String formattedNumber = phoneNumber != null ? phoneNumber.replace("+", "") : "";

            String url = String.format(
                    "https://app.notify.lk/api/v1/send?user_id=%s&api_key=%s&sender_id=NotifyDEMO&to=%s&message=%s",
                    userId, apiKey, formattedNumber, message
            );

            RestTemplate restTemplate = new RestTemplate();
            String response = restTemplate.getForObject(url, String.class);
            log.info("SMS Sent Successfully! Response: {}", response);

        } catch (Exception e) {
            log.error("Failed to send SMS: {}", e.getMessage());
        }
    }
}