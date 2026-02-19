# 🎯 What I've Set Up For You

## ✅ Files Created

1. **Dockerfile** - Containerizes your Spring Boot API
2. **docker-compose.yml** - Orchestrates MySQL, phpMyAdmin, and API
3. **.dockerignore** - Excludes unnecessary files from Docker builds
4. **.env.example** - Template for environment variables
5. **.github/workflows/deploy.yml** - GitHub Actions for auto-deploy
6. **setup-server.sh** - Automated server setup script
7. **DEPLOYMENT.md** - Complete deployment guide
8. **README-DEPLOY.md** - Quick start guide

## 📦 What You Get

### 1. **MySQL Database**
- Running in Docker container
- Persistent data storage
- Port 3306 exposed
- Automatic creation of `dam_disaster_db` database

### 2. **phpMyAdmin**
- Running on port 8081
- All devs can access it
- Web-based database management
- URL: `http://YOUR_DROPLET_IP:8081`

### 3. **Spring Boot API**
- Running on port 8080
- Automatically connects to MySQL
- URL: `http://YOUR_DROPLET_IP:8080`

### 4. **Auto-Deploy from GitHub**
- Push to `main` branch → Automatic deployment
- GitHub Actions handles everything
- Zero-downtime updates

## 🚀 How to Deploy

### Step 1: Create DigitalOcean Droplet
1. Go to DigitalOcean.com
2. Create Droplet: Ubuntu 22.04, 2GB RAM
3. Note the IP address

### Step 2: Set Up Server
```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo apt install -y git

# Clone your repository
mkdir -p /opt/dam-disaster-alert-system
cd /opt/dam-disaster-alert-system
git clone https://github.com/YOUR_USERNAME/dam-disaster-alert-system.git .
```

### Step 3: Configure Environment
```bash
cd /opt/dam-disaster-alert-system/api
cp .env.example .env
nano .env  # Set strong passwords
```

### Step 4: Start Everything
```bash
docker-compose up -d
```

### Step 5: Configure Auto-Deploy
1. Generate SSH key on droplet
2. Add public key to GitHub Deploy Keys
3. Add 3 secrets to GitHub Actions:
   - `DO_HOST`: Your droplet IP
   - `DO_USERNAME`: root
   - `DO_SSH_KEY`: Private key content

### Step 6: Test
Push to main branch → Automatic deployment! 🎉

## 📱 Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| API | `http://YOUR_DROPLET_IP:8080` | Your backend |
| phpMyAdmin | `http://YOUR_DROPLET_IP:8081` | Database management |

## 👥 Team Access

Share with your team:
- **phpMyAdmin URL**: `http://YOUR_DROPLET_IP:8081`
- **Username**: `ddas_user`
- **Password**: (from .env file)

## 🔄 Workflow

```
You: git push origin main
    ↓
GitHub Actions: Triggered
    ↓
SSH to DigitalOcean
    ↓
Pull latest code
    ↓
Rebuild Docker containers
    ↓
Restart application
    ↓
✅ Updated!
```

## 📝 Next Steps

1. **Push all files to GitHub**:
   ```bash
   git add .
   git commit -m "Add Docker deployment configuration"
   git push origin main
   ```

2. **Follow DEPLOYMENT.md** for detailed setup instructions

3. **Test auto-deploy** by making a small change and pushing to main

## 🆘 Need Help?

Check these files:
- `DEPLOYMENT.md` - Full detailed guide
- `README-DEPLOY.md` - Quick reference
- `docker-compose.yml` - Service configuration

## 🎉 You're All Set!

Your backend will now:
- ✅ Run on DigitalOcean
- ✅ Auto-deploy from GitHub
- ✅ Have phpMyAdmin for all devs
- ✅ Use production MySQL database

