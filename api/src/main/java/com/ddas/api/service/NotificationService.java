package com.ddas.api.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Sends push notifications via Firebase Cloud Messaging (FCM).
 * <p>
 * All send operations are fire-and-forget from the caller's perspective:
 * failures are logged but never propagate, so they cannot roll back an
 * enclosing {@code @Transactional} block.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    /**
     * Sends a push notification to a specific device token <em>or</em> topic.
     *
     * @param title        Notification title shown to the user
     * @param body         Notification body text
     * @param topicOrToken Either an FCM device registration token or a topic
     *                     name (prefixed with {@code /topics/})
     * @param data         Additional key-value payload (may be {@code null})
     */
    public void sendPushNotification(String title,
                                     String body,
                                     String topicOrToken,
                                     Map<String, String> data) {
        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message.Builder messageBuilder = Message.builder()
                    .setNotification(notification);

            // Route to topic or individual token
            if (topicOrToken != null && topicOrToken.startsWith("/topics/")) {
                messageBuilder.setTopic(topicOrToken.substring("/topics/".length()));
            } else if (topicOrToken != null) {
                messageBuilder.setToken(topicOrToken);
            }

            // Attach optional data payload
            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            String fcmMessageId = FirebaseMessaging.getInstance().send(messageBuilder.build());
            log.info("FCM notification sent successfully. messageId={}, target={}",
                    fcmMessageId, topicOrToken);

        } catch (FirebaseMessagingException ex) {
            log.error("Failed to send FCM notification. target={}, error={}, errorCode={}",
                    topicOrToken, ex.getMessage(), ex.getMessagingErrorCode(), ex);
        } catch (Exception ex) {
            // Catch-all so notification failures never crash the calling transaction
            log.error("Unexpected error sending FCM notification. target={}, error={}",
                    topicOrToken, ex.getMessage(), ex);
        }
    }

    /**
     * Convenience method that broadcasts a dam-alert notification to every
     * device subscribed to the topic {@code region_{regionId}}.
     *
     * @param title    Notification title
     * @param body     Notification body
     * @param regionId Target region — translated to topic {@code region_<id>}
     * @param alertId  Alert identifier included in the data payload
     * @param severity Alert severity level included in the data payload
     */
    public void sendRegionalAlertNotification(String title,
                                              String body,
                                              Long regionId,
                                              Long alertId,
                                              String severity) {
        String topic = "/topics/region_" + regionId;

        Map<String, String> data = new HashMap<>();
        data.put("alertId", alertId != null ? alertId.toString() : "");
        data.put("severity", severity != null ? severity : "");
        data.put("regionId", regionId != null ? regionId.toString() : "");

        log.debug("Sending regional alert notification. topic={}, alertId={}, severity={}",
                topic, alertId, severity);

        sendPushNotification(title, body, topic, data);
    }
}
