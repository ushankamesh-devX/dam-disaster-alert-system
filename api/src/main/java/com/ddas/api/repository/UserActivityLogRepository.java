package com.ddas.api.repository;

import com.ddas.api.entity.User;
import com.ddas.api.entity.UserActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, Long> {

    Page<UserActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<UserActivityLog> findByUserIdAndActivityType(Long userId, UserActivityLog.ActivityType activityType);

    List<UserActivityLog> findByUserIdAndCreatedAtBetween(Long userId, LocalDateTime start, LocalDateTime end);

    Page<UserActivityLog> findByActivityTypeOrderByCreatedAtDesc(UserActivityLog.ActivityType activityType, Pageable pageable);
}
