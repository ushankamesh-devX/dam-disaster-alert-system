package com.ddas.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRegionRequest {
    @NotBlank(message = "Region name is required")
    @Size(max = 100, message = "Name must be less than 100 characters")
    private String name;
    
    @Size(max = 100, message = "Sinhala name must be less than 100 characters")
    private String nameSi;
    
    @Size(max = 100, message = "Tamil name must be less than 100 characters")
    private String nameTa;
    
    @Size(max = 100, message = "State/Province must be less than 100 characters")
    private String stateProvince;
    
    @Size(max = 100, message = "Country must be less than 100 characters")
    private String country;
    
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String boundaryGeojson;
}
