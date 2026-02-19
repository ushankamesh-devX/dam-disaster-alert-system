# Database Configuration for DDAS API

## 🗄️ Your Database Details

Based on your phpMyAdmin screenshot:

```
Host:     157.245.159.17
Port:     8081
Database: dam_disaster_db
Username: ddas_dev
Password: [Your password - needs to be set]
```

## ✅ Configuration Applied

The API is now configured to connect to your remote MySQL database:

### `application.properties` - Updated
```properties
spring.datasource.url=jdbc:mysql://157.245.159.17:8081/dam_disaster_db
spring.datasource.username=ddas_dev
spring.datasource.password=your_password_here
```

### Bruno Environment - Updated
```
base_url: http://157.245.159.17:8080/api/v1
```

## 🔧 What You Need To Do

### 1. Set Your Database Password

**Option A: Edit `application.properties` directly**
```properties
# Replace 'your_password_here' with actual password
spring.datasource.password=YourActualPassword123
```

**Option B: Use Environment Variable (Recommended)**
```powershell
$env:SPRING_DATASOURCE_PASSWORD="YourActualPassword123"
```

### 2. Verify Database Has Initial Data

Login to phpMyAdmin and check if these tables have data:

✅ **`roles`** table - Should have 4 roles (SUPER_ADMIN, ADMIN, DAM_OPERATOR, NORMAL_USER)
✅ **`permissions`** table - Should have 16+ permissions
✅ **`role_permissions`** table - Should have permission assignments
✅ **`users`** table - Should have at least 1 admin user

**If tables are empty, run this in phpMyAdmin:**
```sql
-- Navigate to SQL tab in phpMyAdmin and execute:
-- Copy and paste contents from: api/DB SCHEMA/init_data.sql
```

### 3. Test Database Connection

Run this command to test:
```powershell
cd D:\Git\dam-disaster-alert-system\api
./mvnw spring-boot:run
```

**Expected Output:**
```
✅ Started ApiApplication in X.XXX seconds
✅ Tomcat started on port 8080
```

**If you see connection errors:**
- Check if password is correct
- Check if database port 8081 is accessible
- Verify database name is exactly `dam_disaster_db`

### 4. Test API Endpoints

**Health Check:**
```bash
curl http://157.245.159.17:8080/api/v1/health
```

**Or open in browser:**
```
http://157.245.159.17:8080/api/v1/health
```

## 🎯 Yes, This is the Database for Your APIs!

### Database Tables Your API Uses:

| Table | Used By | Status |
|-------|---------|--------|
| `users` | User authentication & management | ✅ Implemented |
| `roles` | Role-based access control | ✅ Implemented |
| `permissions` | Permission management | ✅ Implemented |
| `role_permissions` | Role-Permission mapping | ✅ Implemented |
| Other 40+ tables | Future modules | ⏳ Ready for implementation |

## 🔍 Quick Verification Checklist

Run these in phpMyAdmin SQL tab:

```sql
-- Check database name
SELECT DATABASE();
-- Should return: dam_disaster_db

-- Check if roles exist
SELECT * FROM roles;
-- Should return 4 rows

-- Check if default user exists
SELECT email, full_name FROM users WHERE email = 'admin@ddas.gov.lk';
-- Should return 1 row

-- Check user count
SELECT COUNT(*) as total_users FROM users;
```

## 🚨 Important Notes

1. **Port 8081** - This is your MySQL port (not standard 3306)
2. **Remote Database** - Your database is on a remote server (157.245.159.17)
3. **API Port 8080** - Your Spring Boot API will run on port 8080
4. **Network Access** - Make sure your server allows connections from your development machine

## 🔐 Security Recommendations

For production, also set:
```properties
# In application.properties or environment variables
JWT_SECRET=your-secret-key-min-32-chars-long-change-this
```

## 📊 Database Connection Flow

```
Your Spring Boot API (Port 8080)
        ↓
JDBC Connection
        ↓
MySQL Server: 157.245.159.17:8081
        ↓
Database: dam_disaster_db
        ↓
Tables: users, roles, permissions, etc.
```

## ✅ Summary

**Answer: YES, this is exactly the database your APIs will access!**

- ✅ Database URL configured
- ✅ Username configured (ddas_dev)
- ✅ Database name matches (dam_disaster_db)
- ✅ Port configured (8081)
- ⚠️ Only need to set password

**Next Step:** Set your database password in `application.properties` and run the application!

