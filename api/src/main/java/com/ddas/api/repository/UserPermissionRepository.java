package com.ddas.api.repository;

import com.ddas.api.entity.UserPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    List<UserPermission> findByUserId(Long userId);

    Optional<UserPermission> findByUserIdAndPermissionId(Long userId, Long permissionId);

    @Query("SELECT up FROM UserPermission up WHERE up.user.id = :userId AND up.isGranted = true AND (up.expiresAt IS NULL OR up.expiresAt > :now)")
    List<UserPermission> findActiveGrantedPermissions(Long userId, LocalDateTime now);

    @Query("SELECT up FROM UserPermission up WHERE up.user.id = :userId AND up.isGranted = false AND (up.expiresAt IS NULL OR up.expiresAt > :now)")
    List<UserPermission> findActiveRevokedPermissions(Long userId, LocalDateTime now);

    void deleteByUserIdAndPermissionId(Long userId, Long permissionId);
}
