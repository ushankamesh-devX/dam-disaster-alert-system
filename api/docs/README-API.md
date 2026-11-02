# Dam Disaster Alert System - REST API

A modular REST API backend built with Spring Boot for the Dam Disaster Alert System (DDAS). This API provides authentication, user management, and health monitoring endpoints with JWT-based security.

## 🏗️ Architecture

### Modular Structure
```
src/main/java/com/ddas/api/
├── config/              # Configuration classes (Security, CORS)
├── controller/          # REST Controllers (API endpoints)
├── dto/                 # Data Transfer Objects
│   ├── request/        # Request DTOs
│   └── response/       # Response DTOs
├── entity/             # JPA Entities (Database models)
├── exception/          # Custom exceptions and global handler
├── mapper/             # Entity-DTO mappers
├── repository/         # JPA Repositories
├── security/           # Security components (JWT, Filters)
└── service/            # Business logic services
```

## 🚀 Features

- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **User Registration & Login** - Normal user authentication flow
- ✅ **Role-Based Access Control** - Permissions and roles from database
- ✅ **Health Check Endpoint** - Monitor API status
- ✅ **Global Exception Handling** - Consistent error responses
- ✅ **Database Integration** - MySQL with JPA/Hibernate
- ✅ **Bruno API Collection** - Ready-to-use API testing collection
- ✅ **Actuator Endpoints** - Production-ready monitoring

## 📋 Prerequisites

- Java 17 or higher
- Maven 3.6+
- MySQL 8.0+
- Bruno (for API testing)

## 🛠️ Setup Instructions

### 1. Database Setup

Create the database and run the schema:

```bash
# Create database
mysql -u root -p
CREATE DATABASE ddas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ddas;

# Run schema
mysql -u root -p ddas < "DB SCHEMA/ddas_complete_schema.sql"

# Initialize data (roles, permissions, admin user)
mysql -u root -p ddas < "DB SCHEMA/init_data.sql"
```

### 2. Configure Application

Update `src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/ddas
spring.datasource.username=root
spring.datasource.password=your_password
```

Or use environment variables:
```bash
export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/ddas
export SPRING_DATASOURCE_USERNAME=root
export SPRING_DATASOURCE_PASSWORD=your_password
export JWT_SECRET=your_jwt_secret_key_here
```

### 3. Build and Run

```bash
# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080`

## 📡 API Endpoints

### Public Endpoints (No Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| GET | `/api/v1/auth/test` | Test auth module |

### Protected Endpoints (Authentication Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| GET | `/api/v1/users` | Get all users |
| GET | `/api/v1/users/{id}` | Get user by ID |

## 🔐 Authentication Flow

### 1. Register User

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "+94771234567",
  "password": "SecurePass123!",
  "languagePreference": "en"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "type": "Bearer",
    "expiresIn": 86400000,
    "user": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "status": "active",
      "role": {
        "code": "NORMAL_USER",
        "name": "Normal User"
      }
    }
  },
  "timestamp": "2026-02-18T10:30:00"
}
```

### 2. Login

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

### 3. Use Token for Protected Endpoints

```bash
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 Testing with Bruno

1. Open Bruno application
2. Click "Open Collection"
3. Navigate to `api/bruno` folder
4. Select "local" environment
5. Run requests in this order:
   - Health Check
   - Register User (token auto-saved)
   - Login User (token auto-saved)
   - Get Current User (uses saved token)

See [bruno/README.md](bruno/README.md) for detailed instructions.

## 📦 Database Initialization

The system comes with pre-configured roles and permissions:

### Roles
- **SUPER_ADMIN** - Full system access
- **ADMIN** - Administrator with management permissions
- **DAM_OPERATOR** - Dam facility operator
- **NORMAL_USER** - Regular user (default for new registrations)

### Default Admin User
- **Email:** `admin@ddas.gov.lk`
- **Password:** `Admin@123`
- **Role:** Super Administrator

## 🔧 Technology Stack

- **Framework:** Spring Boot 4.0.2
- **Security:** Spring Security + JWT
- **Database:** MySQL 8.0+
- **ORM:** Spring Data JPA / Hibernate
- **Build Tool:** Maven
- **Java Version:** 17
- **API Testing:** Bruno

## 📂 Project Structure

```
api/
├── bruno/                          # Bruno API testing collection
│   ├── Auth/                      # Authentication endpoints
│   ├── Health/                    # Health check endpoints
│   ├── Users/                     # User management endpoints
│   ├── environments/              # Environment configurations
│   └── README.md                  # Bruno usage guide
├── DB SCHEMA/                     # Database schemas
│   ├── ddas_complete_schema.sql  # Complete database schema
│   └── init_data.sql             # Initial data (roles, permissions)
├── src/
│   ├── main/
│   │   ├── java/com/ddas/api/
│   │   │   ├── config/           # Security & config
│   │   │   ├── controller/       # REST controllers
│   │   │   ├── dto/              # Request/Response DTOs
│   │   │   ├── entity/           # JPA entities
│   │   │   ├── exception/        # Exception handling
│   │   │   ├── mapper/           # Entity-DTO mappers
│   │   │   ├── repository/       # Data repositories
│   │   │   ├── security/         # JWT & security
│   │   │   └── service/          # Business logic
│   │   └── resources/
│   │       └── application.properties
│   └── test/                     # Unit & integration tests
├── pom.xml
└── README-API.md                 # This file
```

## 🔍 Health Check & Monitoring

### Application Health
```bash
GET /api/v1/health
```

### Spring Actuator (Production Monitoring)
```bash
GET /actuator/health
GET /actuator/info
GET /actuator/metrics
```

## 🐛 Error Handling

All errors return a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "timestamp": "2026-02-18T10:30:00"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "email": "Email should be valid",
    "password": "Password must be between 8 and 100 characters"
  },
  "timestamp": "2026-02-18T10:30:00"
}
```

## 🚀 Next Steps

1. ✅ Basic authentication is complete
2. 🔄 Add more modules (Dams, Alerts, Reports)
3. 🔄 Implement permission-based authorization
4. 🔄 Add email verification
5. 🔄 Add refresh token functionality
6. 🔄 Add rate limiting
7. 🔄 Add API documentation (Swagger/OpenAPI)

## 📝 Development Notes

- All users register as "NORMAL_USER" by default
- User roles can be changed later by administrators
- JWT tokens expire after 24 hours (configurable)
- Database schema uses soft deletes (deleted_at field)
- All timestamps are in UTC

## 🤝 Contributing

1. Follow the modular architecture
2. Add tests for new features
3. Update Bruno collection for new endpoints
4. Keep DTOs separate from entities
5. Use proper exception handling

## 📄 License

[Your License Here]

---

**Built with ❤️ for Dam Disaster Alert System**

