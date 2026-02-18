package com.ddas.api.repository;

import com.ddas.api.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByCode(String code);

    Optional<Role> findByIsDefaultTrue();

    List<Role> findByIsActiveTrue();

    List<Role> findByIsSystemRoleTrue();

    List<Role> findByIsActiveTrueOrderByPriorityLevelDesc();

    boolean existsByCode(String code);
}

