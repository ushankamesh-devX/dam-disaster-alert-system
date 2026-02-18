package com.ddas.api.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePushTokenRequest {

    @NotBlank(message = "Push token is required")
    @Size(max = 500, message = "Push token must not exceed 500 characters")
    private String pushToken;
}
