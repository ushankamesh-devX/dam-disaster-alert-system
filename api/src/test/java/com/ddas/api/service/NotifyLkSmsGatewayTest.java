package com.ddas.api.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class NotifyLkSmsGatewayTest {

    @Test
    void formatsSriLankanNumbersAs94() {
        assertEquals("94771234567", NotifyLkSmsGateway.toNotifyLkNumber("+94771234567"));
        assertEquals("94771234567", NotifyLkSmsGateway.toNotifyLkNumber("0771234567"));
        assertEquals("94771234567", NotifyLkSmsGateway.toNotifyLkNumber("771234567"));
        assertEquals("94771234567", NotifyLkSmsGateway.toNotifyLkNumber("+94 77 123 4567"));
    }

    @Test
    void refusesToSendWithoutCredentials() {
        NotifyLkSmsGateway gateway = new NotifyLkSmsGateway();
        assertFalse(gateway.isConfigured());
        assertThrows(IllegalStateException.class, () -> gateway.send("0771234567", "test"));
    }
}
