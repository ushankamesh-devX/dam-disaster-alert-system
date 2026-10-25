package com.ddas.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MlServiceAuthFilterTest {

    private static final String VALID_TOKEN = "valid-secret-service-token-at-least-32-chars-long";
    private ObjectMapper objectMapper;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        filterChain = mock(FilterChain.class);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void nonMlPathPassesThroughUnchecked() throws ServletException, IOException {
        MlServiceAuthFilter filter = new MlServiceAuthFilter(VALID_TOKEN, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/dams");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void unconfiguredTokenFailsClosedWithServiceUnavailable() throws ServletException, IOException {
        MlServiceAuthFilter filter = new MlServiceAuthFilter("short", objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/internal/ml/dams");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        assertThat(response.getContentAsString()).contains("Spring service authentication is not configured");
    }

    @Test
    void missingAuthorizationHeaderReturnsUnauthorized() throws ServletException, IOException {
        MlServiceAuthFilter filter = new MlServiceAuthFilter(VALID_TOKEN, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/internal/ml/dams");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer");
    }

    @Test
    void invalidBearerTokenReturnsUnauthorized() throws ServletException, IOException {
        MlServiceAuthFilter filter = new MlServiceAuthFilter(VALID_TOKEN, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/internal/ml/dams");
        request.addHeader("Authorization", "Bearer invalid-wrong-token-at-least-32-chars-long");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verifyNoInteractions(filterChain);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
        assertThat(response.getHeader("WWW-Authenticate")).isEqualTo("Bearer");
    }

    @Test
    void validTokenAuthenticatesServicePrincipalWithMlDataReadAuthority() throws ServletException, IOException {
        MlServiceAuthFilter filter = new MlServiceAuthFilter(VALID_TOKEN, objectMapper);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/internal/ml/dams");
        request.addHeader("Authorization", "Bearer " + VALID_TOKEN);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("fastapi-service");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactlyInAnyOrder("ml.data.read", "ROLE_FASTAPI_SERVICE");
    }
}

