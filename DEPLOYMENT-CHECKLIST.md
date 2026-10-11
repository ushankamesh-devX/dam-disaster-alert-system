# Deployment Checklist - Dam Disaster Alert System

Pre-deployment, deployment, and post-deployment verification checklist for the Dam Disaster Alert System.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Security Checklist](#security-checklist)
8. [Performance Optimization](#performance-optimization)

## Pre-Deployment Checklist

### Code Quality Review

- [ ] All unit tests passing (`mvn test`)
- [ ] All integration tests passing (`mvn verify`)
- [ ] Frontend tests passing (`npm test`)
- [ ] Code coverage above 75%
- [ ] No console errors or warnings
- [ ] No linting errors (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code review approved by 2+ reviewers
- [ ] No hardcoded credentials or API keys
- [ ] Error handling implemented for all APIs

### Documentation

- [ ] README.md updated
- [ ] API documentation updated
- [ ] Database schema changes documented
- [ ] Migration scripts created and tested
- [ ] Deployment guide completed
- [ ] Known issues documented
- [ ] Configuration changes documented

### Dependency Check

- [ ] No critical security vulnerabilities
  ```bash
  npm audit
  mvn dependency-check:check
  ```
- [ ] Outdated dependencies reviewed
- [ ] New dependencies approved by team
- [ ] Version compatibility verified across modules

### Database

- [ ] Database migrations tested locally
- [ ] Backup strategy confirmed
- [ ] Data migration scripts prepared
- [ ] Rollback scripts prepared
- [ ] Schema changes compatible with current version

### Configuration

- [ ] Environment variables documented
- [ ] Configuration files prepared
- [ ] Secrets stored in secure vault (not in code)
- [ ] Database connection string verified
- [ ] API endpoints verified
- [ ] Email configuration tested
- [ ] File upload paths configured
- [ ] Logging levels configured appropriately

### Testing Scenarios

- [ ] User login flow tested
- [ ] Dam dashboard loads correctly
- [ ] Alert creation and notification tested
- [ ] Sensor data ingestion verified
- [ ] Report generation tested
- [ ] Mobile app functionality verified
- [ ] Web app functionality verified
- [ ] API endpoints responding correctly
- [ ] Authentication/authorization working

### Performance

- [ ] Application load time acceptable (< 3 seconds)
- [ ] Database queries optimized
- [ ] API response times within SLA (< 500ms)
- [ ] Memory usage monitored
- [ ] No memory leaks detected
- [ ] Caching strategies implemented
- [ ] CDN configured (if applicable)

### Security Review

- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Authentication enforced on protected endpoints
- [ ] Authorization checks implemented
- [ ] Sensitive data encrypted
- [ ] Password policies enforced
- [ ] Rate limiting configured
- [ ] API keys rotated
- [ ] SSL/TLS certificates valid

## Infrastructure Setup

### Server Requirements

#### Production Environment

```yaml
API Server:
  CPU: 4 cores (minimum)
  RAM: 8 GB (minimum)
  Storage: 100 GB SSD
  OS: Ubuntu 20.04 LTS or CentOS 8

Database Server:
  CPU: 8 cores
  RAM: 16 GB
  Storage: 500 GB SSD (for data) + 500 GB (for backups)
  OS: Ubuntu 20.04 LTS or CentOS 8

Web/Mobile Server:
  CPU: 2 cores
  RAM: 4 GB
  Storage: 50 GB SSD
  OS: Ubuntu 20.04 LTS or CentOS 8

Load Balancer:
  Type: Nginx or HAProxy
  CPU: 2 cores
  RAM: 2 GB
```

### Network Configuration

- [ ] Firewall rules configured
  - [ ] Port 80 (HTTP) open to internet
  - [ ] Port 443 (HTTPS) open to internet
  - [ ] Port 3306 (MySQL) restricted to internal network
  - [ ] Port 8080 (API) restricted to load balancer
  - [ ] Port 5173 (Vite dev) restricted as needed

- [ ] DNS records configured
  - [ ] A record pointing to load balancer
  - [ ] MX records for email (if applicable)
  - [ ] TXT records for verification

- [ ] SSL/TLS Certificate
  - [ ] Certificate obtained (Let's Encrypt or commercial)
  - [ ] Certificate installed
  - [ ] Certificate expiration monitored
  - [ ] Auto-renewal configured

### Database Setup

```bash
# Create database and user
CREATE DATABASE ddas_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ddas_user'@'%' IDENTIFIED BY 'strong_password_here';
GRANT ALL PRIVILEGES ON ddas_prod.* TO 'ddas_user'@'%';
FLUSH PRIVILEGES;

# Verify user
SELECT user, host FROM mysql.user;
```

### Container Setup (Docker)

- [ ] Docker installed and running
- [ ] Docker images built and tested
  ```bash
  docker build -t ddas-api:prod .
  docker build -t ddas-web:prod web/.
  ```
- [ ] Container registry configured (Docker Hub, ECR, etc.)
- [ ] Images pushed to registry
- [ ] Docker Compose file updated for production
- [ ] Environment variables file created
- [ ] Volume mounts configured

## Deployment Steps

### Pre-Deployment

```bash
# Step 1: Create deployment branch
git checkout -b deploy/production-$(date +%Y%m%d)

# Step 2: Tag release
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin deploy/production-$(date +%Y%m%d)
git push origin v1.0.0

# Step 3: Create backup
mysqldump -u root -p ddas > ddas_backup_$(date +%Y%m%d_%H%M%S).sql

# Step 4: Log deployment
echo "Deployment started: $(date)" > deployment.log
```

### Database Migration

```bash
# Step 1: Run migrations
cd api
mvn flyway:migrate -Dflyway.url=jdbc:mysql://prod-db:3306/ddas_prod \
  -Dflyway.user=ddas_user \
  -Dflyway.password=<password>

# Step 2: Verify schema
mysql -h prod-db -u ddas_user -p -e "SHOW TABLES;" ddas_prod
```

### API Server Deployment

#### Using Docker

```bash
# Step 1: Stop current container
docker stop ddas-api || true
docker rm ddas-api || true

# Step 2: Pull new image
docker pull registry.example.com/ddas-api:prod

# Step 3: Run new container
docker run -d \
  --name ddas-api \
  -p 8080:8080 \
  -e DB_HOST=mysql-prod \
  -e DB_USER=ddas_user \
  -e DB_PASSWORD=<password> \
  -e JWT_SECRET=<secret> \
  -v /data/logs:/app/logs \
  registry.example.com/ddas-api:prod

# Step 4: Verify container is running
docker ps | grep ddas-api
docker logs ddas-api
```

#### Using Java Standalone

```bash
# Step 1: Stop current service
sudo systemctl stop ddas-api || true

# Step 2: Update application JAR
sudo cp target/api-0.0.1-SNAPSHOT.jar /opt/ddas/api/app.jar

# Step 3: Update configuration
sudo cp application-prod.properties /opt/ddas/api/

# Step 4: Start service
sudo systemctl start ddas-api

# Step 5: Check status
sudo systemctl status ddas-api
```

### Web Application Deployment

```bash
# Step 1: Build production bundle
cd web
npm run build

# Step 2: Deploy to web server
rsync -avz dist/ /var/www/ddas-web/

# Step 3: Update nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/ddas

# Step 4: Test nginx configuration
sudo nginx -t

# Step 5: Reload nginx
sudo systemctl reload nginx
```

### Mobile Application Deployment

```bash
# Step 1: Build for iOS
cd app
eas build --platform ios --auto-submit

# Step 2: Build for Android
eas build --platform android --auto-submit

# Step 3: Monitor build progress
eas build:list

# Step 4: Submit to stores
eas submit
```

## Post-Deployment Verification

### Immediate Verification (0-5 minutes)

- [ ] API server running and accessible
  ```bash
  curl https://api.example.com/api/health
  ```

- [ ] Database connection working
  ```bash
  curl https://api.example.com/api/dams
  ```

- [ ] Web application loading
  ```bash
  # Open https://example.com in browser
  # Check browser console for errors
  ```

- [ ] SSL/TLS certificate valid
  ```bash
  curl -v https://api.example.com
  ```

- [ ] No 500 errors in logs
  ```bash
  tail -f /var/log/ddas/api.log | grep ERROR
  ```

### Functional Verification (5-30 minutes)

- [ ] User authentication working
  - [ ] Login successful
  - [ ] Token generation working
  - [ ] Password reset functional

- [ ] Core features working
  - [ ] Can view dam list
  - [ ] Can view dam details
  - [ ] Sensor data loading
  - [ ] Alerts displaying correctly
  - [ ] Reports generating

- [ ] Mobile app connectivity
  - [ ] App can connect to API
  - [ ] Push notifications working
  - [ ] Data sync functioning

- [ ] Email notifications
  - [ ] Test email sent
  - [ ] Formatting correct
  - [ ] Links working

### Performance Verification (30-60 minutes)

- [ ] API response times
  ```bash
  # Test multiple endpoints
  time curl https://api.example.com/api/dams
  time curl https://api.example.com/api/alerts
  ```

- [ ] Load testing
  ```bash
  # Basic load test
  ab -n 100 -c 10 https://api.example.com/api/health
  ```

- [ ] Database query performance
  ```sql
  SHOW PROCESSLIST;
  SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'ddas_prod';
  ```

- [ ] Memory and CPU usage
  ```bash
  docker stats  # If using Docker
  top           # General system monitoring
  ```

- [ ] Page load times
  - [ ] Web app initial load < 3 seconds
  - [ ] API response times < 500ms
  - [ ] Mobile app loads quickly

### Security Verification

- [ ] HTTPS enforced
  ```bash
  curl -I http://example.com  # Should redirect to HTTPS
  ```

- [ ] Security headers present
  ```bash
  curl -I https://example.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
  ```

- [ ] No sensitive data in logs
  - [ ] No passwords in logs
  - [ ] No API keys in logs
  - [ ] No personal information in logs

- [ ] Authentication working securely
  - [ ] Sessions timeout correctly
  - [ ] CSRF protection active
  - [ ] Rate limiting functioning

## Rollback Procedures

### When to Rollback

- Critical bugs discovered
- Performance degradation > 50%
- Security vulnerability exploited
- Data integrity issues
- External service dependency failure

### Rollback Steps

```bash
# Step 1: Stop current services
docker stop ddas-api ddas-web || true
sudo systemctl stop ddas-api ddas-web || true

# Step 2: Restore from backup
git checkout <previous-tag>
docker pull registry.example.com/ddas-api:<previous-version>

# Step 3: Restore database (if needed)
mysqldump -u root -p ddas_prod > ddas_prod_failed_$(date +%Y%m%d_%H%M%S).sql
mysql -u root -p ddas_prod < ddas_backup_<date>.sql

# Step 4: Start previous version
docker run -d --name ddas-api -p 8080:8080 registry.example.com/ddas-api:<previous-version>

# Step 5: Verify rollback successful
curl https://api.example.com/api/health

# Step 6: Document rollback
echo "Rollback completed at $(date)" >> deployment.log
```

### Post-Rollback Analysis

- [ ] Investigate root cause
- [ ] Document findings
- [ ] Fix issues locally
- [ ] Test thoroughly
- [ ] Plan new deployment

## Monitoring and Logging

### Application Monitoring

**Metrics to Monitor**

```bash
# CPU Usage
top -b -n 1 | head -20

# Memory Usage
free -h

# Disk Usage
df -h

# Network Usage
netstat -i

# Process Status
ps aux | grep java
ps aux | grep node
```

**Key Alerts**

- [ ] CPU usage > 80%
- [ ] Memory usage > 85%
- [ ] Disk usage > 90%
- [ ] Error rate > 1%
- [ ] API response time > 1000ms
- [ ] Database connection pool exhausted

### Application Logging

**Enable Comprehensive Logging**

```properties
# application-prod.properties
logging.level.root=INFO
logging.level.com.ddas=INFO
logging.level.org.springframework.web=WARN
logging.level.org.hibernate=WARN

# Log to file
logging.file.name=/var/log/ddas/application.log
logging.file.max-size=10MB
logging.file.max-history=30
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss} - %msg%n
```

**Log Aggregation**

- [ ] Set up centralized logging (ELK, Splunk)
- [ ] Monitor logs for errors
- [ ] Set up alerts for critical errors
- [ ] Archive old logs

## Security Checklist

### Infrastructure Security

- [ ] Firewall rules configured restrictively
- [ ] SSH keys secured (permissions 600)
- [ ] SSH password authentication disabled
- [ ] Fail2ban or similar configured
- [ ] Regular security patches applied
- [ ] SELinux or AppArmor configured

### Application Security

- [ ] All API endpoints authenticate requests
- [ ] Authorization checks on all protected endpoints
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] Output encoding applied

### Data Security

- [ ] Database backups encrypted
- [ ] Database backups tested
- [ ] Backup retention policy enforced
- [ ] Data encryption at rest
- [ ] Data encryption in transit (HTTPS)
- [ ] Sensitive fields masked in logs

### Access Control

- [ ] Administrator accounts restricted
- [ ] Multi-factor authentication enabled
- [ ] Regular access reviews
- [ ] Principle of least privilege applied
- [ ] API keys rotated regularly
- [ ] JWT secrets rotated

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_dam_id ON sensors(dam_id);
CREATE INDEX idx_timestamp ON sensor_readings(timestamp);
CREATE INDEX idx_alert_status ON alerts(status);

-- Archive old data
DELETE FROM sensor_readings WHERE timestamp < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Optimize tables
OPTIMIZE TABLE sensors;
OPTIMIZE TABLE sensor_readings;
OPTIMIZE TABLE alerts;
```

### API Optimization

```java
// Add response caching
@Cacheable(value = "dams", unless = "#result == null")
public List<Dam> getAllDams() { }

// Implement pagination
@GetMapping("/dams")
public Page<Dam> getDams(@PageableDefault(size = 20) Pageable pageable) { }

// Use DTOs to minimize data transfer
public DamDTO getDam(Long id) {
  return new DamDTO(dam);  // Only necessary fields
}
```

### Frontend Optimization

```javascript
// Code splitting
const AlertsPage = React.lazy(() => import('./pages/Alerts'));

// Memoization
const MemoizedAlertCard = React.memo(AlertCard);

// Lazy loading images
<img loading="lazy" src="..." alt="..." />
```

### Caching Strategy

- [ ] Browser caching configured
- [ ] Server-side caching (Redis)
- [ ] API response caching
- [ ] Database query caching
- [ ] CDN for static assets

## Post-Deployment Monitoring

### Week 1

- [ ] Monitor error rates daily
- [ ] Check performance metrics hourly
- [ ] Review user feedback
- [ ] Monitor for security issues
- [ ] Check backup integrity

### Month 1

- [ ] Analyze usage patterns
- [ ] Review performance trends
- [ ] Update documentation
- [ ] Plan optimization improvements
- [ ] Schedule security audit

### Ongoing

- [ ] Daily health checks
- [ ] Weekly performance reviews
- [ ] Monthly security reviews
- [ ] Quarterly capacity planning
- [ ] Annual disaster recovery testing

## Deployment Completed! ✅

### Final Sign-off

- [ ] Deployment successfully completed
- [ ] All systems operational
- [ ] No critical issues identified
- [ ] Rollback plan tested
- [ ] Team notified
- [ ] Documentation updated

---

**Deployment Guide Created: Successful deployment is key to reliability!** 🚀

