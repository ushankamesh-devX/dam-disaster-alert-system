package com.ddas.api.dto.response;

import com.ddas.api.entity.DamGate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamGateResponse {
    private Long id;
    private Long damId;
    private String damName;
    private String gateNumber;
    private DamGate.GateType gateType;
    private BigDecimal maxOpeningMeters;
    private BigDecimal currentOpeningMeters;
    private DamGate.GateStatus status;
    private LocalDateTime lastOperationAt;
    private Long operatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
