package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {

    private Long id;
    private String code;
    private String name;
    private String nameSi;
    private String description;
    private Boolean isSystemRole;
    private Boolean isDefault;
    private Integer priorityLevel;
    private String color;
    private Boolean isActive;
    private Set<PermissionResponse> permissions;
    private LocalDateTime createdAt;
}

