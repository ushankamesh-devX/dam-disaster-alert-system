# Troubleshooting Guide - Dam Disaster Alert System

This guide helps you diagnose and resolve common issues encountered while developing, deploying, or using the Dam Disaster Alert System.

## Table of Contents

1. [Database Issues](#database-issues)
2. [API Server Issues](#api-server-issues)
3. [Mobile App Issues](#mobile-app-issues)
4. [Web Application Issues](#web-application-issues)
5. [Network and Connectivity](#network-and-connectivity)
6. [Performance Issues](#performance-issues)
7. [Authentication Issues](#authentication-issues)
8. [Deployment Issues](#deployment-issues)
9. [General Tips](#general-tips)

## Database Issues

### MySQL Connection Refused

**Symptoms**:
- `ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost' (10061)`
- `java.sql.SQLException: Communications link failure`
- Connection timeout errors in logs

**Root Causes**:
- MySQL service not running
- Wrong host/port configuration
- Firewall blocking connection
- MySQL server crashed

**Solutions**:

```bash
# 1. Check if MySQL is running
# Windows
sc query MySQL80

# macOS
brew services list | grep mysql

# Linux
sudo systemctl status mysql

# 2. Start MySQL if not running
# Windows
net start MySQL80

# macOS
brew services start mysql

# Linux
sudo systemctl start mysql

# 3. Test connection directly
mysql -h localhost -u root -p

# 4. Check if port is listening
# Windows
netstat -ano | findstr :3306

# Linux/macOS
lsof -i :3306
```

**Configuration Check**:
```properties
# In api/src/main/resources/application.properties
spring.datasource.url=jdbc:mysql://localhost:3306/ddas
spring.datasource.username=root
spring.datasource.password=your_password
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

### Database Does Not Exist

**Symptoms**:
- `ERROR 1049 (42000): Unknown database 'ddas'`
- `Unknown database exception`

**Solutions**:

```bash
# 1. List existing databases
mysql -u root -p -e "SHOW DATABASES;"

# 2. Create database if missing
mysql -u root -p < api/DB\ SCHEMA/ddas_complete_schema.sql

# 3. Verify tables were created
mysql -u root -p ddas -e "SHOW TABLES;"

# 4. Load initial data
mysql -u root -p < api/DB\ SCHEMA/init_data.sql
```

### Access Denied for User

**Symptoms**:
- `Access denied for user 'root'@'localhost'`
- `Authentication plugin error`

**Solutions**:

```bash
# 1. Reset MySQL root password
# Windows - stop service, start with --skip-grant-tables
net stop MySQL80
mysqld --skip-grant-tables

# In another terminal
mysql -u root
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword';
EXIT;

# 2. Verify credentials in application.properties
# Update with correct username and password

# 3. Test connection with credentials
mysql -u root -p -h localhost
```

### Slow Queries

**Symptoms**:
- Queries taking excessively long time
- Application timeout errors
- High database CPU usage

**Solutions**:

```sql
-- Check slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Monitor active queries
SHOW PROCESSLIST;

-- Add indexes for frequently queried columns
CREATE INDEX idx_dam_id ON sensors(dam_id);
CREATE INDEX idx_timestamp ON sensor_readings(timestamp);

-- Analyze query performance
EXPLAIN SELECT * FROM sensor_readings WHERE dam_id = 1;
```

## API Server Issues

### Port 8080 Already in Use

**Symptoms**:
- `Address already in use`
- `Bind exception on port 8080`

**Solutions**:

```bash
# Windows - Find and kill process
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/macOS - Find and kill process
lsof -i :8080
kill -9 <PID>

# Or change port in application.properties
server.port=8081
```

### Maven Build Failures

**Symptoms**:
- Build errors during `mvn clean install`
- `Could not find artifact` errors
- `Compilation failure`

**Solutions**:

```bash
# 1. Clear Maven cache
rm -rf ~/.m2/repository

# 2. Update dependencies
mvn clean install -U

# 3. Check Java version (should be 11+)
java -version

# 4. Check Maven version (should be 3.6+)
mvn -v

# 5. Enable offline mode if you've downloaded dependencies before
mvn -o clean install
```

### Application Fails to Start

**Symptoms**:
- Application crashes on startup
- Spring Boot startup fails
- ClassNotFoundException or similar errors

**Solutions**:

```bash
# 1. Check detailed error logs
mvn spring-boot:run 2>&1 | tail -50

# 2. Verify all dependencies are downloaded
mvn dependency:resolve

# 3. Clean and rebuild
mvn clean package

# 4. Check application.properties for syntax errors
# Look for missing properties or incorrect format

# 5. Run in debug mode
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=5005"
```

### API Endpoints Return 404

**Symptoms**:
- All API calls return 404 Not Found
- Endpoints not accessible
- Routes not recognized

**Solutions**:

```bash
# 1. Check server is running
curl http://localhost:8080/api/health

# 2. Verify context path
# Check in application.properties
server.servlet.context-path=/api

# 3. Correct URL format
# Should be: http://localhost:8080/api/endpoint
# Not: http://localhost:8080/endpoint

# 4. Check if endpoint exists
# Review controller classes in src/main/java

# 5. Check for typos in path
curl -v http://localhost:8080/api/dams
```

### High Memory Usage

**Symptoms**:
- Java process consuming high memory
- OutOfMemoryError exceptions
- Application slowing down over time

**Solutions**:

```bash
# 1. Adjust JVM memory settings
# Set in mvn command
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xmx1024m -Xms512m"

# 2. Profile application to find memory leaks
# Use jvisualvm or JProfiler

# 3. Check for memory leaks in code
# Look for unclosed resources, infinite loops

# 4. Monitor with jps and jstat
jps  # Find Java process ID
jstat -gc <PID> 1000  # Monitor garbage collection every 1 second
```

## Mobile App Issues

### Dependencies Not Installed

**Symptoms**:
- `Cannot find module` errors
- `npm ERR! code ERESOLVE`
- Missing packages

**Solutions**:

```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules
rm -rf node_modules package-lock.json

# 3. Reinstall dependencies
npm install

# 4. Use npm ci for exact versions
npm ci

# 5. Check Node version (should be 16+)
node -v
npm -v
```

### Expo Server Not Starting

**Symptoms**:
- `Starting Expo server...` hangs forever
- Connection errors
- QR code not generated

**Solutions**:

```bash
# 1. Kill any existing Expo processes
# Windows
taskkill /IM expo.exe /F

# Linux/macOS
pkill -f expo

# 2. Clear Expo cache
npx expo start --clear

# 3. Check port availability (default 19000)
netstat -ano | findstr :19000

# 4. Use different tunnel type
npx expo start --tunnel
npx expo start --localhost
npx expo start --lan

# 5. Verify internet connection
ping 8.8.8.8
```

### App Crashes on Load

**Symptoms**:
- App crashes immediately after opening
- Blank screen or error screen
- Runtime errors

**Solutions**:

```bash
# 1. Check logs
npx expo start

# 2. Look for JavaScript errors
# Check console output carefully

# 3. Verify API connection
# Check API_URL in env configuration
# Ensure API server is running

# 4. Clear app cache
# On emulator/device, clear app data

# 5. Check for TypeScript errors
npm run type-check
```

### Emulator/Device Connection Issues

**Symptoms**:
- Cannot connect to Expo server
- Emulator not detected
- Device not appearing in Expo Go

**Solutions**:

```bash
# Android Emulator
# 1. Start emulator first
emulator -avd <emulator_name>

# 2. List running emulators
adb devices

# 3. Test connection
adb shell

# iOS Simulator (macOS only)
# 1. Open Xcode
# 2. Go to Xcode > Open Developer Tool > Simulator

# Physical Device
# 1. Ensure on same WiFi network
# 2. Firewall not blocking ports
# 3. Use LAN connection mode
npx expo start --lan

# 4. Scan QR code with device
# Android: Expo Go app > Scan QR
# iOS: iOS camera app > tap notification
```

## Web Application Issues

### Dev Server Not Starting

**Symptoms**:
- `npm run dev` fails to start
- Port already in use
- Vite server error

**Solutions**:

```bash
# 1. Check if port 5173 is available
# Windows
netstat -ano | findstr :5173

# Linux/macOS
lsof -i :5173

# 2. Kill process using the port
# Windows
taskkill /PID <PID> /F

# Linux/macOS
kill -9 <PID>

# 3. Change port in vite.config.js
export default {
  server: {
    port: 5174  // Use different port
  }
}

# 4. Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Build Failures

**Symptoms**:
- `npm run build` fails
- Compilation errors
- Missing dependencies

**Solutions**:

```bash
# 1. Check for syntax errors
npm run lint

# 2. Run type checking (if using TypeScript)
npm run type-check

# 3. Clear build cache
rm -rf dist

# 4. Rebuild with detailed logging
npm run build -- --debug

# 5. Check all dependencies
npm ls

# 6. Update dependencies if needed
npm update
```

### Styling Issues (Tailwind)

**Symptoms**:
- Tailwind classes not applied
- Styles not loading
- CSS not compiling

**Solutions**:

```bash
# 1. Rebuild Tailwind
npm run build

# 2. Check tailwind.config.js paths are correct
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
}

# 3. Purge cache
rm -rf node_modules/.cache

# 4. Restart dev server
npm run dev

# 5. Verify PostCSS config
# Check for postcss.config.js
```

### API Communication Errors

**Symptoms**:
- CORS errors in console
- Network requests failing
- 404 errors on valid endpoints

**Solutions**:

```bash
# 1. Check API URL configuration
// .env.local
VITE_API_URL=http://localhost:8080/api

# 2. Verify API server is running
curl http://localhost:8080/api/health

# 3. Check CORS configuration in API
# Should allow requests from localhost:5173

# 4. Check network tab in browser DevTools
# Look for failed requests

# 5. Test endpoint directly
curl http://localhost:8080/api/dams
```

## Network and Connectivity

### CORS Errors

**Symptoms**:
- `Cross-Origin Request Blocked`
- Browser console CORS errors
- Requests blocked by browser

**Solutions**:

```java
// Backend - Configure CORS in Spring Boot
// Add to RestController or WebMvcConfigurer
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173", "http://localhost:3000")
            .allowedMethods("*")
            .allowedHeaders("*");
    }
}
```

### Connection Timeout

**Symptoms**:
- Requests hang indefinitely
- Connection refused
- Network unreachable

**Solutions**:

```bash
# 1. Check network connectivity
ping 8.8.8.8
ping localhost

# 2. Check firewall settings
# Ensure ports 3306, 8080, 5173 are not blocked

# 3. Verify services are running
# Database, API server, dev server

# 4. Check request timeouts in code
// Frontend - Increase timeout
const timeout = 30000; // 30 seconds

# 5. Monitor network with tcpdump or similar
tcpdump -i any port 8080
```

## Performance Issues

### Slow Application Load

**Symptoms**:
- Page takes long time to load
- Blank page for extended period
- High latency

**Solutions**:

```bash
# 1. Check network performance
# Use browser DevTools > Network tab

# 2. Profile with Lighthouse (Chrome)
# Right-click > Inspect > Lighthouse

# 3. Check database query performance
# Look for slow queries in database

# 4. Enable caching headers
# Configure in nginx or API response

# 5. Optimize bundle size
npm run build --report

# 6. Use browser cache
# DevTools > Application > Cache Storage
```

### High CPU Usage

**Symptoms**:
- CPU usage constantly high
- Fan running loudly
- Device heating up

**Solutions**:

```bash
# 1. Check which process is using CPU
# Windows
tasklist /v | findstr API.jar

# Linux
top -p $(pgrep -f "java.*api")

# 2. Look for infinite loops in code
# Review recent changes

# 3. Monitor with profiler
# Use JProfiler or YourKit for Java

# 4. Check for memory leaks
jstat -gc <PID>

# 5. Review database queries
# Check for N+1 query problems
```

## Authentication Issues

### Login Not Working

**Symptoms**:
- Login fails with wrong credentials error
- Session not creating
- Authentication endpoint returning 401

**Solutions**:

```bash
# 1. Check user exists in database
mysql -u root -p ddas
SELECT * FROM users WHERE email='user@example.com';

# 2. Verify password hashing
# Check password hashing algorithm in code

# 3. Check authentication configuration
# Review security config in backend

# 4. Clear browser cache and cookies
# DevTools > Application > Clear Storage

# 5. Check JWT token (if using)
# Verify token expiration and signing key
```

### Session Expiration

**Symptoms**:
- User logged out unexpectedly
- Session timeout too short
- Need to login repeatedly

**Solutions**:

```properties
# Adjust session timeout in application.properties
server.servlet.session.timeout=30m

# Or in JWT configuration
jwt.expiration=86400000  # 24 hours in milliseconds
```

## Deployment Issues

### Docker Build Fails

**Symptoms**:
- `docker build` fails
- Dependencies not found
- Build context errors

**Solutions**:

```bash
# 1. Check Dockerfile syntax
docker build --no-cache -t app:latest .

# 2. Verify base image exists
docker pull openjdk:11-slim

# 3. Check build context
docker build -f api/Dockerfile .

# 4. View build logs
docker build --progress=plain -t app:latest .

# 5. Build individual layers
docker build --target base -t app:base .
```

### Container Port Mapping Issues

**Symptoms**:
- Cannot access service in container
- Port mapping not working
- Connection refused from host

**Solutions**:

```bash
# 1. Check port mapping
docker ps

# 2. Verify container is listening
docker exec <container> netstat -tlnp

# 3. Correct port mapping syntax
docker run -p 8080:8080 app:latest

# 4. Check firewall
# Ensure Docker port is allowed

# 5. Access via container IP
docker inspect <container> | grep IPAddress
```

## General Tips

### Enable Debug Logging

```properties
# For Spring Boot
logging.level.root=DEBUG
logging.level.com.example=DEBUG

# For specific modules
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate=DEBUG
```

### View Application Logs

```bash
# API Server logs
tail -f api/logs/application.log

# Docker container logs
docker logs <container_name> -f

# System logs
# Windows: Event Viewer
# Linux: /var/log/syslog
# macOS: /var/log/system.log
```

### Restart Services

```bash
# Restart all services
# Windows
net stop MySQL80 && net start MySQL80

# Linux/macOS
sudo systemctl restart mysql
sudo systemctl restart nginx

# Docker Compose
docker-compose restart
```

### Check System Resources

```bash
# Check available memory and disk
# Windows
wmic os get totalvisiblememorysize
wmic logicaldisk get size

# Linux/macOS
free -h
df -h
```

### Create Diagnostic Report

When reporting issues:

```bash
# Collect system information
uname -a

# Java version
java -version

# Database version
mysql --version

# Node version
node -v && npm -v

# Application logs (last 100 lines)
tail -100 app.log > diagnostic.txt

# Error messages and stack traces
```

### Contact Support

If you cannot resolve the issue:

1. **Check Documentation**:
   - Review [README.md](./README.md)
   - Check [Architecture Docs](./docs/ARCHITECTURE.md)

2. **Search Existing Issues**:
   - GitHub Issues page
   - Stack Overflow

3. **Create Detailed Issue Report**:
   - Include diagnostic information
   - Provide reproducible steps
   - Attach relevant logs

4. **Reach Out to Maintainers**:
   - Use GitHub Discussions
   - Email project team

---

**Remember**: Most issues can be resolved by carefully reading error messages, checking logs, and following systematic debugging steps. Take time to understand what the system is telling you.

