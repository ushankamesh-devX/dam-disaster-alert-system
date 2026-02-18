package com.ddas.api.mapper;

import com.ddas.api.dto.response.PermissionResponse;
import com.ddas.api.dto.response.RoleResponse;
import com.ddas.api.dto.response.UserResponse;
import com.ddas.api.entity.Permission;
import com.ddas.api.entity.Role;
import com.ddas.api.entity.User;
import org.springframework.stereotype.Component;

import java.util.stream.Collectors;

@Component
public class UserMapper {

    public UserResponse toUserResponse(User user) {
        if (user == null) {
            return null;
        }

        return UserResponse.builder()
                .id(user.getId())
                .uuid(user.getUuid())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(user.getAvatarUrl())
                .status(user.getStatus() != null ? user.getStatus().name() : null)
                .languagePreference(user.getLanguagePreference() != null ? user.getLanguagePreference().name() : null)
                .notificationEnabled(user.getNotificationEnabled())
                .role(toRoleResponse(user.getRole()))
                .lastKnownLatitude(user.getLastKnownLatitude())
                .lastKnownLongitude(user.getLastKnownLongitude())
                .lastLocationUpdate(user.getLastLocationUpdate())
                .emailVerifiedAt(user.getEmailVerifiedAt())
                .phoneVerifiedAt(user.getPhoneVerifiedAt())
                .lastLoginAt(user.getLastLoginAt())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public RoleResponse toRoleResponse(Role role) {
        if (role == null) {
            return null;
        }

        return RoleResponse.builder()
                .id(role.getId())
                .code(role.getCode())
                .name(role.getName())
                .nameSi(role.getNameSi())
                .description(role.getDescription())
                .isSystemRole(role.getIsSystemRole())
                .isDefault(role.getIsDefault())
                .priorityLevel(role.getPriorityLevel())
                .color(role.getColor())
                .isActive(role.getIsActive())
                .permissions(role.getPermissions() != null
                        ? role.getPermissions().stream()
                                .map(this::toPermissionResponse)
                                .collect(Collectors.toSet())
                        : null)
                .createdAt(role.getCreatedAt())
                .build();
    }

    public PermissionResponse toPermissionResponse(Permission permission) {
        if (permission == null) {
            return null;
        }

        return PermissionResponse.builder()
                .id(permission.getId())
                .code(permission.getCode())
                .name(permission.getName())
                .description(permission.getDescription())
                .module(permission.getModule())
                .action(permission.getAction())
                .isActive(permission.getIsActive())
                .build();
    }
}

