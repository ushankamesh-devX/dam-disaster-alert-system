package com.ddas.api.controller;

import com.ddas.api.dto.request.*;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.UserResponse;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // ==================== Current User Endpoints ====================

    /**
     * Get current authenticated user's profile
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserResponse userResponse = userService.getUserById(userPrincipal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("Current user retrieved", userResponse));
    }

    /**
     * Update current user's profile
     */
    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUserProfile(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse userResponse = userService.updateProfile(userPrincipal.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", userResponse));
    }

    /**
     * Update current user's password
     */
    @PutMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> updateCurrentUserPassword(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdatePasswordRequest request) {
        userService.updatePassword(userPrincipal.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully", null));
    }

    /**
     * Update current user's location
     */
    @PutMapping("/me/location")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUserLocation(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdateLocationRequest request) {
        UserResponse userResponse = userService.updateLocation(userPrincipal.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Location updated successfully", userResponse));
    }

    /**
     * Update current user's push notification token
     */
    @PutMapping("/me/push-token")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUserPushToken(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody UpdatePushTokenRequest request) {
        UserResponse userResponse = userService.updatePushToken(userPrincipal.getUser().getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Push token updated successfully", userResponse));
    }

    /**
     * Delete current user's account (soft delete)
     */
    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteCurrentUser(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        userService.softDeleteUser(userPrincipal.getUser().getId(), userPrincipal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }

    // ==================== User Listing Endpoints ====================

    /**
     * Get all users with pagination
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDirection) {
        
        Sort sort = sortDirection.equalsIgnoreCase("asc") 
                ? Sort.by(sortBy).ascending() 
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    /**
     * Get all users without pagination
     */
    @GetMapping("/all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getAllUsersList() {
        List<UserResponse> users = userService.getAllUsersAsList();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users));
    }

    /**
     * Search users by name, email, or phone
     */
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> searchUsers(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> users = userService.searchUsers(q, pageable);
        return ResponseEntity.ok(ApiResponse.success("Search results", users));
    }

    /**
     * Get users by role ID
     */
    @GetMapping("/by-role/{roleId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsersByRole(
            @PathVariable Long roleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> users = userService.getUsersByRole(roleId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Users by role retrieved", users));
    }

    /**
     * Get users by role code
     */
    @GetMapping("/by-role-code/{roleCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsersByRoleCode(
            @PathVariable String roleCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> users = userService.getUsersByRoleCode(roleCode, pageable);
        return ResponseEntity.ok(ApiResponse.success("Users by role code retrieved", users));
    }

    /**
     * Get users by status
     */
    @GetMapping("/by-status/{status}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsersByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserResponse> users = userService.getUsersByStatus(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Users by status retrieved", users));
    }

    // ==================== Individual User Endpoints ====================

    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long id) {
        UserResponse userResponse = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", userResponse));
    }

    /**
     * Get user by UUID
     */
    @GetMapping("/uuid/{uuid}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getUserByUuid(@PathVariable String uuid) {
        UserResponse userResponse = userService.getUserByUuid(uuid);
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", userResponse));
    }

    /**
     * Get user by email
     */
    @GetMapping("/email/{email}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserResponse>> getUserByEmail(@PathVariable String email) {
        UserResponse userResponse = userService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", userResponse));
    }

    // ==================== Admin Endpoints ====================

    /**
     * Create a new user (Admin only)
     */
    @PostMapping
    @PreAuthorize("hasAnyAuthority('users.create', 'users.manage')")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Valid @RequestBody AdminCreateUserRequest request) {
        UserResponse userResponse = userService.createUser(request, userPrincipal.getUser().getId());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", userResponse));
    }

    /**
     * Update user profile (Admin only)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('users.edit', 'users.manage')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserProfile(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse userResponse = userService.updateProfile(id, request);
        return ResponseEntity.ok(ApiResponse.success("User profile updated successfully", userResponse));
    }

    /**
     * Update user status (Admin only)
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyAuthority('users.edit', 'users.manage')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        UserResponse userResponse = userService.updateUserStatus(id, request, userPrincipal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("User status updated successfully", userResponse));
    }

    /**
     * Update user role (Admin only)
     */
    @PutMapping("/{id}/role")
    @PreAuthorize("hasAnyAuthority('users.edit', 'users.manage')")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserRole(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        UserResponse userResponse = userService.updateUserRole(id, request, userPrincipal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("User role updated successfully", userResponse));
    }

    /**
     * Delete user (Admin only - soft delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('users.delete', 'users.manage')")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long id) {
        userService.softDeleteUser(id, userPrincipal.getUser().getId());
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }

    /**
     * Restore deleted user (Admin only)
     */
    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyAuthority('users.edit', 'users.manage')")
    public ResponseEntity<ApiResponse<UserResponse>> restoreUser(@PathVariable Long id) {
        UserResponse userResponse = userService.restoreUser(id);
        return ResponseEntity.ok(ApiResponse.success("User restored successfully", userResponse));
    }

    // ==================== Statistics Endpoints ====================

    /**
     * Get user statistics
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyAuthority('users.view', 'users.manage')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUserStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalActive", userService.countUsersByStatus("active"));
        stats.put("totalInactive", userService.countUsersByStatus("inactive"));
        stats.put("totalSuspended", userService.countUsersByStatus("suspended"));
        stats.put("totalPending", userService.countUsersByStatus("pending_verification"));
        return ResponseEntity.ok(ApiResponse.success("User statistics", stats));
    }

    /**
     * Get user count by status
     */
    @GetMapping("/stats/by-status/{status}")
    @PreAuthorize("hasAnyAuthority('users.view', 'users.manage')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserCountByStatus(@PathVariable String status) {
        long count = userService.countUsersByStatus(status);
        Map<String, Long> result = new HashMap<>();
        result.put("count", count);
        return ResponseEntity.ok(ApiResponse.success("User count by status", result));
    }

    /**
     * Get user count by role
     */
    @GetMapping("/stats/by-role/{roleId}")
    @PreAuthorize("hasAnyAuthority('users.view', 'users.manage')")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserCountByRole(@PathVariable Long roleId) {
        long count = userService.countUsersByRole(roleId);
        Map<String, Long> result = new HashMap<>();
        result.put("count", count);
        return ResponseEntity.ok(ApiResponse.success("User count by role", result));
    }
}

