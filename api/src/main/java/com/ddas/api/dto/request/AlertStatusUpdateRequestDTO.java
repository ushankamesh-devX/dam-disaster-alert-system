package com.ddas.api.dto.request;

import com.ddas.api.entity.Alert;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AlertStatusUpdateRequestDTO {

    @NotNull(message = "status is required")
    private Alert.AlertStatus status;
}
