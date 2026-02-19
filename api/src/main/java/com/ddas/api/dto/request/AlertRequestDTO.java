package com.ddas.api.dto.request;

import com.ddas.api.entity.Alert;
import com.ddas.api.entity.AlertType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AlertRequestDTO {

    @NotNull(message = "alertTypeId is required")
    private Long alertTypeId;

    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be at most 255 characters")
    private String title;

    @NotBlank(message = "message is required")
    private String message;

    @NotNull(message = "severity is required")
    private AlertType.AlertSeverity severity;

    private Alert.AlertStatus status;
    private Long damId;
    private Long regionId;
}
