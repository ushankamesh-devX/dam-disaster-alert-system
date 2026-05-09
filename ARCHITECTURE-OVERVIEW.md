# Architecture Overview - Dam Disaster Alert System

High-level system architecture and design patterns used in the Dam Disaster Alert System.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Component Description](#component-description)
3. [Data Flow](#data-flow)
4. [Technology Stack](#technology-stack)
5. [Design Patterns](#design-patterns)
6. [API Architecture](#api-architecture)
7. [Database Design](#database-design)
8. [Security Architecture](#security-architecture)
9. [Scalability Considerations](#scalability-considerations)

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet Users                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │  Web Browser │  │ Mobile App   │  │  IoT Devices     │      │
│  │   (Vite)     │  │  (Expo/RN)   │  │  (ESP32)         │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘      │
│         │                 │                  │                   │
└─────────┼─────────────────┼──────────────────┼───────────────────┘
          │                 │                  │
          │  HTTPS/HTTP     │  REST API        │  MQTT/REST
          │                 │                  │
┌─────────▼─────────────────▼──────────────────▼───────────────────┐
│                      Load Balancer (Nginx)                       │
├────────────────────────────────────────────────────────────────┬─┤
│                                                                │ │
│  ┌────────────────────────────────────────────────────────┐   │ │
│  │         API Server (Spring Boot)                       │   │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │   │ │
│  │  │ Controllers  │  │  Services    │  │ Repositories│  │   │ │
│  │  ├──────────────┤  ├──────────────┤  ├─────────────┤  │   │ │
│  │  │ Dam API      │  │ DamService   │  │ DamRepo     │  │   │ │
│  │  │ Sensor API   │  │ SensorSvc    │  │ SensorRepo  │  │   │ │
│  │  │ Alert API    │  │ AlertService │  │ AlertRepo   │  │   │ │
│  │  │ User API     │  │ UserService  │  │ UserRepo    │  │   │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │   │ │
│  │                                                        │   │ │
│  │  ┌─────────────────────────────────────────────────┐  │   │ │
│  │  │          Security Layer                        │  │   │ │
│  │  │  - JWT Authentication                          │  │   │ │
│  │  │  - Authorization (RBAC)                        │  │   │ │
│  │  │  - Input Validation                           │  │   │ │
│  │  └─────────────────────────────────────────────────┘  │   │ │
│  │                                                        │   │ │
│  └────────────────────────────────────────────────────┘   │   │ │
│                         │                                  │   │ │
│  ┌──────────────────────▼─────────────────┐               │   │ │
│  │   Database (MySQL)                     │               │   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐│               │   │ │
│  │  │   dams   │ │  sensors │ │ alerts  ││               │   │ │
│  │  ├──────────┤ ├──────────┤ ├─────────┤│               │   │ │
│  │  │  regions │ │ readings │ │ reports ││               │   │ │
│  │  │   users  │ │ devices  │ │ users   ││               │   │ │
│  │  └──────────┘ └──────────┘ └─────────┘│               │   │ │
│  └─────────────────────────────────────────┘               │   │ │
│                                                            │   │ │
│  ┌────────────────────────────────────────┐               │   │ │
│  │   Cache Layer (Redis) - Optional       │               │   │ │
│  │  - Session caching                     │               │   │ │
│  │  - Query result caching               │               │   │ │
│  └────────────────────────────────────────┘               │   │ │
│                                                            │   │ │
└────────────────────────────────────────────────────────────┘   │ │
                                                                  │ │
│  ┌───────────────────────────────────────────────────────────┐ │ │
│  │           Queue System (Optional)                         │ │ │
│  │  - Alert notifications                                    │ │ │
│  │  - Email sending                                          │ │ │
│  │  - Data processing                                        │ │ │
│  └───────────────────────────────────────────────────────────┘ │ │
└────────────────────────────────────────────────────────────────┘─┘
```

## Component Description

### Frontend Layer

#### Web Application (Vite + React/Vue)
- **Purpose**: Administrative dashboard and monitoring interface
- **Features**:
  - Real-time dam monitoring
  - Alert management
  - User management
  - Report generation
  - System configuration

#### Mobile Application (React Native + Expo)
- **Purpose**: On-the-go monitoring and alert notifications
- **Features**:
  - Push notifications
  - Real-time alerts
  - Dam status view
  - Quick actions
  - Offline capability (limited)

#### IoT Devices (ESP32/Arduino)
- **Purpose**: Sensor data collection
- **Capabilities**:
  - Multiple sensor types (water level, pressure, temperature)
  - Local processing
  - Battery/power management
  - Wireless connectivity (WiFi, LoRaWAN)

### Backend Layer

#### API Server (Spring Boot)
- **Purpose**: Core business logic and data processing
- **Key Responsibilities**:
  - Handle REST API requests
  - Authenticate users and validate tokens
  - Process sensor data
  - Manage alerts and notifications
  - Generate reports
  - User and permission management

#### Controllers
```
├── DamController        - Dam CRUD and retrieval
├── SensorController     - Sensor management
├── SensorReadingCtrl    - Data ingestion and retrieval
├── AlertController      - Alert management
├── UserController       - User management
├── ReportController     - Report generation
└── AuthController       - Authentication
```

#### Services (Business Logic)
```
├── DamService           - Dam operations
├── SensorService        - Sensor operations
├── AlertService         - Alert triggering and management
├── NotificationService  - Email/SMS/Push notifications
├── UserService          - User management
├── SecurityService      - Authentication and authorization
└── ReportService        - Report generation
```

#### Repositories (Data Access)
- Direct database access using Spring Data JPA
- Query optimization and indexing
- Transaction management

### Data Layer

#### Primary Database (MySQL)
- **Persistence**: Durable data storage
- **Tables**:
  - `dams` - Dam information
  - `sensors` - Sensor metadata
  - `sensor_readings` - Time-series sensor data
  - `alerts` - Alert records
  - `users` - User accounts
  - `regions` - Geographical regions
  - `reports` - Generated reports

#### Cache Layer (Redis - Optional)
- **Purpose**: Performance optimization
- **Use Cases**:
  - User session storage
  - Frequently accessed data caching
  - Real-time data caching

#### Message Queue (Optional)
- **Purpose**: Asynchronous processing
- **Use Cases**:
  - Alert notifications
  - Email sending
  - Report generation
  - Data analytics

### Security Layer

#### Authentication
- JWT (JSON Web Tokens) for stateless authentication
- Token refresh mechanism
- Secure password hashing

#### Authorization
- Role-Based Access Control (RBAC)
- Fine-grained permissions
- Resource-level authorization

#### Data Protection
- HTTPS/TLS encryption
- Database encryption (optional)
- Sensitive data masking

## Data Flow

### 1. Sensor Data Ingestion Flow

```
IoT Device
   ↓ (MQTT/HTTP)
Data Ingestion Endpoint
   ↓ (Validate & Store)
Database
   ↓ (Trigger)
Alert Service
   ↓ (Check thresholds)
Alert Creation
   ↓ (If alert triggered)
Notification Service
   ↓ (Send notifications)
User Devices
```

### 2. User Action Flow

```
User Action (Web/Mobile)
   ↓ (HTTPS)
Frontend
   ↓ (HTTP Request)
Load Balancer
   ↓ (Route)
API Server
   ↓ (Authenticate & Authorize)
Controller
   ↓ (Process)
Service Layer
   ↓ (Execute Logic)
Repository
   ↓ (Database Query)
Database
   ↓ (Query Result)
Response Chain (Reverse)
   ↓ (JSON Response)
Frontend Display
```

### 3. Real-time Alert Flow

```
Threshold Exceeded
   ↓ (Sensor Reading > Max)
Alert Service
   ↓ (Create Alert)
Database
   ↓ (Store)
WebSocket/Server-Sent Events
   ↓ (Broadcast to connected clients)
Web/Mobile Clients
   ↓ (Receive & Display)
User Notification
```

## Technology Stack

### Backend

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Spring Boot | 3.0+ |
| Language | Java | 11+ |
| Database | MySQL | 5.7+ |
| ORM | Hibernate/JPA | 6.0+ |
| Build Tool | Maven | 3.6+ |
| Testing | JUnit 5, Mockito | Latest |
| Authentication | JWT | io.jsonwebtoken |
| Validation | Hibernate Validator | 8.0+ |

### Frontend (Web)

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React/Vue | 18+/3+ |
| Build Tool | Vite | 4.0+ |
| Styling | Tailwind CSS | 3.0+ |
| HTTP Client | Axios/Fetch | Latest |
| State Management | Redux/Pinia | Latest |
| Testing | Vitest/Jest | Latest |
| Linting | ESLint | 8.0+ |
| Formatting | Prettier | 3.0+ |

### Frontend (Mobile)

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | React Native | 0.72+ |
| Bundler | Expo | Latest |
| Styling | NativeWind | Latest |
| HTTP Client | Axios | Latest |
| State Management | Redux/Context | Latest |
| Testing | Detox | Latest |

### DevOps

| Component | Technology | Version |
|-----------|-----------|---------|
| Containerization | Docker | 20.10+ |
| Orchestration | Docker Compose | 1.29+ |
| CI/CD | GitHub Actions | Built-in |
| Monitoring | Prometheus/ELK | Latest |
| Logging | ELK Stack | Latest |

## Design Patterns

### 1. MVC (Model-View-Controller)

**Backend**: Spring MVC pattern
```
Request → Controller → Service → Repository → Database
   ↓
Response ← View (JSON) ← Service ← Repository
```

### 2. Service Layer Pattern

Business logic separated from controllers for reusability and testing.

```java
@Service
public class DamService {
  public Dam getDamById(Long id) { }
  public List<Dam> getAllDams() { }
  public Dam createDam(DamDTO dto) { }
}
```

### 3. Repository Pattern

Data access abstraction for database operations.

```java
@Repository
public interface DamRepository extends JpaRepository<Dam, Long> {
  List<Dam> findByRegionId(Long regionId);
  Page<Dam> findAll(Pageable pageable);
}
```

### 4. Dependency Injection

Spring's IoC container manages bean dependencies.

```java
@Service
public class AlertService {
  @Autowired
  private SensorRepository sensorRepository;
  
  @Autowired
  private NotificationService notificationService;
}
```

### 5. Observer Pattern

Alert system uses observer pattern for event notifications.

```
Sensor Reading Event
   ↓
Alert Service (Observer)
   ↓
Notification Service
   ↓
Email/SMS/Push Handlers
```

### 6. Facade Pattern

Complex subsystems hidden behind simple interface.

```java
@RestController
@RequestMapping("/api/dams")
public class DamController {
  // Facade methods that orchestrate multiple services
  public ResponseEntity<?> getDamWithDetails(Long id) {
    // Calls multiple services
  }
}
```

### 7. Strategy Pattern

Different notification strategies.

```java
interface NotificationStrategy {
  void send(Alert alert);
}

class EmailNotification implements NotificationStrategy { }
class SMSNotification implements NotificationStrategy { }
class PushNotification implements NotificationStrategy { }
```

## API Architecture

### RESTful Design

All APIs follow REST principles:

```
GET     /api/dams              - List all dams
GET     /api/dams/{id}         - Get specific dam
POST    /api/dams              - Create dam
PUT     /api/dams/{id}         - Update dam
DELETE  /api/dams/{id}         - Delete dam
```

### Response Format

Standardized response structure for consistency:

```json
{
  "success": true,
  "data": { /* payload */ },
  "message": "Operation successful",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Handling

Consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Dam with ID 999 not found",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Database Design

### Entity Relationships

```
Dam (1) ──── (N) Sensor
        ├──── (N) Alert
        └──── (N) Report

Sensor (1) ──── (N) SensorReading
        └──── (1) Device

Region (1) ──── (N) Dam
       └──── (N) User

User (1) ──── (N) Report
     ├──── (N) Role
     └──── (N) Permission
```

### Key Tables

#### Dams Table
```sql
CREATE TABLE dams (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  capacity BIGINT,
  current_level BIGINT,
  max_level BIGINT,
  min_level BIGINT,
  region_id BIGINT,
  status ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (region_id) REFERENCES regions(id)
);
```

#### Sensors Table
```sql
CREATE TABLE sensors (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dam_id BIGINT NOT NULL,
  type ENUM('WATER_LEVEL', 'PRESSURE', 'TEMPERATURE', 'HUMIDITY'),
  location VARCHAR(255),
  status ENUM('OPERATIONAL', 'MAINTENANCE', 'OFFLINE'),
  device_id BIGINT,
  created_at TIMESTAMP,
  FOREIGN KEY (dam_id) REFERENCES dams(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);
```

## Security Architecture

### Authentication Flow

```
User Credentials
   ↓
Login Endpoint
   ↓ (Validate)
Password Verification
   ↓ (Match)
Generate JWT Token
   ↓
Return Token + Refresh Token
   ↓
Client Stores Token
   ↓
Include in Headers (Authorization: Bearer <token>)
```

### Authorization Flow

```
Request with Token
   ↓
JWT Validation
   ↓ (Valid & Not Expired)
Extract User Claims
   ↓
Check Permissions
   ↓ (Has Required Role/Permission)
Execute Request
   ↓
Return Response
```

### Data Security

- SSL/TLS for data in transit
- Encrypted passwords using bcrypt
- Sensitive data encrypted at rest (optional)
- API rate limiting
- Request validation

## Scalability Considerations

### Horizontal Scaling

```
Traffic
   ↓
Load Balancer (Nginx)
   ├── API Server Instance 1
   ├── API Server Instance 2
   ├── API Server Instance 3
   └── API Server N
   ↓
Database Connection Pool
```

### Vertical Scaling

- Increase API server resources (CPU, RAM)
- Database optimization (indexing, partitioning)
- Query optimization

### Caching Strategy

```
High Frequency Requests
   ├── Application Cache (Redis)
   ├── Database Query Cache
   └── Browser Cache
```

### Database Optimization

- Proper indexing
- Query optimization
- Data partitioning
- Read replicas for reporting

### Asynchronous Processing

```
Long-running Tasks
   ↓
Message Queue
   ↓
Background Workers
   ↓
Process & Store Results
```

## Future Enhancements

- [ ] Microservices architecture
- [ ] GraphQL API support
- [ ] Machine learning for anomaly detection
- [ ] Advanced analytics dashboard
- [ ] Blockchain for audit trails
- [ ] Edge computing for IoT devices
- [ ] Multi-tenancy support

---

**Architecture is the foundation of a robust system!** 🏗️

