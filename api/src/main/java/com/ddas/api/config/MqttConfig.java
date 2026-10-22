package com.ddas.api.config;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MQTT Broker Connection Configuration.
 *
 * Eclipse Paho client bean-ek Spring context එකේ manage කරයි.
 * Mosquitto broker Docker container ("mosquitto") හරහා connect වේ.
 *
 * application.properties:
 *   mqtt.broker.url   = tcp://mosquitto:1883   (Docker)
 *   mqtt.client.id    = SpringBootBackendClient
 *   mqtt.username     = (empty if allow_anonymous)
 *   mqtt.password     = (empty if allow_anonymous)
 */
@Slf4j
@Configuration
public class MqttConfig {

    @Value("${mqtt.broker.url}")
    private String brokerUrl;

    @Value("${mqtt.client.id:SpringBootBackendClient}")
    private String clientId;

    @Value("${mqtt.username:}")
    private String username;

    @Value("${mqtt.password:}")
    private String password;

    /**
     * Creates and returns a configured Eclipse Paho MqttClient bean.
     *
     * MemoryPersistence: QoS 1/2 messages in-memory store.
     * Automatic reconnect and clean session configured via MqttConnectOptions.
     *
     * MqttSubscriberService @Autowire කර use කරයි.
     */
    @Bean
    public MqttClient mqttClient() throws MqttException {
        log.info("[MQTT] Initializing client → broker: {} | clientId: {}", brokerUrl, clientId);

        MqttClient client = new MqttClient(brokerUrl, clientId, new MemoryPersistence());

        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);   // Connection drop → auto reconnect
        options.setCleanSession(true);         // ← ඔබේ example: setCleanSession(true)
        options.setConnectionTimeout(30);      // 30 second connection timeout
        options.setKeepAliveInterval(60);      // 60 second keepalive

        // Credentials (allow_anonymous true නම් empty strings)
        if (username != null && !username.isBlank()) {
            options.setUserName(username);
            options.setPassword(password.toCharArray());
            log.info("[MQTT] Using credentials for user: {}", username);
        } else {
            log.info("[MQTT] Connecting anonymously (allow_anonymous true)");
        }

        try {
            client.connect(options);
            log.info("[MQTT] Connected to broker: {}", brokerUrl);
        } catch (MqttException e) {
            // Startup failure — log but don't crash the application.
            // MqttSubscriberService will retry via automatic reconnect.
            log.error("[MQTT] Initial connection failed: {} — will retry automatically", e.getMessage());
        }

        return client;
    }
}
