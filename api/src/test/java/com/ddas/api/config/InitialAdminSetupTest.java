package com.ddas.api.config;

import com.ddas.api.entity.Role;
import com.ddas.api.entity.User;
import com.ddas.api.repository.RoleRepository;
import com.ddas.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InitialAdminSetupTest {
    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final MockEnvironment env = new MockEnvironment();
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final InitialAdminSetup setup = new InitialAdminSetup(users, roles, encoder, env);

    private void credentials() {
        env.setProperty("DDAS_ADMIN_EMAIL", "first-admin@example.invalid");
        env.setProperty("DDAS_ADMIN_PASSWORD", "Test-password-123!");
    }

    @Test
    void createsAdministratorWithHashedEnvironmentPassword() {
        credentials();
        Role role = new Role();
        role.setCode("SUPER_ADMIN");
        when(roles.findByCode("SUPER_ADMIN")).thenReturn(Optional.of(role));
        setup.run(null);
        ArgumentCaptor<User> created = ArgumentCaptor.forClass(User.class);
        verify(users).save(created.capture());
        User user = created.getValue();
        assertEquals("first-admin@example.invalid", user.getEmail());
        assertEquals(User.UserStatus.active, user.getStatus());
        assertSame(role, user.getRole());
        assertTrue(encoder.matches("Test-password-123!", user.getPasswordHash()));
        assertNotEquals("Test-password-123!", user.getPasswordHash());
    }

    @Test
    void repeatRunDoesNotChangeExistingAdministrator() {
        credentials();
        when(users.existsInitialAdministrator()).thenReturn(true);
        setup.run(null);
        verify(users, never()).save(any());
        verifyNoInteractions(roles);
    }

    @Test
    void blankConfigurationDoesNotCreateAccount() {
        setup.run(null);
        verify(users, never()).save(any());
    }

    @Test
    void missingPasswordFailsWithoutCreatingAccount() {
        env.setProperty("DDAS_ADMIN_EMAIL", "first-admin@example.invalid");
        assertThrows(IllegalStateException.class, () -> setup.run(null));
        verify(users, never()).save(any());
    }

    @Test
    void existingEmailIsNotPromotedOrOverwritten() {
        credentials();
        when(users.existsByEmail("first-admin@example.invalid")).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> setup.run(null));
        verify(users, never()).save(any());
    }

    @Test
    void rejectsPasswordOverBcryptByteLimit() {
        credentials();
        env.setProperty("DDAS_ADMIN_PASSWORD", "é".repeat(37));
        assertThrows(IllegalStateException.class, () -> setup.run(null));
        verify(users, never()).save(any());
    }
}
