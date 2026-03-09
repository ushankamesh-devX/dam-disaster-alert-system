package com.ddas.api.security;

import com.ddas.api.entity.DeviceApiKey;
import com.ddas.api.service.DeviceApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Filter that intercepts requests to /api/v1/device/** and validates
 * the X-Device-API-Key header for ESP32/IoT device authentication.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DeviceApiKeyAuthFilter extends OncePerRequestFilter {

    private final DeviceApiKeyService deviceApiKeyService;

    private static final String DEVICE_API_KEY_HEADER = "X-Device-API-Key";
    private static final String DEVICE_PATH_PREFIX = "/api/v1/device/";

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Only apply to device endpoints
        if (!path.startsWith(DEVICE_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String apiKey = request.getHeader(DEVICE_API_KEY_HEADER);

        if (apiKey == null || apiKey.isBlank()) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Missing X-Device-API-Key header");
            return;
        }

        try {
            DeviceApiKey key = deviceApiKeyService.validateApiKey(apiKey);

            // Store the validated key info in request attributes for the controller
            request.setAttribute("deviceApiKey", key);
            request.setAttribute("deviceApiKeyRaw", apiKey);

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            log.warn("Device API key validation failed: {}", e.getMessage());
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, e.getMessage());
        }
    }

    private void sendError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        String json = "{\"success\":false,\"message\":\"" 
                + message.replace("\"", "\\\"")
                + "\",\"timestamp\":\"" + LocalDateTime.now() + "\"}";
        response.getWriter().write(json);
    }
}
