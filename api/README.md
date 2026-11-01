# 🌊 Dam Disaster Alert System - API

Spring Boot backend API for the Dam Disaster Alert System.

---

## 🚀 Quick Start

### Local Development
Spring Boot runs on the host. MySQL, MQTT, AI, Qdrant, MinIO and MLflow run in Docker.
Configure `.env` from `.env.example`, then from `api/`:

```powershell
.\scripts\start-local.ps1

# Build the project
.\mvnw.cmd clean package
```

The launcher stops the old API/web containers to release port 8080 and starts
dependencies using `docker-compose.host.yml`. Existing database volumes are preserved.
After dependencies are running, use `.\scripts\start-local.ps1 -SkipDocker`, or
run `.\mvnw.cmd spring-boot:run` directly from `api/`. Spring loads `api/.env`,
uses MySQL at `localhost:3306`, MQTT at `localhost:1883`, and AI at `localhost:8000`.
Schema validation is enabled; startup does not create or alter tables.

For an existing local database, apply the mobile account preference fields once:
`python scripts/migrate_mobile_onboarding.py`. This backs up the database, adds
the user dam preference/onboarding columns and their foreign key, and leaves
unrelated schema differences unchanged.

The AI container reaches Spring through `host.docker.internal:8080`. Configure
two distinct AI service tokens of at least 32 characters in `.env`. Windows
must allow that Docker-to-host connection. API/web containers remain available
through the original `docker-compose.yml` for the full container workflow.
The optional `ai/.env` supplies AI provider settings; service tokens and network
addresses are overridden by the local Compose configuration.

Open [bruno-mobile](bruno-mobile/README.md) in Bruno for the 33-request mobile
collection. The older [bruno](bruno/README.md) collection covers general/admin APIs.

### Access Locally
- API: http://localhost:8080
- Database: localhost:3307 (Docker)

### Seed the demo database

With `api/.env` configured and Docker running, execute from `api`:

```powershell
python scripts/setup_demo.py --database-only
```

This starts MySQL, migrates its schema and seeds demo data. Start host Spring Boot
with `scripts/start-local.ps1` afterward. Omitting `--database-only` selects the older full-container API/web workflow. The API uses
Hibernate schema validation, so run setup before its first startup.
Repeat runs preserve existing records and prevent duplicates. Check without
changing database records using `python scripts/seed_demo.py --validate-only`.
See [demo data coverage and requirements](scripts/DEMO-DATA.md).

---

## ☁️ Production Deployment

This project is configured for **automatic deployment to DigitalOcean** with MySQL and phpMyAdmin.

### 📖 Read This First
**→ Open [`DEPLOYMENT.md`](./DEPLOYMENT.md)** for complete deployment instructions.

### ⚡ Quick Deploy
1. Push to GitHub: `git push origin main`
2. GitHub Actions automatically deploys to DigitalOcean
3. Your API is updated in ~2-3 minutes!

---

## 📁 Project Structure

```
api/
├── src/                          # Source code
│   ├── main/
│   │   ├── java/                 # Java source files
│   │   └── resources/            # Configuration files
│   └── test/                     # Test files
│
├── 🐳 Docker & Deployment
│   ├── Dockerfile                # API container definition
│   ├── docker-compose.yml        # Multi-container setup
│   ├── .dockerignore            # Docker build exclusions
│   └── .env.example             # Environment template
│
├── 🤖 CI/CD
│   └── .github/
│       └── workflows/
│           └── deploy.yml        # Auto-deploy workflow
│
├── 📚 Documentation
│   ├── DEPLOYMENT.md            # ⭐ Complete deployment guide
│   ├── README-DEPLOY.md         # Quick reference
│   ├── COMMANDS.md              # All commands cheat sheet
│   ├── TEAM-GUIDE.md            # For team members
│   ├── ARCHITECTURE.md          # System design
│   └── SETUP-SUMMARY.md         # Overview
│
└── 🔧 Scripts
    ├── setup-server.sh          # Server setup automation
    └── verify-setup.sh          # Verification script
```

---

## 🛠️ Technology Stack

- **Framework**: Spring Boot 4.0.2
- **Language**: Java 17
- **Database**: MySQL 8.0
- **Build Tool**: Maven
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting**: DigitalOcean
- **DB Management**: phpMyAdmin

---

## 📱 Services

### Local Development
| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://localhost:8080 | - |
| MySQL | localhost:3306 | See application.properties |

### Production (After Deployment)
| Service | URL | Credentials |
|---------|-----|-------------|
| API | http://YOUR_IP:8080 | - |
| phpMyAdmin | http://YOUR_IP:8081 | See .env file |
| MySQL | YOUR_IP:3306 | See .env file |

---

## 🔧 Configuration

### Local Configuration
Edit `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/dam_disaster_db
spring.datasource.username=root
spring.datasource.password=your_password
```

### Production Configuration
Environment variables are set in `.env` file on the server:
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

---

## 📦 Dependencies

Key dependencies (see `pom.xml` for complete list):
- Spring Boot Starter Web MVC
- Spring Boot Starter Data JPA
- MySQL Connector
- Lombok
- H2 Database (for testing)

