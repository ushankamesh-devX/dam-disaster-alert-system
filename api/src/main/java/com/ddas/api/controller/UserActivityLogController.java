package com.ddas.api.controller;

import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.UserActivityLogResponse;
import com.ddas.api.security.UserPrincipal;
import com.ddas.api.service.UserActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user-activities")
@RequiredArgsConstructor
public class UserActivityLogController {

    private final UserActivityLogService activityLogService;

    /**
     * Get current user's activity logs
     */
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<UserActivityLogResponse>>> getCurrentUserActivities(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserActivityLogResponse> activities = activityLogService.getUserActivities(
                userPrincipal.getUser().getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Activity logs retrieved", activities));
    }

    /**
     * Get activity logs for a specific user (Admin only)
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyAuthority('users.view', 'users.manage')")
    public ResponseEntity<ApiResponse<Page<UserActivityLogResponse>>> getUserActivities(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserActivityLogResponse> activities = activityLogService.getUserActivities(userId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Activity logs retrieved", activities));
    }

    /**
     * Get activity logs by type (Admin only)
     */
    @GetMapping("/by-type/{activityType}")
    @PreAuthorize("hasAnyAuthority('users.view', 'users.manage')")
    public ResponseEntity<ApiResponse<Page<UserActivityLogResponse>>> getActivitiesByType(
            @PathVariable String activityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<UserActivityLogResponse> activities = activityLogService.getActivitiesByType(
                com.ddas.api.entity.UserActivityLog.ActivityType.valueOf(activityType), pageable);
        return ResponseEntity.ok(ApiResponse.success("Activity logs by type retrieved", activities));
    }
}
