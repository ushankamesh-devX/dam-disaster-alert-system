# 📝 Command Cheat Sheet

Quick reference for common commands you'll use.

---

## 🖥️ Local Development (Windows)

### Git Commands
```powershell
# Add all changes
git add .

# Commit changes
git commit -m "Your message here"

# Push to GitHub (triggers auto-deploy!)
git push origin main

# Check status
git status

# View commit history
git log --oneline
```

### Build & Run Locally
```powershell
# Build the project
.\mvnw clean package

# Run locally
.\mvnw spring-boot:run
```

---

## 🌊 DigitalOcean Droplet

### SSH Connection
```bash
# Connect to your droplet
ssh root@YOUR_DROPLET_IP

# Or with specific key
ssh -i ~/.ssh/your_key root@YOUR_DROPLET_IP

# Exit SSH session
exit
```

### Navigate to Project
```bash
cd /opt/dam-disaster-alert-system/api
```

---

## 🐳 Docker Commands

### Basic Operations
```bash
# Start all containers
docker-compose up -d

# Stop all containers
docker-compose down

# Restart all containers
docker-compose restart

# Restart specific container
docker-compose restart api
docker-compose restart mysql
docker-compose restart phpmyadmin
```

### View Status & Logs
```bash
# Check container status
docker-compose ps

# View all logs
docker-compose logs

# Follow logs (real-time)
docker-compose logs -f

# View specific service logs
docker-compose logs api
docker-compose logs mysql
docker-compose logs phpmyadmin

# Follow specific service logs
docker-compose logs -f api
```

### Rebuild Containers
```bash
# Rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Rebuild specific service
docker-compose build api
docker-compose up -d api
```

### Clean Up
```bash
# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -af

# Remove everything unused
docker system prune -af

# Remove all (including volumes - CAUTION!)
docker-compose down -v
docker system prune -af --volumes
```

---

## 🗄️ Database Commands

### Access MySQL CLI
```bash
# Connect as root
docker exec -it ddas-mysql mysql -u root -p
# Enter password from .env file

# Connect as ddas_user
docker exec -it ddas-mysql mysql -u ddas_user -p

# Once inside MySQL:
SHOW DATABASES;
USE dam_disaster_db;
SHOW TABLES;
SELECT * FROM your_table;
EXIT;
```

### Backup Database
```bash
# Backup database to file
docker exec ddas-mysql mysqldump -u root -p dam_disaster_db > backup.sql

# Backup with timestamp
docker exec ddas-mysql mysqldump -u root -p dam_disaster_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database
```bash
# Restore from backup
docker exec -i ddas-mysql mysql -u root -p dam_disaster_db < backup.sql
```

---

## 🔥 Firewall (UFW)

### Basic UFW Commands
```bash
# Check status
sudo ufw status
sudo ufw status numbered

# Enable firewall
sudo ufw enable

# Disable firewall
sudo ufw disable

# Allow port
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw allow 22/tcp

# Deny port
sudo ufw deny 3306/tcp

# Delete rule by number
sudo ufw status numbered
sudo ufw delete [number]

# Reset firewall
sudo ufw reset
```

---

## 📊 Monitoring

### System Resources
```bash
# View CPU and memory usage
htop
# Press 'q' to quit

# Alternative (simpler)
top
# Press 'q' to quit

# Disk usage
df -h

# Memory usage
free -h

# Docker container resources
docker stats
```

### Check Ports
```bash
# See what's using ports
sudo netstat -tuln

# Check specific port
sudo lsof -i :8080
sudo lsof -i :8081

# Kill process by port
sudo kill -9 $(sudo lsof -t -i:8080)
```

---

## 🔍 Troubleshooting

### Check if Services are Running
```bash
# Check Docker daemon
sudo systemctl status docker

# Check containers
docker-compose ps

# Detailed container info
docker inspect ddas-api
docker inspect ddas-mysql
```

### View Container Details
```bash
# Execute command in container
docker exec -it ddas-api bash
docker exec -it ddas-mysql bash

# View container logs (last 100 lines)
docker-compose logs --tail=100 api

# View logs since 1 hour ago
docker-compose logs --since 1h api
```

### Restart Everything
```bash
# Restart Docker daemon
sudo systemctl restart docker

