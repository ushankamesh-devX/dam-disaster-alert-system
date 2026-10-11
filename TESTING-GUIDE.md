# Testing Guide - Dam Disaster Alert System

Comprehensive guide for writing, running, and maintaining tests across the Dam Disaster Alert System.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Backend Testing (Java)](#backend-testing-java)
3. [Frontend Testing (JavaScript/TypeScript)](#frontend-testing-javascripttypescript)
4. [Integration Testing](#integration-testing)
5. [API Testing with Bruno](#api-testing-with-bruno)
6. [Performance Testing](#performance-testing)
7. [Test Coverage](#test-coverage)
8. [CI/CD Testing](#cicd-testing)
9. [Best Practices](#best-practices)

## Testing Overview

### Testing Pyramid

```
        ┌─────────────────┐
        │  End-to-End (5%)│
        ├─────────────────┤
        │ Integration (15%)
        ├────────────────────┐
        │  Unit Tests (80%)  │
        └────────────────────┘
```

### Test Types

- **Unit Tests**: Test individual functions/methods in isolation
- **Integration Tests**: Test multiple components working together
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Test system under load
- **API Tests**: Test REST endpoints

## Backend Testing (Java)

### Unit Testing

**1. Project Setup**

Dependencies in `pom.xml`:

```xml
<!-- JUnit 5 -->
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>

<!-- Mockito -->
<dependency>
  <groupId>org.mockito</groupId>
  <artifactId>mockito-core</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.mockito</groupId>
  <artifactId>mockito-junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>

<!-- AssertJ -->
<dependency>
  <groupId>org.assertj</groupId>
  <artifactId>assertj-core</artifactId>
  <scope>test</scope>
</dependency>
```

**2. Example Unit Test**

```java
@DisplayName("SensorService Unit Tests")
class SensorServiceTest {
  
  @Mock
  private SensorRepository sensorRepository;
  
  @InjectMocks
  private SensorService sensorService;
  
  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
  }
  
  @DisplayName("Should get sensor by ID")
  @Test
  void testGetSensorById() {
    // Arrange
    Long sensorId = 1L;
    Sensor sensor = new Sensor();
    sensor.setId(sensorId);
    sensor.setType(SensorType.WATER_LEVEL);
    
    when(sensorRepository.findById(sensorId))
      .thenReturn(Optional.of(sensor));
    
    // Act
    Sensor result = sensorService.getSensorById(sensorId);
    
    // Assert
    assertThat(result).isNotNull();
    assertThat(result.getId()).isEqualTo(sensorId);
    assertThat(result.getType()).isEqualTo(SensorType.WATER_LEVEL);
    
    verify(sensorRepository).findById(sensorId);
  }
  
  @DisplayName("Should throw exception when sensor not found")
  @Test
  void testGetSensorByIdNotFound() {
    // Arrange
    Long sensorId = 999L;
    when(sensorRepository.findById(sensorId))
      .thenReturn(Optional.empty());
    
    // Act & Assert
    assertThatThrownBy(() -> sensorService.getSensorById(sensorId))
      .isInstanceOf(SensorNotFoundException.class);
  }
}
```

**3. Run Unit Tests**

```bash
cd api

# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=SensorServiceTest

# Run specific test method
mvn test -Dtest=SensorServiceTest#testGetSensorById

# Run tests matching pattern
mvn test -Dtest=*ServiceTest
```

### Integration Testing

**1. Test Database Setup**

Add H2 in-memory database for tests:

```xml
<dependency>
  <groupId>com.h2database</groupId>
  <artifactId>h2</artifactId>
  <scope>test</scope>
</dependency>
```

Create `application-test.properties`:

```properties
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=
spring.jpa.database-platform=org.hibernate.dialect.H2Dialect
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=false
```

**2. Example Integration Test**

```java
@SpringBootTest
@DisplayName("Alert Service Integration Tests")
class AlertServiceIntegrationTest {
  
  @Autowired
  private AlertService alertService;
  
  @Autowired
  private AlertRepository alertRepository;
  
  @Autowired
  private SensorRepository sensorRepository;
  
  @BeforeEach
  void setUp() {
    alertRepository.deleteAll();
    sensorRepository.deleteAll();
  }
  
  @DisplayName("Should create alert when threshold exceeded")
  @Test
  void testCreateAlertWhenThresholdExceeded() {
    // Arrange
    Dam dam = createTestDam();
    Sensor sensor = createTestSensor(dam);
    SensorReading reading = new SensorReading();
    reading.setSensor(sensor);
    reading.setValue(26000000000.0); // Exceeds max level
    
    // Act
    Alert alert = alertService.createAlertIfThresholdExceeded(reading);
    
    // Assert
    assertThat(alert).isNotNull();
    assertThat(alert.getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
    
    Alert savedAlert = alertRepository.findById(alert.getId()).orElse(null);
    assertThat(savedAlert).isNotNull();
  }
}
```

**3. Run Integration Tests**

```bash
# Run tests with integration profile
mvn verify -Dspring.profiles.active=test

# Run only integration tests
mvn failsafe:integration-test
```

### Test Coverage

**1. Generate Coverage Report**

```bash
# Using JaCoCo
mvn clean test jacoco:report

# View report
open api/target/site/jacoco/index.html
```

**2. JaCoCo Configuration**

Add to `pom.xml`:

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.8</version>
  <executions>
    <execution>
      <goals>
        <goal>prepare-agent</goal>
      </goals>
    </execution>
    <execution>
      <id>report</id>
      <phase>test</phase>
      <goals>
        <goal>report</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

## Frontend Testing (JavaScript/TypeScript)

### Unit Testing with Vitest/Jest

**1. Project Setup**

```bash
cd app
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest
```

**2. Example Unit Test**

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import AlertCard from '@/components/AlertCard';

describe('AlertCard Component', () => {
  it('should render alert with correct severity', () => {
    // Arrange
    const alert = {
      id: 1,
      title: 'High Water Level',
      severity: 'CRITICAL',
      message: 'Water level exceeded critical threshold',
      timestamp: new Date(),
    };
    
    // Act
    render(<AlertCard alert={alert} />);
    
    // Assert
    expect(screen.getByText('High Water Level')).toBeInTheDocument();
    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });
  
  it('should call onAcknowledge when acknowledge button clicked', () => {
    // Arrange
    const handleAcknowledge = vitest.fn();
    const alert = { id: 1, title: 'Test Alert', severity: 'HIGH' };
    
    // Act
    render(<AlertCard alert={alert} onAcknowledge={handleAcknowledge} />);
    const button = screen.getByRole('button', { name: /acknowledge/i });
    fireEvent.click(button);
    
    // Assert
    expect(handleAcknowledge).toHaveBeenCalledWith(1);
  });
});
```

**3. Run Frontend Tests**

```bash
cd app

# Run all tests
npm test

# Run specific test file
npm test -- AlertCard.test.tsx

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### E2E Testing with Detox (Mobile)

**1. Setup Detox**

```bash
npm install --save-dev detox-cli detox
detox init -r ios
```

**2. Example E2E Test**

```typescript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  beforeEach(async () => {
    await device.reloadReactNative();
  });
  
  it('should login successfully', async () => {
    // Find and fill email field
    await waitFor(element(by.id('emailInput')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('emailInput')).typeText('test@example.com');
    
    // Find and fill password field
    await element(by.id('passwordInput')).typeText('password123');
    
    // Tap login button
    await element(by.label('Login')).tap();
    
    // Verify navigation to home screen
    await waitFor(element(by.text('Welcome')))
      .toBeVisible()
      .withTimeout(5000);
    await expect(element(by.text('Welcome'))).toBeVisible();
  });
});
```

**3. Run E2E Tests**

```bash
# Build app for testing
detox build-framework-cache
detox build-app --configuration ios.sim.release

# Run tests
detox test --cleanup
```

## Integration Testing

### API Integration Testing

**1. Test API Endpoints**

```java
@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("Dam API Integration Tests")
class DamControllerIntegrationTest {
  
  @Autowired
  private MockMvc mockMvc;
  
  @Autowired
  private DamRepository damRepository;
  
  @BeforeEach
  void setUp() {
    damRepository.deleteAll();
  }
  
  @DisplayName("Should get all dams")
  @Test
  void testGetAllDams() throws Exception {
    // Arrange
    Dam dam = new Dam();
    dam.setName("Test Dam");
    damRepository.save(dam);
    
    // Act & Assert
    mockMvc.perform(get("/api/dams"))
      .andExpectAll(
        status().isOk(),
        jsonPath("$.success").value(true),
        jsonPath("$.data.content").isArray(),
        jsonPath("$.data.content[0].name").value("Test Dam")
      );
  }
}
```

**2. Run Integration Tests**

```bash
mvn verify
```

## API Testing with Bruno

### Bruno Collection Testing

**1. Navigate to Bruno Folder**

```bash
cd api/bruno
```

**2. Create Test Collection**

Organize tests in Bruno:

```
bruno/
├── Auth/
│   ├── Login.bru
│   ├── Register.bru
│   └── Refresh Token.bru
├── Dams/
│   ├── Get All Dams.bru
│   ├── Get Dam by ID.bru
│   └── Create Dam.bru
└── Alerts/
    ├── Get Alerts.bru
    └── Acknowledge Alert.bru
```

**3. Example Bruno Test**

`Login.bru`:
```
meta {
  name: Login
  type: http
  seq: 1
}

post {
  url: http://localhost:8080/api/auth/login
  body: json
}

body:json {
  {
    "email": "test@example.com",
    "password": "password123"
  }
}

tests {
  test("Status is 200", function() {
    expect(res.getStatus()).to.equal(200);
  });
  
  test("Response contains token", function() {
    expect(res.getBody().data.token).to.exist;
  });
}
```

**4. Run Tests**

```bash
# Run all tests
bruno run --collection bruno

# Run specific request
bruno run --collection bruno --request "Get All Dams"

# Generate report
bruno run --collection bruno --output report.html
```

## Performance Testing

### Load Testing with JMeter

**1. Create Test Plan**

- Thread Group: Configure number of users
- HTTP Request Sampler: Define API endpoint
- Listeners: Results tree, Graph results

**2. Example Load Test**

```
1. Thread Group
   - Number of Threads: 100
   - Ramp-Up Period: 10 seconds
   - Loop Count: 10

2. HTTP Request
   - Server Name: localhost
   - Port: 8080
   - Path: /api/dams

3. Listeners
   - Results Tree
   - Graph Results
   - Summary Report
```

**3. Run Performance Test**

```bash
# Non-GUI mode (recommended for CI/CD)
jmeter -n -t test-plan.jmx -l results.jtl -j jmeter.log

# Generate HTML report
jmeter -g results.jtl -o report/
```

### Monitoring During Load Test

```bash
# Monitor Java process
jstat -gc <PID> 1000

# Monitor system resources
top
vmstat 1

# Monitor database
SHOW PROCESSLIST;
```

## Test Coverage

### Coverage Targets

- **Minimum**: 50% code coverage
- **Target**: 75% code coverage
- **Excellence**: 90%+ code coverage

Focus coverage efforts on:
- Critical business logic
- Complex algorithms
- Error handling
- Security-sensitive code

### Exclude from Coverage

In `pom.xml`:

```xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <configuration>
    <excludes>
      <exclude>com/ddas/config/**</exclude>
      <exclude>com/ddas/dto/**</exclude>
    </excludes>
  </configuration>
</plugin>
```

## CI/CD Testing

### GitHub Actions Workflow

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_DATABASE: ddas
          MYSQL_ROOT_PASSWORD: root
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '11'
      - run: cd api && mvn clean verify

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '16'
      - run: cd app && npm install && npm test
      - run: cd web && npm install && npm test
      - uses: codecov/codecov-action@v3
        with:
          directory: ./coverage
```

## Best Practices

### 1. Test Naming

```java
// Good: Describes what is being tested and expected outcome
@Test
void shouldReturnHighSeverityAlertWhenWaterLevelExceedsCriticalThreshold() { }

// Bad: Unclear what is being tested
@Test
void testAlert() { }
```

### 2. Arrange-Act-Assert Pattern

```java
@Test
void exampleTest() {
  // Arrange - Set up test data
  User user = new User("john@example.com");
  
  // Act - Perform the action
  boolean isValid = user.validateEmail();
  
  // Assert - Verify the results
  assertTrue(isValid);
}
```

### 3. Test Independence

- Each test should be independent
- Don't rely on test execution order
- Clean up after each test

```java
@BeforeEach
void setUp() {
  // Initialize test data
}

@AfterEach
void tearDown() {
  // Clean up resources
}
```

### 4. Use Test Fixtures

```java
class SensorTestFixtures {
  public static Sensor createDefaultSensor() {
    Sensor sensor = new Sensor();
    sensor.setType(SensorType.WATER_LEVEL);
    sensor.setStatus(SensorStatus.OPERATIONAL);
    return sensor;
  }
}
```

### 5. Mock External Dependencies

```java
@Test
void testWithMocks() {
  // Mock external API calls
  when(externalApiClient.fetchData()).thenReturn(mockData);
  
  // Test business logic without external dependency
  boolean result = service.processData();
  
  assertTrue(result);
}
```

### 6. Test Edge Cases

```java
@Test
void testBoundaryValues() {
  // Test minimum value
  assertTrue(validator.isValid(MIN_VALUE));
  
  // Test maximum value
  assertTrue(validator.isValid(MAX_VALUE));
  
  // Test below minimum
  assertFalse(validator.isValid(MIN_VALUE - 1));
  
  // Test above maximum
  assertFalse(validator.isValid(MAX_VALUE + 1));
}
```

## Test Execution Timeline

```
Development → Push → GitHub Actions
                        ↓
                  Backend Tests (5 min)
                  Frontend Tests (3 min)
                  Integration Tests (5 min)
                        ↓
                  Pull Request Review
                        ↓
                  Merge → Deploy
```

## Troubleshooting Tests

### Test Fails Locally but Passes in CI

- Check environment differences
- Verify database state
- Check for timing issues (use `waitFor`)
- Ensure consistent test data

### Tests Run Slowly

- Reduce database initialization time
- Use in-memory database for tests
- Parallelize test execution
- Cache dependencies

### Flaky Tests

- Add explicit waits instead of sleeps
- Clean up state properly between tests
- Avoid time-dependent assertions
- Mock time-based functionality

## Next Steps

1. Write tests for new code
2. Maintain coverage above 75%
3. Run tests before committing
4. Review test quality in code reviews
5. Monitor test execution time

---

**Remember: Good tests make for confident developers! 🧪**

