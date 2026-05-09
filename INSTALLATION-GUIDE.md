# Installation Guide - Dam Disaster Alert System

This guide provides step-by-step instructions to set up the Dam Disaster Alert System on your local machine.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Setup](#quick-setup)
3. [Detailed Setup](#detailed-setup)
   - [Database Setup](#database-setup)
   - [API Server Setup](#api-server-setup)
   - [Mobile App Setup](#mobile-app-setup)
   - [Web Application Setup](#web-application-setup)
4. [Docker Setup](#docker-setup)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM**: 8 GB (16 GB recommended)
- **Storage**: 10 GB free space
- **Internet**: Stable connection required

### Software Requirements

| Software | Version | Purpose |
|----------|---------|---------|
| Java JDK | 11 or higher | Backend API server |
| Node.js | 16 or higher | Mobile and web apps |
| npm | 8 or higher | Package manager |
| MySQL | 5.7 or 8.0 | Database |
| Git | 2.30 or higher | Version control |
| Maven | 3.6 or higher | Java build tool |
| Docker | 20.10+ (optional) | Containerization |
| Docker Compose | 1.29+ (optional) | Multi-container orchestration |

## Quick Setup

For experienced developers, here's a quick setup:

```bash
# 1. Clone the repository
git clone https://github.com/dam-disaster-alert-system/dam-disaster-alert-system.git
cd dam-disaster-alert-system

# 2. Set up database
mysql -u root -p < api/DB\ SCHEMA/ddas_complete_schema.sql
mysql -u root -p < api/DB\ SCHEMA/init_data.sql

# 3. Set up and run API
cd api
mvn clean install
mvn spring-boot:run

# 4. In a new terminal, set up and run mobile app
cd app
npm install
npx expo start

# 5. In another terminal, set up and run web app
cd web
npm install
npm run dev
```

## Detailed Setup

### Prerequisites Installation

#### Windows

**1. Install Java JDK**
- Download from [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://adoptopenjdk.net/)
- Run the installer and follow the setup wizard
- Add to PATH:
  - Open Environment Variables (Win+R, type `sysdm.cpl`)
  - Add `C:\Program Files\Java\jdk-xx\bin` to PATH

**2. Install Node.js**
- Download from [nodejs.org](https://nodejs.org/)
- Run the installer (LTS version recommended)
- Verify installation: `node -v` and `npm -v`

**3. Install MySQL**
- Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
- Run the installer
- Choose Setup Type: Developer Default
- Keep default port: 3306
- Configure MySQL Server as Windows Service
- Create MySQL user: root (or your preferred username)

**4. Install Git**
- Download from [git-scm.com](https://git-scm.com/)
- Run the installer with default settings
- Verify: `git --version`

**5. Install Maven**
- Download from [maven.apache.org](https://maven.apache.org/download.cgi)
- Extract to `C:\Program Files\Apache\maven`
- Add `C:\Program Files\Apache\maven\bin` to PATH
- Verify: `mvn -v`

#### macOS

```bash
# Using Homebrew (install from https://brew.sh if not already installed)

# Install Java
brew install openjdk@11
sudo ln -sfn /opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-11.jdk

# Install Node.js
brew install node

# Install MySQL
brew install mysql
brew services start mysql

# Install Git
brew install git

# Install Maven
brew install maven

# Create MySQL user
mysql -u root
mysql> ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
mysql> FLUSH PRIVILEGES;
```

#### Linux (Ubuntu)

```bash
# Update package manager
sudo apt-get update

# Install Java
sudo apt-get install openjdk-11-jdk

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install nodejs

# Install MySQL
sudo apt-get install mysql-server

# Install Git
sudo apt-get install git

# Install Maven
sudo apt-get install maven

# Secure MySQL installation
sudo mysql_secure_installation
```

### Database Setup

**1. Start MySQL Service**

Windows:
```bash
net start MySQL80  # or your MySQL version
```

macOS:
```bash
brew services start mysql
```

Linux:
```bash
sudo systemctl start mysql
```

**2. Create Database**

```bash
# Connect to MySQL
mysql -u root -p

# Execute setup scripts
mysql -u root -p < api/DB\ SCHEMA/ddas_complete_schema.sql
mysql -u root -p < api/DB\ SCHEMA/init_data.sql
```

**3. Verify Database**

```bash
mysql -u root -p
mysql> SHOW DATABASES;
mysql> USE ddas;
mysql> SHOW TABLES;
```

### API Server Setup

**1. Navigate to API Directory**

```bash
cd api
```

**2. Install Maven Dependencies**

```bash
mvn clean install
```

This may take 5-10 minutes on first run as it downloads dependencies.

**3. Configure Application Properties**

Edit `api/src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/ddas?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect

# Server Configuration
server.port=8080
server.servlet.context-path=/api

# Logging
logging.level.root=INFO
```

**4. Build the Project**

```bash
mvn clean package
```

**5. Run the API Server**

```bash
mvn spring-boot:run
```

Or run the JAR file directly:

```bash
java -jar target/api-0.0.1-SNAPSHOT.jar
```

**6. Verify API is Running**

```bash
# In a new terminal
curl http://localhost:8080/api/health
```

### Mobile App Setup

**1. Navigate to App Directory**

```bash
cd app
```

**2. Install Dependencies**

```bash
npm install
```

**3. Configure Environment**

Create or update `.env.local`:

```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
EXPO_PUBLIC_APP_NAME=DDAS Mobile
```

**4. Start Development Server**

```bash
npx expo start
```

**5. Run on Device or Emulator**

- **iOS Simulator** (macOS only):
  - Press `i` in the terminal
  - Xcode simulator will open

- **Android Emulator**:
  - Press `a` in the terminal
  - Android emulator will open

- **Physical Device**:
  - Download Expo Go app from App Store or Google Play
  - Scan QR code displayed in terminal

### Web Application Setup

**1. Navigate to Web Directory**

```bash
cd web
```

**2. Install Dependencies**

```bash
npm install
```

**3. Configure Environment**

Create `.env.local`:

```
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=DDAS Web
```

**4. Start Development Server**

```bash
npm run dev
```

**5. Access Application**

Open browser and navigate to:
```
http://localhost:5173
```

## Docker Setup

For a containerized setup without installing individual dependencies:

**1. Ensure Docker and Docker Compose are Installed**

```bash
docker --version
docker-compose --version
```

**2. Build and Run Containers**

```bash
# From project root
docker-compose up -d
```

**3. Verify Services**

```bash
docker-compose ps
docker logs api
docker logs app
docker logs web
```

**4. Access Applications**

- API: `http://localhost:8080/api`
- Web App: `http://localhost:3000`
- Mobile: Through Expo

## Verification

### Check All Services

```bash
# API Health Check
curl http://localhost:8080/api/health

# Database Connection
mysql -u root -p -e "SELECT * FROM ddas.users LIMIT 1;"

# Mobile/Web (open in browser)
http://localhost:5173  # Web App
http://localhost:8081  # API Documentation (if available)
```

### Run Tests

```bash
# API Tests
cd api
mvn test

# Mobile App Tests
cd ../app
npm test

# Web App Tests
cd ../web
npm test
```

## Troubleshooting

### Common Issues and Solutions

#### 1. MySQL Connection Failed

**Problem**: `Connection refused: localhost:3306`

**Solutions**:
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `application.properties`
- Ensure port 3306 is not blocked by firewall
- Windows: Check MySQL service status `net start MySQL80`

#### 2. Java Version Mismatch

**Problem**: `JAVA_HOME not set` or `Wrong Java version`

**Solutions**:
- Set JAVA_HOME environment variable
- Windows: `set JAVA_HOME=C:\Program Files\Java\jdk-11`
- Linux/macOS: `export JAVA_HOME=/usr/libexec/java_home -v 11`
- Verify: `java -version`

#### 3. Port Already in Use

**Problem**: `Port 8080 already in use` (or 3000, 5173)

**Solutions**:
- Check what's using the port:
  - Windows: `netstat -ano | findstr :8080`
  - Linux/macOS: `lsof -i :8080`
- Change port in configuration files
- Kill the process using the port

#### 4. Node Modules Issues

**Problem**: `npm ERR! code ERESOLVE`

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

#### 5. Maven Dependencies Not Downloaded

**Problem**: `Could not find artifact...`

**Solutions**:
```bash
# Clear Maven cache
mvn clean install -U

# Or manually clear cache
rm -rf ~/.m2/repository
mvn clean install
```

#### 6. Database Schema Not Found

**Problem**: `Unknown database 'ddas'`

**Solutions**:
- Verify schema files exist in `api/DB\ SCHEMA/`
- Run setup scripts again:
  ```bash
  mysql -u root -p < api/DB\ SCHEMA/ddas_complete_schema.sql
  ```

### Getting Help

If you encounter issues not covered here:

1. Check existing [GitHub Issues](https://github.com/dam-disaster-alert-system/dam-disaster-alert-system/issues)
2. Search project documentation in `docs/` folder
3. Review logs in respective directories
4. Create a new issue with detailed error information

## Next Steps

After successful installation:

1. Review [QUICKSTART.md](./docs/QUICKSTART.md) for first steps
2. Check [Architecture Documentation](./docs/ARCHITECTURE.md) to understand the system
3. Explore API endpoints in `api/bruno/` folder
4. Review [CONTRIBUTING.md](./CONTRIBUTING.md) if you plan to contribute

---

**Congratulations! Your Dam Disaster Alert System is now set up and ready to use.** 🎉

