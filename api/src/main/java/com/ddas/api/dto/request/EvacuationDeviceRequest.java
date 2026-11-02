package com.ddas.api.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvacuationDeviceRequest {

    /** From expo-notifications getExpoPushTokenAsync(): "ExponentPushToken[...]" */
    @NotBlank
    @Size(max = 255)
    private String expoPushToken;

    @NotNull
    @DecimalMin("-90")
    @DecimalMax("90")
    private Double lat;

    @NotNull
    @DecimalMin("-180")
    @DecimalMax("180")
    private Double lng;

    @Pattern(regexp = "walk|drive")
    @Builder.Default
    private String mode = "walk";

    /** Optional SMS fallback, e.g. +94771234567 */
    @Pattern(regexp = "\\+?[0-9]{9,15}")
    private String phone;
}
