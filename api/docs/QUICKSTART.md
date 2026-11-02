# Quick Start Guide - DDAS API

## 🚀 Quick Setup (5 Minutes)

### Steps 1–3: Configure and initialize the database, then start the API

Follow the [current setup guide](../../README.md) to create `api/.env` with your
MySQL and initial administrator credentials. From the repository root:

```powershell
python api/scripts/setup_demo.py --schema-only
```

This migrates the schema, initializes roles and permissions, and starts API/web.
Omit `--schema-only` if you also want demo data. The current database is
`dam_disaster_db`; the old standalone design SQL is not a complete installation.
See [database sources](../DB%20SCHEMA/README.md).

### Step 4: Test with Bruno

1. Open Bruno
2. Open Collection → Select `api/bruno` folder
3. Select "local" environment
4. Run requests:
   - ✅ Health Check → `/api/v1/health`
   - ✅ Register User → `/api/v1/auth/register`
   - ✅ Login → `/api/v1/auth/login`
   - ✅ Get Current User → `/api/v1/users/me`

---

## 🎯 Quick Test with cURL

### 1. Health Check
```bash
curl http://localhost:8080/api/v1/health
```

### 2. Register User
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "phoneNumber": "+94771234567",
    "password": "Password123!",
    "languagePreference": "en"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Save the token from response!**

### 4. Get Current User (Protected)
```bash
curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Initial administrator

API startup creates the first administrator from `DDAS_ADMIN_EMAIL` and
`DDAS_ADMIN_PASSWORD` in `api/.env`. There is no built-in email or password.
`init_data.sql` only initializes roles and permissions. Existing accounts are
preserved.

---

## 📁 Project Structure Overview

```
api/
├── bruno/                    # API testing collection
├── DB SCHEMA/               # Database scripts
│   ├── ddas_complete_schema.sql
│   └── init_data.sql
├── src/main/java/com/ddas/api/
│   ├── config/              # Security & configuration
│   ├── controller/          # REST endpoints
│   ├── dto/                 # Request/Response objects
│   ├── entity/              # Database entities
│   ├── exception/           # Error handling
│   ├── mapper/              # Object mapping
│   ├── repository/          # Data access
│   ├── security/            # JWT & authentication
│   └── service/             # Business logic
└── README-API.md            # Full documentation
```

---

## ✅ Available Endpoints

### Public (No Auth)
- `GET  /api/v1/health` - Health check
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user

### Protected (Requires Token)
- `GET  /api/v1/users/me` - Get current user
- `GET  /api/v1/users` - Get all users
- `GET  /api/v1/users/{id}` - Get user by ID

### Monitoring
- `GET  /actuator/health` - Application health
- `GET  /actuator/info` - Application info

---

## 🐛 Common Issues

### Database Connection Failed
```bash
# Check MySQL is running
Get-Service mysql*

# Verify database exists
mysql -u root -p
SHOW DATABASES;
```

### Port 8080 Already in Use
```bash
# Change port in application.properties
server.port=8081
```

### JWT Token Invalid
- Token expires after 24 hours
- Login again to get a new token

---

## 📚 Next Steps

1. ✅ Basic authentication is working
2. 📖 Read [README-API.md](README-API.md) for detailed documentation
3. 🧪 Explore Bruno collection in `bruno/` folder
4. 🔨 Start adding more modules (Dams, Alerts, etc.)

---

## 🆘 Need Help?

- Full API Documentation: [README-API.md](README-API.md)
- Bruno Guide: [bruno/README.md](bruno/README.md)
- Database Schema: `DB SCHEMA/ddas_complete_schema.sql`

---

**🎉 You're all set! Happy coding!**

