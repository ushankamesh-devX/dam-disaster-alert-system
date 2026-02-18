# Database Connection Error - Troubleshooting Guide

## ❌ Error Summary

**Error:** `Communications link failure` + `SocketTimeoutException: Read timed out`

**What it means:** Your Spring Boot application **cannot connect** to the MySQL database at `157.245.159.17`.

---

## 🔍 Root Causes & Solutions

### **Issue 1: Wrong Port Number** ⚠️ (MOST LIKELY)

**Problem:**
- You're using port **8081** - this is for phpMyAdmin (web interface)
- MySQL server typically runs on port **3306**

**Solution:**
✅ **I've already fixed this** - Changed port from `8081` to `3306` in `application.properties`

**Current config:**
```properties
spring.datasource.url=jdbc:mysql://157.245.159.17:3306/dam_disaster_db
```

---

### **Issue 2: Password Not Set** ⚠️

**Problem:**
```properties
spring.datasource.password=your_password_here
```

**Solution:** You MUST set the actual password!

**Option A: Edit application.properties**
```properties
spring.datasource.password=YourActualDatabasePassword
```

**Option B: Use environment variable (Recommended)**
```powershell
$env:SPRING_DATASOURCE_PASSWORD="YourActualDatabasePassword"
```

---

### **Issue 3: Find Correct MySQL Port**

Your server might be using a different port. Let's check:

**Method 1: Check in phpMyAdmin**
1. Login to phpMyAdmin: `http://157.245.159.17:8081`
2. Look at the top or connection details
3. It will show the MySQL port (usually 3306)

**Method 2: Ask your server admin**
- What port is MySQL running on?
- Common ports: `3306`, `3307`, `33060`

**Method 3: Test from command line**
```powershell
# Test if port 3306 is open
Test-NetConnection -ComputerName 157.245.159.17 -Port 3306
```

---

### **Issue 4: Remote Access Not Enabled**

MySQL might not allow remote connections.

**Check if you can connect from your machine:**

```powershell
# Install MySQL client if not installed
# Then try to connect:
mysql -h 157.245.159.17 -P 3306 -u ddas_dev -p dam_disaster_db
```

If this fails, your server admin needs to:
1. Enable remote access in MySQL config
2. Grant privileges to `ddas_dev@%` (from any host)
3. Open port 3306 in firewall

---

### **Issue 5: Firewall Blocking**

The server firewall might be blocking external connections.

**Server admin needs to:**
```bash
# On Ubuntu/Debian server
sudo ufw allow 3306/tcp

# Or specific IP
sudo ufw allow from YOUR_IP to any port 3306
```

---

## ✅ Step-by-Step Fix

### **Step 1: Find Correct Information**

Go to your phpMyAdmin and note down:
- ✅ **Server/Host:** (should be 157.245.159.17 or localhost)
- ✅ **Port:** (look for this - likely 3306)
- ✅ **Username:** ddas_dev
- ✅ **Password:** (you should know this)
- ✅ **Database name:** dam_disaster_db

### **Step 2: Update application.properties**

Edit: `src/main/resources/application.properties`

```properties
# Use the CORRECT port you found
spring.datasource.url=jdbc:mysql://157.245.159.17:3306/dam_disaster_db
spring.datasource.username=ddas_dev
spring.datasource.password=YOUR_ACTUAL_PASSWORD_HERE
```

### **Step 3: Test Connection**

**Option A: Simple Test (MySQL Client)**
```powershell
mysql -h 157.245.159.17 -P 3306 -u ddas_dev -p
# Enter password when prompted
# If successful, you should see: mysql>
```

**Option B: Run Spring Boot App**
```powershell
cd D:\Git\dam-disaster-alert-system\api
./mvnw spring-boot:run
```

**Expected Success:**
```
✅ HikariPool-1 - Start completed
✅ Started ApiApplication in X.XXX seconds
✅ Tomcat started on port 8080
```

---

## 🎯 Quick Diagnosis

Run these commands to diagnose:

### **1. Check if MySQL port is accessible:**
```powershell
Test-NetConnection -ComputerName 157.245.159.17 -Port 3306
```

**Expected output if port is open:**
```
TcpTestSucceeded : True
```

### **2. Check different common MySQL ports:**
```powershell
# Try port 3306
Test-NetConnection -ComputerName 157.245.159.17 -Port 3306

# Try port 3307
Test-NetConnection -ComputerName 157.245.159.17 -Port 3307

# Try port 33060
Test-NetConnection -ComputerName 157.245.159.17 -Port 33060
```

---

## 📋 Common Port Numbers

| Port | Service |
|------|---------|
| 3306 | MySQL (default) ✅ |
| 3307 | MySQL (alternate) |
| 33060 | MySQL X Protocol |
| 8081 | phpMyAdmin (web UI) ❌ Not for API |

---

## 🔐 For Local Development (Alternative)

If you can't connect to remote database, use **local MySQL**:

```properties
# Local MySQL connection
spring.datasource.url=jdbc:mysql://localhost:3306/dam_disaster_db
spring.datasource.username=root
spring.datasource.password=your_local_password
```

Then import the database locally:
1. Export from phpMyAdmin
2. Import to local MySQL
3. Develop locally
4. Deploy to server later

---

## 🆘 Still Not Working?

### **Contact Your Server Admin and Ask:**

1. ✅ What is the MySQL port? (3306, 3307, or other?)
2. ✅ Is remote access enabled for MySQL?
3. ✅ Is my IP address allowed to connect?
4. ✅ What is the correct password for `ddas_dev` user?
5. ✅ Is there a firewall blocking port 3306?

### **Or Check Server Configuration:**

If you have SSH access to the server:

```bash
# Check MySQL port
sudo netstat -tulpn | grep mysql

# Check MySQL configuration
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep port

# Check if MySQL is listening on all interfaces
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep bind-address
# Should be: bind-address = 0.0.0.0 (not 127.0.0.1)
```

---

## ✅ Summary Checklist

Before running the app again:

- [ ] Changed port from 8081 to 3306 ✅ (Already done)
- [ ] Set correct database password
- [ ] Verified MySQL port number
- [ ] Tested connection with MySQL client
- [ ] Confirmed remote access is enabled
- [ ] Checked firewall settings
- [ ] Updated Bruno environment variables

---

## 🚀 Next Steps After Fix

Once database connects successfully:

1. **Run initialization script:**
   ```sql
   -- In phpMyAdmin, run:
   source /path/to/init_data.sql
   ```

2. **Start the application:**
   ```powershell
   ./mvnw spring-boot:run
   ```

3. **Test with Bruno:**
   - Open Bruno
   - Test Health Check endpoint
   - Test Registration
   - Test Login

---

**Most likely fix:** Just change the password in `application.properties` and use port `3306` instead of `8081`.

**Port 8081 = phpMyAdmin web interface (HTTP)**  
**Port 3306 = MySQL database server (JDBC)** ✅
