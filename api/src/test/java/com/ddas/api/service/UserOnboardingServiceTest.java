package com.ddas.api.service;

import com.ddas.api.dto.request.UpdateProfileRequest;
import com.ddas.api.entity.Dam;
import com.ddas.api.entity.User;
import com.ddas.api.exception.BadRequestException;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.mapper.UserMapper;
import com.ddas.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.LocalDateTime;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserOnboardingServiceTest {
    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock UserActivityLogRepository activity;
    @Mock UserRoleHistoryRepository history;
    @Mock PasswordEncoder passwords;
    @Mock DamRepository dams;
    @Spy UserMapper mapper = new UserMapper();
    @InjectMocks UserService service;
    private User user;
    @BeforeEach void setup() {
        user = User.builder().id(5L).fullName("Test User").build();
        when(users.findActiveUserById(5L)).thenReturn(Optional.of(user));
    }
    @Test void selectingDamSavesAccountPreferenceAndCompletesOnboarding() {
        when(dams.findById(6L)).thenReturn(Optional.of(Dam.builder().id(6L).status(Dam.DamStatus.operational).build()));
        when(users.save(user)).thenReturn(user);
        var response = service.updateProfile(5L, UpdateProfileRequest.builder().preferredDamId(6L).languagePreference("si").build());
        assertThat(response.getPreferredDamId()).isEqualTo(6L);
        assertThat(response.getOnboardingCompletedAt()).isNotNull();
        assertThat(response.getLanguagePreference()).isEqualTo("si");
        assertThat(user.getLastKnownLatitude()).isNull();
        assertThat(user.getLastKnownLongitude()).isNull();
    }
    @Test void nonexistentDamCannotBeSaved() {
        when(dams.findById(99L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.updateProfile(5L, UpdateProfileRequest.builder().preferredDamId(99L).build())).isInstanceOf(ResourceNotFoundException.class);
        verify(users, never()).save(any());
    }
    @Test void decommissionedDamCannotBeSaved() {
        when(dams.findById(6L)).thenReturn(Optional.of(Dam.builder().id(6L).status(Dam.DamStatus.decommissioned).build()));
        assertThatThrownBy(() -> service.updateProfile(5L, UpdateProfileRequest.builder().preferredDamId(6L).build())).isInstanceOf(BadRequestException.class);
        verify(users, never()).save(any());
    }
    @Test void changingDamPreservesOriginalCompletionTime() {
        var completed = LocalDateTime.of(2026, 10, 1, 12, 0);
        user.setOnboardingCompletedAt(completed);
        when(dams.findById(6L)).thenReturn(Optional.of(Dam.builder().id(6L).status(Dam.DamStatus.operational).build()));
        when(users.save(user)).thenReturn(user);
        assertThat(service.updateProfile(5L, UpdateProfileRequest.builder().preferredDamId(6L).build()).getOnboardingCompletedAt()).isEqualTo(completed);
    }
    @Test void profileEditAloneDoesNotCompleteOnboarding() {
        when(users.save(user)).thenReturn(user);
        var response = service.updateProfile(5L, UpdateProfileRequest.builder().fullName("Updated Name").build());
        assertThat(response.getOnboardingCompletedAt()).isNull();
        verifyNoInteractions(dams);
    }
}
