package com.ddas.api.repository;

import com.ddas.api.entity.UserRoleHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleHistoryRepository extends JpaRepository<UserRoleHistory, Long> {

    Page<UserRoleHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<UserRoleHistory> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<UserRoleHistory> findByChangedByIdOrderByCreatedAtDesc(Long changedById);
}
