# Dam Disaster Alert System - Deployment Guide

## 🚀 Deploy to DigitalOcean with Auto-Deploy from GitHub

This guide will help you deploy your Spring Boot API with MySQL and phpMyAdmin on DigitalOcean with automatic deployment when you push to the `main` branch.

---

## 📋 Prerequisites

- DigitalOcean account
- GitHub account
- Git installed locally
- Your repository pushed to GitHub

---

## 🔧 Step 1: Create DigitalOcean Droplet

1. **Log in to DigitalOcean**
2. **Create a new Droplet**:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($12/month minimum recommended - 2GB RAM)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: dam-disaster-alert-system

3. **Note your Droplet's IP address**

---

## 🔐 Step 2: Set Up Your Droplet

### SSH into your droplet:
```bash
ssh root@YOUR_DROPLET_IP
```

### Run the setup script:
```bash
# Copy the setup-server.sh script to your droplet
# Then run:
chmod +x setup-server.sh
./setup-server.sh
```

**Or manually run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install -y git

# Create application directory
sudo mkdir -p /opt/dam-disaster-alert-system
sudo chown $USER:$USER /opt/dam-disaster-alert-system
```

### Logout and login again to apply docker group:
```bash
exit
ssh root@YOUR_DROPLET_IP
```

---

## 📦 Step 3: Clone Your Repository

```bash
cd /opt/dam-disaster-alert-system
git clone https://github.com/YOUR_USERNAME/dam-disaster-alert-system.git .
cd api
```

---

## 🔑 Step 4: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit the .env file
nano .env
```

**Set strong passwords:**
```env
MYSQL_ROOT_PASSWORD=YourStrongRootPassword123!
MYSQL_USER=ddas_user
MYSQL_PASSWORD=YourStrongUserPassword456!
```

**Save and exit** (Ctrl+X, then Y, then Enter)

---

## 🐳 Step 5: Start the Application

```bash
# Build and start all containers
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🔥 Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and your application ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8081/tcp
sudo ufw enable
```

---

## 🔐 Step 7: Set Up GitHub Auto-Deploy

### A. Generate SSH Key on Droplet

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# Display private key (copy this)
cat ~/.ssh/github_deploy

# Display public key (add to GitHub deploy keys)
cat ~/.ssh/github_deploy.pub
```

### B. Add Deploy Key to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Deploy keys**
3. Click **Add deploy key**
4. **Title**: DigitalOcean Deploy Key
5. **Key**: Paste the public key from `~/.ssh/github_deploy.pub`
6. ✅ Check **Allow write access**
7. Click **Add key**

### C. Configure Git on Droplet

```bash
cd /opt/dam-disaster-alert-system
git config core.sshCommand "ssh -i ~/.ssh/github_deploy -F /dev/null"
```

### D. Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add these 3 secrets:

| Name | Value |
|------|-------|
| `DO_HOST` | Your droplet IP address |
| `DO_USERNAME` | `root` (or your SSH username) |
| `DO_SSH_KEY` | Contents of `~/.ssh/github_deploy` (private key) |

---

## ✅ Step 8: Test Auto-Deploy

1. Make a change to your code locally
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Go to GitHub → **Actions** tab
4. Watch the deployment run
5. After success, visit your API: `http://YOUR_DROPLET_IP:8080`

---

## 🌐 Access Your Services

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | `http://YOUR_DROPLET_IP:8080` | Your Spring Boot backend |
| **phpMyAdmin** | `http://YOUR_DROPLET_IP:8081` | Database management |

### phpMyAdmin Login:
- **Server**: `mysql`
- **Username**: `ddas_user` (or `root`)
- **Password**: (from your .env file)

---

## 📝 Common Commands

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f mysql

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Access MySQL CLI
docker exec -it ddas-mysql mysql -u root -p

# Clean up old Docker images
docker system prune -af
```

---

## 🔒 Security Recommendations

### 1. Use a Domain Name (Optional but Recommended)
Point your domain to your droplet IP and use SSL:
```bash
# Install Nginx
sudo apt install nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 2. Restrict phpMyAdmin Access
Add IP whitelist to nginx or use SSH tunnel:
```bash
# SSH tunnel from your local machine:
ssh -L 8081:localhost:8081 root@YOUR_DROPLET_IP
# Then access: http://localhost:8081
```

### 3. Change Default MySQL Port (Optional)
Edit `docker-compose.yml` to use a non-standard port externally.

---

## 🐛 Troubleshooting

### Container won't start:
```bash
docker-compose logs api
```

### Can't connect to MySQL:
```bash
docker exec -it ddas-mysql mysql -u root -p
# Enter your MYSQL_ROOT_PASSWORD
```

### Auto-deploy not working:
- Check GitHub Actions logs
- Verify SSH key in GitHub secrets
- Ensure git pull works: `cd /opt/dam-disaster-alert-system && git pull`

### Port already in use:
```bash
# Check what's using the port
sudo lsof -i :8080
# Kill the process if needed
sudo kill -9 PID
```

---

## 📊 Monitoring

### Check system resources:
```bash
# CPU and memory usage
htop

# Docker stats
docker stats
```

---

## 🎉 You're Done!

Your application is now:
- ✅ Running on DigitalOcean
- ✅ Connected to MySQL database
- ✅ Accessible via phpMyAdmin
- ✅ Auto-deploying from GitHub main branch

Every time you push to `main`, your application will automatically update! 🚀

---

## 📞 Need Help?

- Check logs: `docker-compose logs -f`
- Restart services: `docker-compose restart`
- View GitHub Actions for deployment errors

