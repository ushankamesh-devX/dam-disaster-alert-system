package com.ddas.api.service;

import com.ddas.api.dto.request.*;
import com.ddas.api.dto.response.UserResponse;
import com.ddas.api.entity.*;
import com.ddas.api.exception.*;
import com.ddas.api.mapper.UserMapper;
import com.ddas.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserActivityLogRepository activityLogRepository;
    private final UserRoleHistoryRepository roleHistoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    // ==================== Profile Management ====================

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = userRepository.findActiveUserById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return userMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUuid(String uuid) {
        User user = userRepository.findActiveUserByUuid(uuid)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with uuid: " + uuid));
        return userMapper.toUserResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {
        User user = userRepository.findActiveUserByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Update only non-null fields
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName());
        }
        if (request.getPhoneNumber() != null) {
            // Check if phone number is already taken by another user
            if (!request.getPhoneNumber().isBlank() && 
                userRepository.existsByPhoneNumberAndIdNot(request.getPhoneNumber(), userId)) {
                throw new UserAlreadyExistsException("Phone number already registered: " + request.getPhoneNumber());
            }
            user.setPhoneNumber(request.getPhoneNumber().isBlank() ? null : request.getPhoneNumber());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().isBlank() ? null : request.getAvatarUrl());
        }
        if (request.getLanguagePreference() != null) {
            user.setLanguagePreference(parseLanguage(request.getLanguagePreference()));
        }
        if (request.getNotificationEnabled() != null) {
            user.setNotificationEnabled(request.getNotificationEnabled());
        }

        user = userRepository.save(user);
        
        // Log activity
        logActivity(user, UserActivityLog.ActivityType.profile_update, "Profile updated", null, null);
        
        log.info("User profile updated: {}", user.getEmail());
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public void updatePassword(Long userId, UpdatePasswordRequest request) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Validate current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new InvalidPasswordException("Current password is incorrect");
        }

        // Validate new password confirmation
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New password and confirm password do not match");
        }

        // Update password
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Log activity
        logActivity(user, UserActivityLog.ActivityType.password_change, "Password changed", null, null);

        log.info("Password updated for user: {}", user.getEmail());
    }

    @Transactional
    public UserResponse updateLocation(Long userId, UpdateLocationRequest request) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setLastKnownLatitude(request.getLatitude());
        user.setLastKnownLongitude(request.getLongitude());
        user.setLastLocationUpdate(LocalDateTime.now());

        user = userRepository.save(user);

        // Log activity
        logActivity(user, UserActivityLog.ActivityType.location_share, 
                   "Location updated: " + request.getLatitude() + ", " + request.getLongitude(), null, null);

        log.info("Location updated for user: {}", user.getEmail());
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updatePushToken(Long userId, UpdatePushTokenRequest request) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setPushToken(request.getPushToken());
        user = userRepository.save(user);

        log.info("Push token updated for user: {}", user.getEmail());
        return userMapper.toUserResponse(user);
    }

    // ==================== User Listing & Search ====================

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAllActiveUsers(pageable)
                .map(userMapper::toUserResponse);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsersAsList() {
        return userRepository.findAllActiveUsers().stream()
                .map(userMapper::toUserResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> searchUsers(String search, Pageable pageable) {
        return userRepository.searchUsers(search, pageable)
                .map(userMapper::toUserResponse);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersByRole(Long roleId, Pageable pageable) {
        return userRepository.findByRoleId(roleId, pageable)
                .map(userMapper::toUserResponse);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersByRoleCode(String roleCode, Pageable pageable) {
        return userRepository.findByRoleCode(roleCode, pageable)
                .map(userMapper::toUserResponse);
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getUsersByStatus(String status, Pageable pageable) {
        User.UserStatus userStatus = User.UserStatus.valueOf(status);
        return userRepository.findByStatus(userStatus, pageable)
                .map(userMapper::toUserResponse);
    }

    // ==================== Admin Operations ====================

    @Transactional
    public UserResponse createUser(AdminCreateUserRequest request, Long createdById) {
        log.info("Admin creating user with email: {}", request.getEmail());

        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        if (request.getPhoneNumber() != null && userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new UserAlreadyExistsException("Phone number already registered: " + request.getPhoneNumber());
        }

        // Get role
        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + request.getRoleId()));

        // Create new user
        User user = User.builder()
                .uuid(UUID.randomUUID().toString())
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .status(parseStatus(request.getStatus()))
                .languagePreference(parseLanguage(request.getLanguagePreference()))
                .notificationEnabled(true)
                .build();

        user = userRepository.save(user);
        log.info("User created by admin: {}", user.getEmail());

        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updateUserStatus(Long userId, UpdateUserStatusRequest request, Long updatedById) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        User.UserStatus newStatus = User.UserStatus.valueOf(request.getStatus());
        User.UserStatus oldStatus = user.getStatus();

        user.setStatus(newStatus);
        user = userRepository.save(user);

        // Log activity
        logActivity(user, UserActivityLog.ActivityType.profile_update, 
                   "Status changed from " + oldStatus + " to " + newStatus + 
                   (request.getReason() != null ? ". Reason: " + request.getReason() : ""), 
                   null, null);

        log.info("User status updated: {} -> {} for user: {}", oldStatus, newStatus, user.getEmail());
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public UserResponse updateUserRole(Long userId, UpdateUserRoleRequest request, Long updatedById) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Role newRole = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + request.getRoleId()));

        User updatedBy = userRepository.findById(updatedById)
                .orElseThrow(() -> new ResourceNotFoundException("Updater user not found"));

        Role oldRole = user.getRole();

        // Create role history entry
        UserRoleHistory history = UserRoleHistory.builder()
                .user(user)
                .oldRole(oldRole)
                .newRole(newRole)
                .changedBy(updatedBy)
                .reason(request.getReason())
                .build();
        roleHistoryRepository.save(history);

        // Update user role
        user.setRole(newRole);
        user = userRepository.save(user);

        // Log activity
        logActivity(user, UserActivityLog.ActivityType.role_change,
                   "Role changed from " + oldRole.getName() + " to " + newRole.getName() +
                   (request.getReason() != null ? ". Reason: " + request.getReason() : ""),
                   null, null);

        log.info("User role updated: {} -> {} for user: {}", oldRole.getCode(), newRole.getCode(), user.getEmail());
        return userMapper.toUserResponse(user);
    }

    @Transactional
    public void softDeleteUser(Long userId, Long deletedById) {
        User user = userRepository.findActiveUserById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setDeletedAt(LocalDateTime.now());
        user.setStatus(User.UserStatus.inactive);
        userRepository.save(user);

        log.info("User soft deleted: {}", user.getEmail());
    }

    @Transactional
    public UserResponse restoreUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (user.getDeletedAt() == null) {
            throw new BadRequestException("User is not deleted");
        }

        user.setDeletedAt(null);
        user.setStatus(User.UserStatus.active);
        user = userRepository.save(user);

        log.info("User restored: {}", user.getEmail());
        return userMapper.toUserResponse(user);
    }

    // ==================== Statistics ====================

    @Transactional(readOnly = true)
    public long countUsersByStatus(String status) {
        return userRepository.countByStatus(User.UserStatus.valueOf(status));
    }

    @Transactional(readOnly = true)
    public long countUsersByRole(Long roleId) {
        return userRepository.countByRoleId(roleId);
    }

    // ==================== Notification Related ====================

    @Transactional(readOnly = true)
    public List<User> getUsersWithPushNotifications() {
        return userRepository.findUsersWithPushNotificationsEnabled();
    }

    @Transactional(readOnly = true)
    public List<User> getUsersWithLocation() {
        return userRepository.findUsersWithLocation();
    }

    // ==================== Helper Methods ====================

    private void logActivity(User user, UserActivityLog.ActivityType type, String description, 
                            String ipAddress, String deviceInfo) {
        UserActivityLog log = UserActivityLog.builder()
                .user(user)
                .activityType(type)
                .description(description)
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .build();
        activityLogRepository.save(log);
    }

    private User.Language parseLanguage(String language) {
        if (language == null || language.isBlank()) {
            return User.Language.en;
        }
        try {
            return User.Language.valueOf(language.toLowerCase());
        } catch (IllegalArgumentException e) {
            return User.Language.en;
        }
    }

    private User.UserStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return User.UserStatus.active;
        }
        try {
            return User.UserStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            return User.UserStatus.active;
        }
    }
}
