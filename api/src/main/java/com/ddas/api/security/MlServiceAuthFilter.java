package com.ddas.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service authentication filter for internal ML endpoints under /api/v1/internal/ml/**.
 * Enforces dedicated bearer token authentication, isolating ML data access from normal
 * user JWTs and device API keys.
 */
@Slf4j
@Component
public class MlServiceAuthFilter extends OncePerRequestFilter {

    public static final String ML_PATH_PREFIX = "/api/v1/internal/ml";
    public static final String SERVICE_PRINCIPAL = "fastapi-service";
    public static final String ML_DATA_READ_AUTHORITY = "ml.data.read";

    private final String expectedServiceToken;
    private final ObjectMapper objectMapper;

    public MlServiceAuthFilter(
            @Value("${ddas.ai.spring-service-token:${DDAS_AI_SPRING_SERVICE_TOKEN:}}") String expectedServiceToken,
            ObjectMapper objectMapper
    ) {
        this.expectedServiceToken = expectedServiceToken != null ? expectedServiceToken.trim() : "";
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        // Only apply to internal ML endpoints
        if (!path.startsWith(ML_PATH_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check if service token is configured on the server
        if (expectedServiceToken.length() < 32) {
            log.warn("ML service authentication is unconfigured or token is shorter than 32 characters.");
            sendJsonError(response, HttpServletResponse.SC_SERVICE_UNAVAILABLE, "Spring service authentication is not configured");
            return;
        }

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.setHeader("WWW-Authenticate", "Bearer");
            sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Missing or invalid Authorization header");
            return;
        }

        String incomingToken = authHeader.substring(7).trim();
        byte[] expectedBytes = expectedServiceToken.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = incomingToken.getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(expectedBytes, actualBytes)) {
            log.warn("Invalid ML service token attempt from {}", request.getRemoteAddr());
            response.setHeader("WWW-Authenticate", "Bearer");
            sendJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Invalid service token");
            return;
        }

        // Authenticate service principal with ml.data.read authority
        List<GrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority(ML_DATA_READ_AUTHORITY),
                new SimpleGrantedAuthority("ROLE_FASTAPI_SERVICE")
        );

        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                SERVICE_PRINCIPAL,
                null,
                authorities
        );
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authToken);

        filterChain.doFilter(request, response);
    }

    private void sendJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> body = Map.of(
                "success", false,
                "message", message,
                "timestamp", LocalDateTime.now().toString()
        );
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}

