package com.ddas.api.repository;

import com.ddas.api.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByCode(String code);

    List<Permission> findByModule(String module);

    List<Permission> findByAction(String action);

    List<Permission> findByModuleAndAction(String module, String action);

    List<Permission> findByIsActiveTrue();

    List<Permission> findByModuleAndIsActiveTrue(String module);
}

