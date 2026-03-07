package com.ddas.api.controller;

import com.ddas.api.dto.request.LoginRequest;
import com.ddas.api.dto.request.RegisterRequest;
import com.ddas.api.dto.response.ApiResponse;
import com.ddas.api.dto.response.AuthResponse;
import com.ddas.api.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @GetMapping("/test")
    public ResponseEntity<ApiResponse<Void>> test() {
        return ResponseEntity.ok(ApiResponse.message("Authentication module is working!"));
    }
}

