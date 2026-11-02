package com.ddas.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

/**
 * Initialises the Firebase Admin SDK on application startup.
 * <p>
 * Expects the service-account credentials file at
 * {@code src/main/resources/firebase-service-account.json}.
 * <p>
 * If {@link FirebaseApp} has already been initialised (e.g. during tests or
 * when the context is refreshed), the existing instance is returned instead of
 * creating a duplicate.
 */
@Configuration
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        // Guard: return the existing default app if one was already initialised
        if (!FirebaseApp.getApps().isEmpty()) {
            log.info("FirebaseApp already initialised – reusing existing instance.");
            return FirebaseApp.getInstance();
        }

        ClassPathResource resource = new ClassPathResource("firebase-service-account.json");

        try (InputStream serviceAccount = resource.getInputStream()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp app = FirebaseApp.initializeApp(options);
            log.info("FirebaseApp initialised successfully.");
            return app;
        }
    }
}
