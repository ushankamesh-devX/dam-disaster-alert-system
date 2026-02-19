# DDAS API - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  (Bruno, Mobile App, Web App, External Services)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / NGINX                        │
│                     (Future Load Balancer)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    SPRING BOOT APPLICATION                     │
│                        (Port 8080)                             │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SECURITY LAYER                              │  │
│  │  • CORS Filter                                           │  │
│  │  • JWT Authentication Filter                             │  │
│  │  • Spring Security                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            CONTROLLER LAYER                              │  │
│  │  • AuthController      (/api/v1/auth/*)                  │  │
│  │  • UserController      (/api/v1/users/*)                 │  │
│  │  • HealthController    (/api/v1/health)                  │  │
│  │  • [Future Controllers...]                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SERVICE LAYER                               │  │
│  │  • AuthService         (Authentication logic)            │  │
│  │  • UserDetailsService  (User loading)                    │  │
│  │  • [Future Services...]                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            REPOSITORY LAYER                              │  │
│  │  • UserRepository                                        │  │
│  │  • RoleRepository                                        │  │
│  │  • PermissionRepository                                  │  │
│  │  • [Future Repositories...]                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                 │
└──────────────────────────────┼─────────────────────────────────┘
                              │ JPA/Hibernate
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                    MySQL 8.0+ (Port 3306)                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Tables:                                                 │   │
│  │  • users                                                 │   │
│  │  • roles                                                 │   │
│  │  • permissions                                           │   │
│  │  • role_permissions                                      │   │
│  │  • [40+ more tables...]                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### Authentication Flow (Login)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /api/v1/auth/login
     │    { email, password }
     ↓
┌─────────────────┐
│ AuthController  │
└────┬────────────┘
     │ 2. Call authService.login()
     ↓
┌─────────────────┐
│  AuthService    │ 3. Authenticate with Spring Security
└────┬────────────┘
     │ 4. AuthenticationManager.authenticate()
     ↓
┌──────────────────────┐
│ UserDetailsService   │ 5. loadUserByUsername()
└────┬─────────────────┘
     │ 6. Query database
     ↓
┌─────────────────┐
│ UserRepository  │
└────┬────────────┘
     │ 7. Return User entity
     ↓
┌─────────────────┐
│  AuthService    │ 8. Generate JWT token
└────┬────────────┘     9. Map to UserResponse
     │
     ↓
┌─────────────────┐
│ AuthController  │ 10. Return AuthResponse
└────┬────────────┘     { token, user, expiresIn }
     │
     ↓
┌──────────┐
│  Client  │ 11. Save token for future requests
└──────────┘
```

### Protected Endpoint Flow

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. GET /api/v1/users/me
     │    Authorization: Bearer <token>
     ↓
┌───────────────────────┐
│ JwtAuthenticationFilter│ 2. Extract & validate token
└────┬──────────────────┘    3. Load user from token
     │                        4. Set SecurityContext
     ↓
┌─────────────────┐
│ UserController  │ 5. @AuthenticationPrincipal
└────┬────────────┘    6. Get current user
     │
     ↓
┌─────────────────┐
│   UserMapper    │ 7. Map User to UserResponse
└────┬────────────┘
     │
     ↓
┌─────────────────┐
│ UserController  │ 8. Return ApiResponse<UserResponse>
└────┬────────────┘
     │
     ↓
┌──────────┐
│  Client  │ 9. Display user data
└──────────┘
```

---

## 📦 Module Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                       CONTROLLER                             │
│  Depends on: Service, DTO (Request/Response)                │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                        SERVICE                               │
│  Depends on: Repository, Entity, DTO, Mapper, Security      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                       REPOSITORY                             │
│  Depends on: Entity                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                        ENTITY                                │
│  Depends on: JPA Annotations                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        MAPPER                                │
│  Depends on: Entity, DTO                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       SECURITY                               │
│  Depends on: Entity, Repository, JWT                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

```
                        Incoming Request
                              │
                              ↓
                    ┌──────────────────┐
                    │   CORS Filter    │
                    └────────┬─────────┘
                             │ Allow origins
                             ↓
                    ┌──────────────────┐
                    │  JWT Filter      │ Extract token
                    │                  │ Validate signature
                    │                  │ Check expiration
                    └────────┬─────────┘
                             │ Valid token?
                    ┌────────┴─────────┐
                    │                  │
                YES │                  │ NO
                    │                  │
                    ↓                  ↓
         ┌───────────────────┐  ┌──────────────────┐
         │ SecurityContext   │  │ Return 401       │
         │ Set Authentication│  │ Unauthorized     │
         └────────┬──────────┘  └──────────────────┘
                  │
                  ↓
         ┌───────────────────┐
         │ Check Permissions │
         │ @PreAuthorize     │
         └────────┬──────────┘
                  │ Authorized?
         ┌────────┴─────────┐
         │                  │
     YES │                  │ NO
         │                  │
         ↓                  ↓
┌─────────────────┐  ┌──────────────────┐
│ Process Request │  │ Return 403       │
│                 │  │ Forbidden        │
└─────────────────┘  └──────────────────┘
```

---

## 💾 Database Relationships

```
┌──────────────┐
│     User     │
│──────────────│
│ id (PK)      │
│ uuid         │
│ email        │
│ password     │
│ role_id (FK) │───┐
└──────────────┘   │
                   │
                   ↓
              ┌────────────┐
              │    Role    │
              │────────────│
              │ id (PK)    │
              │ code       │
              │ name       │
              └─────┬──────┘
                    │
                    │ Many-to-Many
                    │
                    ↓
        ┌──────────────────────┐
        │  role_permissions    │
        │──────────────────────│
        │ role_id (FK)         │
        │ permission_id (FK)   │
        └──────────┬───────────┘
                   │
                   ↓
            ┌──────────────┐
            │ Permission   │
            │──────────────│
            │ id (PK)      │
            │ code         │
            │ name         │
            │ module       │
            │ action       │
            └──────────────┘
```

---

## 📊 DTO Flow

```
Client Request (JSON)
        │
        ↓
┌──────────────────┐
│ Request DTO      │  (RegisterRequest, LoginRequest)
│ + Validation     │
└────────┬─────────┘
         │ @Valid
         ↓
┌──────────────────┐
│   Controller     │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    Service       │  Business Logic
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    Entity        │  Database Operations
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│    Mapper        │  Entity → Response DTO
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ Response DTO     │  (UserResponse, AuthResponse)
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  ApiResponse<T>  │  Wrapped Response
└────────┬─────────┘
         │
         ↓
Client Response (JSON)
```

---

## 🧩 Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                     Spring Boot Container                    │
│                                                               │
│  ┌──────────────┐        ┌──────────────┐                  │
│  │ @Controller  │◄───────│  @Service    │                  │
│  └──────────────┘        └──────┬───────┘                  │
│         │                       │                            │
│         │                       ↓                            │
│         │              ┌──────────────┐                     │
│         │              │ @Repository  │                     │
│         │              └──────┬───────┘                     │
│         │                     │                              │
│         │                     ↓                              │
│         │              ┌──────────────┐                     │
│         │              │   Database   │                     │
│         │              └──────────────┘                     │
│         │                                                    │
│         ↓                                                    │
│  ┌──────────────┐                                          │
│  │  @Component  │  (Mapper, JWT Utils, etc.)              │
│  └──────────────┘                                          │
│                                                               │
│  ┌──────────────────────────────────────┐                  │
│  │         @Configuration               │                  │
│  │  • SecurityConfig                    │                  │
│  │  • CORS Config                       │                  │
│  └──────────────────────────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Design Patterns

### 1. Layered Architecture
```
Presentation Layer (Controllers)
        ↓
Business Layer (Services)
        ↓
Persistence Layer (Repositories)
        ↓
Database Layer (MySQL)
```

### 2. DTO Pattern
```
Entity (Database) ←→ Mapper ←→ DTO (API)
```

### 3. Repository Pattern
```
Service → Repository Interface → JPA Implementation → Database
```

### 4. Dependency Injection
```
@Autowired / Constructor Injection
Spring manages all beans
```

### 5. Global Exception Handling
```
Exception → @RestControllerAdvice → Unified Error Response
```

---

## 🔧 Configuration Flow

```
application.properties
        │
        ↓
┌──────────────────┐
│ Spring Boot      │ Auto-configuration
└────────┬─────────┘
         │
         ├──→ DataSource Configuration
         │    (Database connection)
         │
         ├──→ JPA Configuration
         │    (Hibernate settings)
         │
         ├──→ Security Configuration
         │    (JWT, CORS, Auth)
         │
         └──→ Actuator Configuration
              (Health, Metrics)
```

---

**📝 This architecture supports:**
- ✅ Scalability (add more modules easily)
- ✅ Maintainability (clear separation)
- ✅ Testability (each layer can be tested)
- ✅ Security (multiple layers of protection)
- ✅ Flexibility (easy to modify/extend)

