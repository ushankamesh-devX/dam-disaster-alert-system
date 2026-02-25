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
    
    @NotNull(message = "Max opening is required")
    @DecimalMin(value = "0", message = "Max opening must be positive")
    private BigDecimal maxOpeningMeters;
    
    @DecimalMin(value = "0", message = "Current opening must be positive")
    private BigDecimal currentOpeningMeters;
    
    private DamGate.GateStatus status;
}
