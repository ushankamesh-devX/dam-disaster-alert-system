package com.ddas.api.config;

import com.ddas.api.entity.Role;
import com.ddas.api.entity.User;
import com.ddas.api.repository.RoleRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/** Creates the first administrator after schema setup, without changing existing accounts. */
@Component
@RequiredArgsConstructor
@Slf4j
public class InitialAdminSetup implements ApplicationRunner {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.existsInitialAdministrator()) {
            return;
        }
        String email = environment.getProperty("DDAS_ADMIN_EMAIL", "").trim();
        String password = environment.getProperty("DDAS_ADMIN_PASSWORD", "");
        String name = environment.getProperty("DDAS_ADMIN_NAME", "DDAS Administrator").trim();
        if (email.isEmpty() && password.isEmpty()) {
            log.info("Initial administrator setup skipped: configure DDAS_ADMIN_EMAIL and DDAS_ADMIN_PASSWORD to enable it.");
            return;
        }
        if (!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") || email.length() > 255
                || password.isBlank() || password.length() < 8
                || password.getBytes(StandardCharsets.UTF_8).length > 72
                || name.isEmpty() || name.length() > 100) {
            throw new IllegalStateException("Invalid initial administrator configuration: provide DDAS_ADMIN_EMAIL, "
                    + "DDAS_ADMIN_PASSWORD (at least 8 characters, at most 72 UTF-8 bytes), "
                    + "and DDAS_ADMIN_NAME (1-100 characters).");
        }
        if (users.existsByEmail(email)) {
            throw new IllegalStateException("Initial administrator email is already registered; "
                    + "existing accounts are never promoted or overwritten by setup.");
        }
        Role role = roles.findByCode("SUPER_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role is missing; run schema setup first."));
        users.save(User.builder()
                .uuid(UUID.randomUUID().toString())
                .fullName(name)
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .status(User.UserStatus.active)
                .languagePreference(User.Language.en)
                .notificationEnabled(true)
                .build());
        log.info("Initial administrator account created from environment configuration.");
    }
}
