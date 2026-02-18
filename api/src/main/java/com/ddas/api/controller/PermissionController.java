package com.ddas.api.controller;

import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.PermissionResponse;
import com.ddas.api.entity.Permission;
import com.ddas.api.mapper.UserMapper;
import com.ddas.api.repository.PermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final PermissionRepository permissionRepository;
    private final UserMapper userMapper;

    /**
     * Get all permissions
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('users.manage', 'settings.manage')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getAllPermissions() {
        List<Permission> permissions = permissionRepository.findAll();
        List<PermissionResponse> permissionResponses = permissions.stream()
                .map(userMapper::toPermissionResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Permissions retrieved successfully", permissionResponses));
    }

    /**
     * Get permission by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('users.manage', 'settings.manage')")
    public ResponseEntity<ApiResponse<PermissionResponse>> getPermissionById(@PathVariable Long id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Permission not found with id: " + id));
        PermissionResponse permissionResponse = userMapper.toPermissionResponse(permission);
        return ResponseEntity.ok(ApiResponse.success("Permission retrieved successfully", permissionResponse));
    }

    /**
     * Get permissions by module
     */
    @GetMapping("/by-module/{module}")
    @PreAuthorize("hasAnyAuthority('users.manage', 'settings.manage')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getPermissionsByModule(@PathVariable String module) {
        List<Permission> permissions = permissionRepository.findByModule(module);
        List<PermissionResponse> permissionResponses = permissions.stream()
                .map(userMapper::toPermissionResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Permissions by module retrieved successfully", permissionResponses));
    }

    /**
     * Get active permissions
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyAuthority('users.manage', 'settings.manage')")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> getActivePermissions() {
        List<Permission> permissions = permissionRepository.findByIsActiveTrue();
        List<PermissionResponse> permissionResponses = permissions.stream()
                .map(userMapper::toPermissionResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Active permissions retrieved successfully", permissionResponses));
    }
}