---

## 🔄 Deployment Workflow

```
┌──────────────┐
│ Local Dev    │
└──────┬───────┘
       │ git push origin main
       ▼
┌──────────────┐
│ GitHub Repo  │
└──────┬───────┘
       │ Triggers GitHub Actions
       ▼
┌──────────────┐
│ GitHub       │
│ Actions      │
└──────┬───────┘
       │ SSH to DigitalOcean
       ▼
┌──────────────┐
│ DigitalOcean │
│ Droplet      │
└──────┬───────┘
       │ git pull
       │ docker-compose rebuild
       │ docker-compose up -d
       ▼
┌──────────────┐
│ ✅ Deployed! │
└──────────────┘
```

---

## 👥 Team Collaboration

### Database Access
All team members can access the production database through **phpMyAdmin**:
- URL: http://YOUR_IP:8081
- No local software needed
- Visual interface for database management

See [`TEAM-GUIDE.md`](./TEAM-GUIDE.md) for details.

---

## 📚 Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Complete deployment guide | DevOps, Setup |
| [COMMANDS.md](./COMMANDS.md) | Command reference | Daily use |
| [README-DEPLOY.md](./README-DEPLOY.md) | Quick reference | Quick lookup |
| [TEAM-GUIDE.md](./TEAM-GUIDE.md) | Database access | Team members |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design | Technical overview |
| [SETUP-SUMMARY.md](./SETUP-SUMMARY.md) | Overview | Management |

---

## 🚦 Getting Started

### For New Developers

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dam-disaster-alert-system.git
   cd dam-disaster-alert-system/api
   ```

2. **Configure database**
   - Install MySQL locally
   - Create database: `dam_disaster_db`
   - Update `application.properties` with your credentials

3. **Run the application**
   ```bash
   .\mvnw.cmd spring-boot:run
   ```

4. **Access the API**
   - http://localhost:8080

### For Deployment

1. **Read the deployment guide**
   - Open [`DEPLOYMENT.md`](./DEPLOYMENT.md)
   - Follow step-by-step instructions

2. **Set up DigitalOcean**
   - Create droplet
   - Install Docker
   - Configure auto-deploy

3. **Push to deploy**
   - `git push origin main`
   - Automatic deployment happens!

---

## 🔒 Security

- ✅ Environment variables for sensitive data
- ✅ `.env` excluded from Git
- ✅ SSH key authentication
- ✅ GitHub Secrets for credentials
- ✅ Docker network isolation
- ✅ Firewall configuration

---

## 🐛 Troubleshooting

### Local Issues

**Application won't start?**
```bash
# Check if MySQL is running
# Check application.properties credentials
# Check port 8080 is not in use
```

### Production Issues

**Deployment failed?**
- Check GitHub Actions logs
- SSH to server and check Docker logs: `docker-compose logs -f`
- Verify environment variables in `.env`

See [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section.

---

## 📞 Common Commands

```bash
# Local Development
.\mvnw.cmd spring-boot:run              # Run application
.\mvnw.cmd clean package                # Build JAR file
.\mvnw.cmd test                         # Run tests

# Production (on server)
docker-compose up -d                    # Start all services
docker-compose logs -f                  # View logs
docker-compose restart                  # Restart services
docker-compose ps                       # Check status
docker-compose down                     # Stop all services
```

See [COMMANDS.md](./COMMANDS.md) for complete list.

---

## 🎯 Features

### Current
- ✅ Spring Boot REST API
- ✅ MySQL database integration
- ✅ Docker containerization
- ✅ Auto-deployment from GitHub
- ✅ phpMyAdmin for database management

### Planned
- [ ] Authentication & Authorization
- [ ] API documentation (Swagger)
- [ ] Monitoring & logging
- [ ] Automated backups
- [ ] SSL/HTTPS support

---

## 📊 Project Status

- **Status**: ✅ Deployment-Ready
- **Version**: 0.0.1-SNAPSHOT
- **Java**: 17
- **Spring Boot**: 4.0.2
- **Database**: MySQL 8.0

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Push to GitHub
5. Create pull request
6. After merge to main → Auto-deploys!

---

## 📄 License

[Your License Here]

---

## 👨‍💻 Team

Dam Disaster Alert System Development Team

---

## 🔗 Links

- **GitHub Repository**: https://github.com/YOUR_USERNAME/dam-disaster-alert-system
- **DigitalOcean**: https://www.digitalocean.com
- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **Docker Docs**: https://docs.docker.com

---

## 📧 Support

For deployment issues, check:
1. GitHub Actions logs
2. [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting
3. Server logs: `docker-compose logs -f`

---

## 🎉 Quick Links

- 🚀 **Want to deploy?** → Read [DEPLOYMENT.md](./DEPLOYMENT.md)
- 📖 **Need commands?** → Check [COMMANDS.md](./COMMANDS.md)
- 👥 **Team member?** → See [TEAM-GUIDE.md](./TEAM-GUIDE.md)
- 🏗️ **Understand system?** → View [ARCHITECTURE.md](./ARCHITECTURE.md)

---

**Dam Disaster Alert System - Saving Lives Through Technology** 🌊💙

