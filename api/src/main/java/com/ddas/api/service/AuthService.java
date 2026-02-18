package com.ddas.api.service;

import com.ddas.api.dto.request.LoginRequest;
import com.ddas.api.dto.request.RegisterRequest;
import com.ddas.api.dto.response.AuthResponse;
import com.ddas.api.dto.response.UserResponse;
import com.ddas.api.entity.Role;
import com.ddas.api.entity.User;
import com.ddas.api.exception.ResourceNotFoundException;
import com.ddas.api.exception.UserAlreadyExistsException;
import com.ddas.api.mapper.UserMapper;
import com.ddas.api.repository.RoleRepository;
import com.ddas.api.repository.UserRepository;
import com.ddas.api.security.JwtTokenUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenUtil jwtTokenUtil;
    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Attempting to register user with email: {}", request.getEmail());

        // Check if user already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserAlreadyExistsException("Email already registered: " + request.getEmail());
        }

        if (request.getPhoneNumber() != null && userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new UserAlreadyExistsException("Phone number already registered: " + request.getPhoneNumber());
        }

        // Get default role (normal user)
        Role defaultRole = roleRepository.findByCode("NORMAL_USER")
                .or(() -> roleRepository.findByIsDefaultTrue())
                .orElseThrow(() -> new ResourceNotFoundException("Default role not found"));

        // Create new user
        User user = User.builder()
                .uuid(UUID.randomUUID().toString())
                .fullName(request.getFullName())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(defaultRole)
                .status(User.UserStatus.active) // Auto-activate for now
                .languagePreference(parseLanguage(request.getLanguagePreference()))
                .notificationEnabled(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully with email: {}", user.getEmail());

        // Generate JWT token
        String token = jwtTokenUtil.generateToken(user.getEmail(), null);

        UserResponse userResponse = userMapper.toUserResponse(user);

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtTokenUtil.getExpirationTime())
                .user(userResponse)
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Attempting to login user with email: {}", request.getEmail());

        // Authenticate user
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        // Get user details
        User user = userRepository.findActiveUserByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate JWT token
        String token = jwtTokenUtil.generateToken(user.getEmail(), null);

        UserResponse userResponse = userMapper.toUserResponse(user);

        log.info("User logged in successfully: {}", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .expiresIn(jwtTokenUtil.getExpirationTime())
                .user(userResponse)
                .build();
    }

    private User.Language parseLanguage(String language) {
        if (language == null) {
            return User.Language.en;
        }
        try {
            return User.Language.valueOf(language.toLowerCase());
        } catch (IllegalArgumentException e) {
            return User.Language.en;
        }
    }
}

