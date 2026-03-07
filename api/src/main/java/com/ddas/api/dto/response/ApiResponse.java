package com.ddas.api.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Standard API Response wrapper.
 * Handles both data payloads and simple status messages.
 * 
 * @param <T> The type of data contained in the response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;

    /**
     * Use when returning data with a default success message.
     */
    public static <T> ApiResponse<T> success(T data) {
        return success("Operation successful", data);
    }

    /**
     * Use when returning data with a custom success message.
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Use when returning ONLY a success message (no data).
     * This avoids type inference conflicts with data-only success methods.
     */
    public static ApiResponse<Void> message(String message) {
        return ApiResponse.<Void>builder()
                .success(true)
                .message(message)
                .data(null)
                .timestamp(LocalDateTime.now())
                .build();
    }

    /**
     * Error response with custom message.
     */
    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
