package com.ddas.api.dto.request;

import com.ddas.api.entity.DamGate;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDamGateRequest {
    @NotNull(message = "Dam ID is required")
    private Long damId;
    
    @NotBlank(message = "Gate number is required")
    @Size(max = 20, message = "Gate number must be less than 20 characters")
    private String gateNumber;
    
    private DamGate.GateType gateType;
    
    @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;
    
    @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;
    
    @NotNull(message = "Max opening is required")
    @DecimalMin(value = "0", message = "Max opening must be positive")
    private BigDecimal maxOpeningMeters;
    
    @DecimalMin(value = "0", message = "Current opening must be positive")
    private BigDecimal currentOpeningMeters;
    
    private DamGate.GateStatus status;
}
