package com.ddas.api.repository;

import com.ddas.api.entity.AdminSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdminSessionRepository extends JpaRepository<AdminSession, Long> {

    Optional<AdminSession> findBySessionToken(String sessionToken);

    List<AdminSession> findByUserId(Long userId);

    @Query("SELECT s FROM AdminSession s WHERE s.sessionToken = :token AND s.expiresAt > :now")
    Optional<AdminSession> findValidSession(String token, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM AdminSession s WHERE s.expiresAt < :now")
    void deleteExpiredSessions(LocalDateTime now);

    @Modifying
    @Query("DELETE FROM AdminSession s WHERE s.user.id = :userId")
    void deleteAllByUserId(Long userId);
}
