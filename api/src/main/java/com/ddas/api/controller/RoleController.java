package com.ddas.api.controller;

import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.RoleResponse;
import com.ddas.api.entity.Role;
import com.ddas.api.mapper.UserMapper;
import com.ddas.api.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleRepository roleRepository;
    private final UserMapper userMapper;

    /**
     * Get all roles
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        List<RoleResponse> roleResponses = roles.stream()
                .map(userMapper::toRoleResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Roles retrieved successfully", roleResponses));
    }

    /**
     * Get role by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleById(@PathVariable Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + id));
        RoleResponse roleResponse = userMapper.toRoleResponse(role);
        return ResponseEntity.ok(ApiResponse.success("Role retrieved successfully", roleResponse));
    }

    /**
     * Get role by code
     */
    @GetMapping("/code/{code}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RoleResponse>> getRoleByCode(@PathVariable String code) {
        Role role = roleRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Role not found with code: " + code));
        RoleResponse roleResponse = userMapper.toRoleResponse(role);
        return ResponseEntity.ok(ApiResponse.success("Role retrieved successfully", roleResponse));
    }

    /**
     * Get default role
     */
    @GetMapping("/default")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<RoleResponse>> getDefaultRole() {
        Role role = roleRepository.findByIsDefaultTrue()
                .orElseThrow(() -> new RuntimeException("Default role not found"));
        RoleResponse roleResponse = userMapper.toRoleResponse(role);
        return ResponseEntity.ok(ApiResponse.success("Default role retrieved successfully", roleResponse));
    }
}
