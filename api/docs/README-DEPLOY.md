# Dam Disaster Alert System - Quick Start

## 🚀 Quick Deploy Checklist

### 1️⃣ Initial Setup (One-time)
- [ ] Create DigitalOcean Droplet (Ubuntu 22.04, 2GB RAM minimum)
- [ ] SSH into droplet: `ssh root@YOUR_DROPLET_IP`
- [ ] Run setup script or install Docker + Docker Compose + Git
- [ ] Clone repository to `/opt/dam-disaster-alert-system`
- [ ] Create `.env` file from `.env.example` with strong passwords
- [ ] Run `docker-compose up -d`
- [ ] Configure firewall (UFW)

### 2️⃣ GitHub Auto-Deploy Setup (One-time)
- [ ] Generate SSH key on droplet: `ssh-keygen -t ed25519`
- [ ] Add public key to GitHub Deploy Keys
- [ ] Add 3 secrets to GitHub Actions: `DO_HOST`, `DO_USERNAME`, `DO_SSH_KEY`

### 3️⃣ Test Everything
- [ ] Access API: `http://YOUR_DROPLET_IP:8080`
- [ ] Access phpMyAdmin: `http://YOUR_DROPLET_IP:8081`
- [ ] Push to main branch and verify auto-deploy works

---

## 📱 Access URLs

- **API**: http://YOUR_DROPLET_IP:8080
- **phpMyAdmin**: http://YOUR_DROPLET_IP:8081

---

## 🎯 How Auto-Deploy Works

1. You push code to `main` branch on GitHub
2. GitHub Actions workflow triggers automatically
3. Workflow SSH into your DigitalOcean droplet
4. Pulls latest code from GitHub
5. Rebuilds Docker containers
6. Restarts the application
7. Your API is updated! 🎉

---

## 📖 Full Documentation

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions.

---

## 🔧 Common Commands

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Navigate to project
cd /opt/dam-disaster-alert-system/api

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop everything
docker-compose down

# Start everything
docker-compose up -d

# Rebuild after manual changes
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

---

## 👥 Team Access to phpMyAdmin

All team members can access phpMyAdmin at:
- **URL**: `http://YOUR_DROPLET_IP:8081`
- **Server**: `mysql`
- **Username**: `ddas_user`
- **Password**: (share the password from .env file with your team)

---

## 🎉 That's It!

Every push to `main` automatically updates your backend on DigitalOcean!