# Full restart
docker-compose down
sudo systemctl restart docker
docker-compose up -d
```

---

## 🔄 Deployment Commands

### Manual Deploy (if auto-deploy fails)
```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Navigate to project
cd /opt/dam-disaster-alert-system/api

# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Force Fresh Deploy
```bash
# Remove everything
docker-compose down -v
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

---

## 📁 File Operations

### View/Edit Files
```bash
# View file contents
cat .env
cat docker-compose.yml

# Edit file
nano .env
# Save: Ctrl+X, then Y, then Enter

# View file with pager
less docker-compose.yml
# Press 'q' to quit
```

### File Permissions
```bash
# Make script executable
chmod +x setup-server.sh
chmod +x verify-setup.sh

# Change ownership
sudo chown $USER:$USER /opt/dam-disaster-alert-system
```

---

## 🔑 SSH Key Management

### Generate SSH Key
```bash
# Generate new key
ssh-keygen -t ed25519 -C "your_email@example.com"

# View public key
cat ~/.ssh/id_ed25519.pub

# View private key
cat ~/.ssh/id_ed25519

# Copy public key to clipboard (if xclip installed)
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard
```

---

## 🌐 Network Commands

### Test Connectivity
```bash
# Test if API is responding
curl http://localhost:8080

# Test from external
curl http://YOUR_DROPLET_IP:8080

# Test with headers
curl -I http://localhost:8080

# Get your public IP
curl ifconfig.me
```

### DNS & Network
```bash
# Ping server
ping YOUR_DROPLET_IP

# Check open ports
nmap YOUR_DROPLET_IP

# Trace route
traceroute YOUR_DROPLET_IP
```

---

## 📦 Update System

### Ubuntu Updates
```bash
# Update package list
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Upgrade distribution
sudo apt dist-upgrade -y

# Clean up
sudo apt autoremove -y
sudo apt autoclean
```

### Update Docker Compose
```bash
# Check current version
docker-compose --version

# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

---

## 🎯 Quick Actions

### Emergency Stop
```bash
docker-compose down
```

### Emergency Start
```bash
docker-compose up -d
```

### View Everything
```bash
docker-compose ps && docker-compose logs --tail=20
```

### Full Restart
```bash
docker-compose restart && docker-compose logs -f
```

### Check Health
```bash
curl http://localhost:8080 && echo " - API OK" || echo " - API FAIL"
curl http://localhost:8081 && echo " - phpMyAdmin OK" || echo " - phpMyAdmin FAIL"
```

---

## 💡 Pro Tips

### Aliases (Add to ~/.bashrc)
```bash
# Add these to ~/.bashrc for shortcuts
alias dps='docker-compose ps'
alias dlogs='docker-compose logs -f'
alias dup='docker-compose up -d'
alias ddown='docker-compose down'
alias drestart='docker-compose restart'
alias dapi='cd /opt/dam-disaster-alert-system/api'

# Reload bash
source ~/.bashrc
```

### Watch Logs in Real-Time
```bash
# Terminal 1: API logs
docker-compose logs -f api

# Terminal 2: MySQL logs
docker-compose logs -f mysql

# Or use multiple panes with tmux/screen
```

---

## 🆘 Emergency Procedures

### API Won't Start
```bash
docker-compose logs api
docker-compose restart api
```

### Database Connection Error
```bash
# Check MySQL is running
docker-compose ps mysql

# Check credentials in .env
cat .env

# Restart MySQL
docker-compose restart mysql

# Check logs
docker-compose logs mysql
```

### Port Already in Use
```bash
# Find what's using the port
sudo lsof -i :8080

# Kill the process
sudo kill -9 [PID]

# Then restart
docker-compose up -d
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -af

# Clean logs
sudo journalctl --vacuum-time=7d
```

---

## 📞 Quick Reference URLs

- **API Health**: `http://YOUR_IP:8080/actuator/health`
- **phpMyAdmin**: `http://YOUR_IP:8081`
- **GitHub Actions**: `https://github.com/YOUR_USERNAME/dam-disaster-alert-system/actions`

---

**Bookmark this file for quick reference!** 🔖

