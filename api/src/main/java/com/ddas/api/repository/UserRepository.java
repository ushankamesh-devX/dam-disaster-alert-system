package com.ddas.api.repository;

import com.ddas.api.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUuid(String uuid);

    Optional<User> findByPhoneNumber(String phoneNumber);

    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findActiveUserByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.id = :id AND u.deletedAt IS NULL")
    Optional<User> findActiveUserById(@Param("id") Long id);

    @Query("SELECT u FROM User u WHERE u.uuid = :uuid AND u.deletedAt IS NULL")
    Optional<User> findActiveUserByUuid(@Param("uuid") String uuid);

    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL")
    Page<User> findAllActiveUsers(Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL")
    List<User> findAllActiveUsers();

    @Query("SELECT u FROM User u WHERE u.role.id = :roleId AND u.deletedAt IS NULL")
    Page<User> findByRoleId(@Param("roleId") Long roleId, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.role.code = :roleCode AND u.deletedAt IS NULL")
    Page<User> findByRoleCode(@Param("roleCode") String roleCode, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.status = :status AND u.deletedAt IS NULL")
    Page<User> findByStatus(@Param("status") User.UserStatus status, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.deletedAt IS NULL AND " +
           "(LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "u.phoneNumber LIKE CONCAT('%', :search, '%'))")
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query("SELECT u FROM User u WHERE u.notificationEnabled = true AND u.pushToken IS NOT NULL AND u.deletedAt IS NULL")
    List<User> findUsersWithPushNotificationsEnabled();

    @Query("SELECT u FROM User u WHERE u.lastKnownLatitude IS NOT NULL AND u.lastKnownLongitude IS NOT NULL AND u.deletedAt IS NULL")
    List<User> findUsersWithLocation();

    @Query("SELECT COUNT(u) FROM User u WHERE u.status = :status AND u.deletedAt IS NULL")
    long countByStatus(@Param("status") User.UserStatus status);

    @Query("SELECT COUNT(u) FROM User u WHERE u.role.id = :roleId AND u.deletedAt IS NULL")
    long countByRoleId(@Param("roleId") Long roleId);

    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :userId")
    void updateStatus(@Param("userId") Long userId, @Param("status") User.UserStatus status);

    boolean existsByEmailAndIdNot(String email, Long id);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);
}

