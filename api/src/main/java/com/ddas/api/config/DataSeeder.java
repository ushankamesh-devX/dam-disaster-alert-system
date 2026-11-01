package com.ddas.api.config;

import com.ddas.api.entity.Permission;
import com.ddas.api.entity.Role;
import com.ddas.api.entity.User;
import com.ddas.api.repository.PermissionRepository;
import com.ddas.api.repository.RoleRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        System.out.println("--- DataSeeder is running ---");
        log.info("--- DataSeeder is running ---");

        seedPermissionsAndRoles();
        seedUsers();

        System.out.println("--- DataSeeder completed successfully ---");
        log.info("--- DataSeeder completed successfully ---");
    }

    private void seedPermissionsAndRoles() {
        List<PermissionDef> defs = List.of(
                new PermissionDef("users.view", "View Users", "View user list and details", "users", "view"),
                new PermissionDef("users.create", "Create Users", "Create new users", "users", "create"),
                new PermissionDef("users.edit", "Edit Users", "Edit user information", "users", "edit"),
                new PermissionDef("users.delete", "Delete Users", "Delete users", "users", "delete"),
                new PermissionDef("dams.view", "View Dams", "View dam list and details", "dams", "view"),
                new PermissionDef("dams.create", "Create Dams", "Create new dams", "dams", "create"),
                new PermissionDef("dams.edit", "Edit Dams", "Edit dam information", "dams", "edit"),
                new PermissionDef("dams.delete", "Delete Dams", "Delete dams", "dams", "delete"),
                new PermissionDef("alerts.view", "View Alerts", "View alert list and details", "alerts", "view"),
                new PermissionDef("alerts.create", "Create Alerts", "Create new alerts", "alerts", "create"),
                new PermissionDef("alerts.edit", "Edit Alerts", "Edit alert information", "alerts", "edit"),
                new PermissionDef("alerts.delete", "Delete Alerts", "Delete alerts", "alerts", "delete"),
                new PermissionDef("reports.view", "View Reports", "View reports", "reports", "view"),
                new PermissionDef("reports.create", "Create Reports", "Create reports", "reports", "create"),
                new PermissionDef("settings.view", "View Settings", "View system settings", "settings", "view"),
                new PermissionDef("settings.manage", "Manage Settings", "Manage system settings", "settings", "manage"),
                new PermissionDef("ml.data.read", "Read ML Data", "Read dam/sensor data for ML service", "ml", "read")
        );

        Map<String, Permission> permissionMap = new HashMap<>();
        for (PermissionDef def : defs) {
            Permission p = permissionRepository.findByCode(def.code)
                    .orElseGet(() -> permissionRepository.save(Permission.builder()
                            .code(def.code)
                            .name(def.name)
                            .description(def.description)
                            .module(def.module)
                            .action(def.action)
                            .isActive(true)
                            .build()));
            permissionMap.put(def.code, p);
        }

        createRoleIfNotFound("SUPER_ADMIN", "Super Administrator", "සුපිරි පරිපාලක",
                "Full system access with all permissions", true, false, 100, "#e74c3c",
                new HashSet<>(permissionMap.values()));

        Set<Permission> adminPerms = new HashSet<>();
        for (String code : List.of("users.view", "users.create", "users.edit",
                "dams.view", "dams.create", "dams.edit",
                "alerts.view", "alerts.create", "alerts.edit", "alerts.delete",
                "reports.view", "reports.create", "settings.view")) {
            if (permissionMap.containsKey(code)) {
                adminPerms.add(permissionMap.get(code));
            }
        }
        createRoleIfNotFound("ADMIN", "Administrator", "පරිපාලක",
                "System administrator with management permissions", true, false, 90, "#3498db",
                adminPerms);

        Set<Permission> operatorPerms = new HashSet<>();
        for (String code : List.of("dams.view", "dams.edit", "alerts.view", "alerts.create", "reports.view", "reports.create")) {
            if (permissionMap.containsKey(code)) {
                operatorPerms.add(permissionMap.get(code));
            }
        }
        createRoleIfNotFound("DAM_OPERATOR", "Dam Operator", "වේලි ක්‍රියාකරු",
                "Dam facility operator", true, false, 70, "#f39c12",
                operatorPerms);

        Set<Permission> userPerms = new HashSet<>();
        for (String code : List.of("dams.view", "alerts.view", "reports.view")) {
            if (permissionMap.containsKey(code)) {
                userPerms.add(permissionMap.get(code));
            }
        }
        createRoleIfNotFound("NORMAL_USER", "Normal User", "සාමාන්‍ය පරිශීලක",
                "Regular system user", true, true, 10, "#95a5a6",
                userPerms);
    }

    private Role createRoleIfNotFound(String code, String name, String nameSi, String description,
                                      boolean isSystemRole, boolean isDefault, int priorityLevel,
                                      String color, Set<Permission> permissions) {
        return roleRepository.findByCode(code).orElseGet(() -> {
            Role role = Role.builder()
                    .code(code)
                    .name(name)
                    .nameSi(nameSi)
                    .description(description)
                    .isSystemRole(isSystemRole)
                    .isDefault(isDefault)
                    .priorityLevel(priorityLevel)
                    .color(color)
                    .isActive(true)
                    .permissions(permissions)
                    .build();
            Role saved = roleRepository.save(role);
            log.info("Created role: {}", code);
            return saved;
        });
    }

    private void seedUsers() {
        Role superAdminRole = roleRepository.findByCode("SUPER_ADMIN")
                .orElseThrow(() -> new IllegalStateException("SUPER_ADMIN role not found"));

        // 1. admin@ddas.gov.lk
        createUserIfNotFound(
                "System Administrator",
                "admin@ddas.gov.lk",
                "+94712345678",
                "Admin@123",
                superAdminRole
        );

        // 2. niduk16962@gmail.com
        createUserIfNotFound(
                "Niduka Akalanka",
                "niduk16962@gmail.com",
                "+94770000000",
                "Admin@123",
                superAdminRole
        );
    }

    private void createUserIfNotFound(String name, String email, String phone, String rawPassword, Role role) {
        if (!userRepository.existsByEmail(email)) {
            User user = User.builder()
                    .uuid(UUID.randomUUID().toString())
                    .fullName(name)
                    .email(email)
                    .phoneNumber(phone)
                    .passwordHash(passwordEncoder.encode(rawPassword))
                    .role(role)
                    .status(User.UserStatus.active)
                    .languagePreference(User.Language.en)
                    .notificationEnabled(true)
                    .emailVerifiedAt(LocalDateTime.now())
                    .build();
            userRepository.save(user);
            System.out.println("Seeded user: " + email + " (Password: " + rawPassword + ")");
            log.info("Seeded user: {} (Password: {})", email, rawPassword);
        } else {
            log.info("User {} already exists.", email);
        }
    }

    private record PermissionDef(String code, String name, String description, String module, String action) {}
}
