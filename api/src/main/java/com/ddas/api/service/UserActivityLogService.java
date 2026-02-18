package com.ddas.api.service;

import com.ddas.api.dto.response.UserActivityLogResponse;
import com.ddas.api.entity.User;
import com.ddas.api.entity.UserActivityLog;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.repository.UserActivityLogRepository;
import com.ddas.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserActivityLogService {

    private final UserActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void logActivity(Long userId, UserActivityLog.ActivityType activityType, 
                           String description, String ipAddress, String deviceInfo) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        
        UserActivityLog activityLog = UserActivityLog.builder()
                .user(user)
                .activityType(activityType)
                .description(description)
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .build();
        
        activityLogRepository.save(activityLog);
        log.debug("Activity logged for user {}: {}", userId, activityType);
    }

    @Transactional
    public void logActivity(User user, UserActivityLog.ActivityType activityType, 
                           String description, String ipAddress, String deviceInfo) {
        UserActivityLog activityLog = UserActivityLog.builder()
                .user(user)
                .activityType(activityType)
                .description(description)
                .ipAddress(ipAddress)
                .deviceInfo(deviceInfo)
                .build();
        
        activityLogRepository.save(activityLog);
        log.debug("Activity logged for user {}: {}", user.getId(), activityType);
    }

    @Transactional(readOnly = true)
    public Page<UserActivityLogResponse> getUserActivities(Long userId, Pageable pageable) {
        return activityLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<UserActivityLog> getUserActivitiesByType(Long userId, UserActivityLog.ActivityType activityType) {
        return activityLogRepository.findByUserIdAndActivityType(userId, activityType);
    }

    @Transactional(readOnly = true)
    public List<UserActivityLog> getUserActivitiesBetweenDates(Long userId, LocalDateTime start, LocalDateTime end) {
        return activityLogRepository.findByUserIdAndCreatedAtBetween(userId, start, end);
    }

    @Transactional(readOnly = true)
    public Page<UserActivityLogResponse> getActivitiesByType(UserActivityLog.ActivityType activityType, Pageable pageable) {
        return activityLogRepository.findByActivityTypeOrderByCreatedAtDesc(activityType, pageable)
                .map(this::toResponse);
    }

    private UserActivityLogResponse toResponse(UserActivityLog log) {
        return UserActivityLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser().getId())
                .userEmail(log.getUser().getEmail())
                .userFullName(log.getUser().getFullName())
                .activityType(log.getActivityType().name())
                .description(log.getDescription())
                .ipAddress(log.getIpAddress())
                .deviceInfo(log.getDeviceInfo())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
