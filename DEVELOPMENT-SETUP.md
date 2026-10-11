# Development Setup Guide - Dam Disaster Alert System

This guide provides detailed instructions for setting up a local development environment for contributing to the Dam Disaster Alert System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [IDE Setup](#ide-setup)
3. [Environment Configuration](#environment-configuration)
4. [Project Structure](#project-structure)
5. [Running All Services](#running-all-services)
6. [Development Workflow](#development-workflow)
7. [Code Quality Tools](#code-quality-tools)
8. [Database Management](#database-management)
9. [Debugging](#debugging)
10. [IDE Extensions](#ide-extensions)

## Prerequisites

### Required Software

Ensure you have the following installed:

- **Git** - Version control
- **Java JDK 11+** - Backend development
- **Node.js 16+** - Mobile and web app development
- **npm 8+** - Package manager
- **MySQL 5.7+** - Database
- **Maven 3.6+** - Java build tool
- **Visual Studio Code** or **IntelliJ IDEA** - Code editor/IDE

### Verify Installation

```bash
# Check all required tools
java -version          # Should show Java 11+
node --version         # Should show Node 16+
npm --version          # Should show npm 8+
mysql --version        # Should show MySQL 5.7+
mvn --version          # Should show Maven 3.6+
git --version          # Should show Git 2.30+
```

## IDE Setup

### Visual Studio Code

**1. Install VS Code Extensions**

Essential extensions for development:

```bash
# JavaScript/TypeScript
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode

# Java
code --install-extension redhat.java
code --install-extension vscjava.vscode-maven

# Database
code --install-extension mtxr.sqltools
code --install-extension mtxr.sqltools-driver-mysql

# Git
code --install-extension eamodio.gitlens
code --install-extension donjayamanne.githistory

# Additional
code --install-extension ms-rest-client.rest-client
code --install-extension charliermarsh.ruff
code --install-extension ms-vscode.makefile-tools
```

**2. Configure VS Code Settings**

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[java]": {
    "editor.defaultFormatter": "redhat.java"
  },
  "eslint.format.enable": true,
  "java.format.settings.url": ".vscode/java-formatter.xml",
  "java.jdt.ls.vmargs": "-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx1G -Xms100m"
}
```

**3. Configure Java Formatter**

Create `.vscode/java-formatter.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<profiles version="21">
  <profile kind="CodeFormatterProfile" name="Google Style" version="21">
    <setting id="org.eclipse.jdt.core.formatter.lineSplit" value="100"/>
    <setting id="org.eclipse.jdt.core.formatter.indentation.size" value="2"/>
    <setting id="org.eclipse.jdt.core.formatter.tab.size" value="2"/>
  </profile>
</profiles>
```

**4. Launch Configuration**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Spring Boot App",
      "request": "launch",
      "mainClass": "com.ddas.DamDisasterAlertSystemApplication",
      "projectName": "api",
      "cwd": "${workspaceFolder}/api"
    }
  ]
}
```

### IntelliJ IDEA

**1. Create Project**

```bash
# Open project
File > Open... > dam-disaster-alert-system
```

**2. Configure SDK**

- Go to File > Project Structure > Project
- Set Project SDK to Java 11 or higher
- Apply changes

**3. Enable Maven**

- File > Project Structure > Modules
- Select `api` module
- Mark `src/main/java` as Sources
- Mark `src/main/resources` as Resources
- Mark `src/test/java` as Tests

**4. Install Plugins**

- Go to File > Settings > Plugins
- Search and install:
  - ESLint
  - Prettier
  - Maven
  - Spring Boot
  - REST Client

## Environment Configuration

### API Server Environment

**1. Create Configuration File**

Create `api/src/main/resources/application-dev.properties`:

```properties
# Server
server.port=8080
server.servlet.context-path=/api
server.error.include-message=always
server.error.include-stacktrace=always

# Database
spring.datasource.url=jdbc:mysql://localhost:3306/ddas?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=root
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.use_sql_comments=true
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect

# Logging
logging.level.root=INFO
logging.level.com.ddas=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# JWT
app.security.jwt.secret=your-dev-secret-key-for-jwt-tokens-change-in-production
app.security.jwt.expiration=86400000

# File Upload
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
```

**2. Run with Development Profile**

```bash
cd api
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

### Mobile App Environment

**1. Create Environment File**

Create `app/.env.local`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
EXPO_PUBLIC_APP_NAME=DDAS Development
EXPO_PUBLIC_LOG_LEVEL=debug
EXPO_PUBLIC_ENABLE_DEBUG_MENU=true
```

**2. Development Script**

Add to `app/package.json`:

```json
{
  "scripts": {
    "dev": "npx expo start --clear",
    "dev:android": "npx expo start --android",
    "dev:ios": "npx expo start --ios",
    "dev:web": "npx expo start --web"
  }
}
```

### Web Application Environment

**1. Create Environment File**

Create `web/.env.local`:

```
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=DDAS Development
VITE_DEBUG_MODE=true
```

**2. Development Script**

```bash
cd web
npm run dev
```

## Project Structure

```
dam-disaster-alert-system/
├── api/                          # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/ddas/
│   │   │   │       ├── controllers/    # REST endpoints
│   │   │   │       ├── services/       # Business logic
│   │   │   │       ├── repositories/   # Database access
│   │   │   │       ├── models/         # Entity classes
│   │   │   │       ├── dto/            # Data Transfer Objects
│   │   │   │       ├── security/       # Auth & security
│   │   │   │       └── utils/          # Utility functions
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       ├── application-dev.properties
│   │   │       ├── db/migration/       # Database migrations
│   │   │       └── static/             # Static files
│   │   └── test/                       # Unit and integration tests
│   ├── pom.xml                   # Maven configuration
│   ├── bruno/                    # API testing collection
│   └── DB\ SCHEMA/               # Database schemas
├── app/                          # React Native mobile app
│   ├── app/                      # App screens and navigation
│   ├── components/               # Reusable components
│   ├── services/                 # API client, utilities
│   ├── constants/                # App constants
│   ├── hooks/                    # Custom React hooks
│   ├── package.json              # Dependencies
│   └── tsconfig.json             # TypeScript config
├── web/                          # Vite web application
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── components/           # Reusable components
│   │   ├── services/             # API client
│   │   ├── store/                # State management
│   │   ├── utils/                # Utility functions
│   │   ├── styles/               # CSS/Tailwind
│   │   └── App.jsx               # Root component
│   ├── package.json              # Dependencies
│   └── vite.config.js            # Vite configuration
└── docs/                         # Documentation
```

## Running All Services

### Terminal Setup (Recommended)

Open multiple terminal windows or use a terminal multiplexer:

**Terminal 1: Database**
```bash
# Start MySQL (if not running as service)
mysql.server start  # macOS
# or
mysqld              # Windows/Linux
```

**Terminal 2: API Server**
```bash
cd api
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

**Terminal 3: Mobile App**
```bash
cd app
npm install
npx expo start
```

**Terminal 4: Web App**
```bash
cd web
npm install
npm run dev
```

### Docker Compose (Alternative)

```bash
# From project root
docker-compose up

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Bash/Shell Script (Automation)

Create `start-dev.sh`:

```bash
#!/bin/bash

echo "Starting Dam Disaster Alert System Development Environment..."

# Create new tmux session
TMUX_SESSION="ddas-dev"
tmux new-session -d -s $TMUX_SESSION -x 200 -y 50

# Window 1: API Server
tmux new-window -t $TMUX_SESSION -n api
tmux send-keys -t $TMUX_SESSION:api "cd api && mvn spring-boot:run" Enter

# Window 2: Mobile App
tmux new-window -t $TMUX_SESSION -n app
tmux send-keys -t $TMUX_SESSION:app "cd app && npm install && npx expo start" Enter

# Window 3: Web App
tmux new-window -t $TMUX_SESSION -n web
tmux send-keys -t $TMUX_SESSION:web "cd web && npm install && npm run dev" Enter

# Attach to session
tmux attach -t $TMUX_SESSION
```

Make executable and run:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

## Development Workflow

### Feature Development

**1. Create Feature Branch**
```bash
git checkout -b feature/feature-name
```

**2. Create Database Migration (if needed)**
```bash
# Create migration file
touch api/src/main/resources/db/migration/V001__initial_schema.sql
```

**3. Implement Backend Changes**
```bash
# Edit Java files in api/src/main/java
# Write unit tests in api/src/test/java
# Run tests
cd api
mvn test
```

**4. Implement Frontend Changes**
```bash
# Edit React components
# Run linter
npm run lint

# Fix issues
npm run lint:fix
```

**5. Test Full Stack**
```bash
# Ensure all services are running
# Test in mobile app, web app, and API

# Run integration tests
mvn integration-test
npm test
```

**6. Commit and Push**
```bash
git add .
git commit -m "[Feature] Descriptive commit message"
git push origin feature/feature-name
```

**7. Create Pull Request**
- Go to GitHub
- Create PR with detailed description
- Link related issues

### Code Review Process

1. **Request Review** - Assign reviewers
2. **Address Feedback** - Make requested changes
3. **Approval** - Wait for approval
4. **Merge** - Squash and merge to main

## Code Quality Tools

### Java Code Quality

**1. SonarQube Analysis**
```bash
cd api
mvn sonar:sonar -Dsonar.host.url=http://localhost:9000
```

**2. CheckStyle**
```bash
mvn checkstyle:check
```

**3. SpotBugs**
```bash
mvn spotbugs:check
```

### JavaScript/TypeScript Quality

**1. ESLint**
```bash
cd app
npm run lint              # Check
npm run lint:fix          # Fix automatically
```

**2. Prettier**
```bash
npm run format            # Format code
npm run format:check      # Check formatting
```

**3. TypeScript Check**
```bash
npm run type-check
```

### Test Coverage

**Java**
```bash
mvn jacoco:report
# View report: api/target/site/jacoco/index.html
```

**JavaScript**
```bash
npm test -- --coverage
# View report: coverage/
```

## Database Management

### Connect to Database

```bash
# Using MySQL CLI
mysql -u root -p ddas

# Using IDE tools
# IntelliJ: Database > New > MySQL
# VS Code: SQLTools > Add Connection
```

### Run Migrations

```bash
# Automatic on application startup (configured in application.properties)
# Or manual using Flyway
mvn flyway:migrate
```

### Seed Development Data

```bash
# Load sample data
mysql -u root -p ddas < api/DB\ SCHEMA/init_data.sql
mysql -u root -p ddas < api/DB\ SCHEMA/sample_sensor_data.sql
```

### Database Backup

```bash
# Backup
mysqldump -u root -p ddas > backup.sql

# Restore
mysql -u root -p ddas < backup.sql
```

## Debugging

### Debug Backend (Spring Boot)

**1. Configure Debug in IDE**

IntelliJ IDEA:
- Click Run > Debug... > Edit Configurations
- Create new Spring Boot configuration
- Set Main class: `com.ddas.DamDisasterAlertSystemApplication`

**2. Add Breakpoints**
- Click on line number in code editor
- Run in debug mode

**3. Debug Console**
- Use Debug tool window to step through code
- Watch variables and expressions

### Debug Frontend (React)

**1. Browser DevTools**
```bash
# In Expo app, press Shift+M for debug menu
# Select "Debug remote JS"
```

**2. React DevTools**
```bash
# Chrome extension for React debugging
# Open Chrome DevTools > React tab
```

**3. Network Debugging**
```bash
# In Expo menu, select "Debug network requests"
# Or use browser Network tab
```

### Debug Database

**1. Query Logs**
```properties
# In application-dev.properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

**2. MySQL Query Log**
```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';
SELECT * FROM mysql.general_log;
```

## IDE Extensions

### Visual Studio Code

Install recommended extensions from `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "redhat.java",
    "vscjava.vscode-maven",
    "eamodio.gitlens",
    "ms-rest-client.rest-client",
    "ms-vscode.makefile-tools"
  ]
}
```

### IntelliJ IDEA

- Built-in support for Java, Maven, Git
- Spring Boot plugin (auto-installed)
- ESLint and Prettier plugins available

## Performance Development Tips

1. **Use development profiles** - Load only necessary configs
2. **Enable hot reload** - Reload without full restart
3. **Optimize build times** - Use incremental compilation
4. **Monitor memory** - Watch for memory leaks
5. **Cache data** - Use Redis for development caching
6. **Use mock data** - Speed up API responses

## Next Steps

After setup is complete:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines
2. Explore [API Documentation](./API-ENDPOINTS.md)
3. Check [Architecture Documentation](./docs/ARCHITECTURE.md)
4. Review existing issues and pick one to start with

---

**Happy developing! 🚀**

