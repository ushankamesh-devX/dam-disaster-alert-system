# Web Deployment Guide

This guide explains how to deploy the DDAS web application to your VM.

## Prerequisites

- Docker and Docker Compose installed on your VM
- The API is already running (from the `api/` directory)

## Option 1: Deploy with Docker Compose (Recommended)

The web service is already added to the main `docker-compose.yml` in the `api/` folder.

### Step 1: Update Environment Variables

On your VM, edit the `.env` file in the `api/` directory and add:

```bash
# Add this line - replace with your VM's public IP or domain
VITE_API_URL=http://YOUR_VM_IP:8080/api/v1
```

For example, if your VM IP is `143.110.123.45`:
```bash
VITE_API_URL=http://143.110.123.45:8080/api/v1
```

### Step 2: Pull Latest Code

```bash
cd /path/to/dam-disaster-alert-system
git pull origin main
```

### Step 3: Build and Run

```bash
cd api
docker compose up -d --build web
```

This will:
- Build the React app with production optimizations
- Serve it via Nginx on port 80

### Step 4: Verify Deployment

Visit `http://YOUR_VM_IP` in your browser.

---

## Option 2: Deploy Standalone (Without Docker Compose)

If you want to run the web app separately:

### Step 1: Build the Docker Image

```bash
cd web
docker build -t ddas-web --build-arg VITE_API_URL=http://YOUR_VM_IP:8080/api/v1 .
```

### Step 2: Run the Container

```bash
docker run -d --name ddas-web -p 80:80 ddas-web
```

---

## Option 3: Manual Deployment (Without Docker)

If you prefer not to use Docker:

### Step 1: Install Node.js on your VM

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install dependencies and build

```bash
cd web
npm ci
VITE_API_URL=http://YOUR_VM_IP:8080/api/v1 npm run build
```

### Step 3: Serve with Nginx

Install Nginx:
```bash
sudo apt-get install -y nginx
```

Copy build files:
```bash
sudo rm -rf /var/www/html/*
sudo cp -r dist/* /var/www/html/
```

Create Nginx config (`/etc/nginx/sites-available/ddas`):
```nginx
server {
    listen 80;
    server_name YOUR_VM_IP;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ddas /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Firewall Configuration

Make sure port 80 is open on your VM:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp

# Or if using DigitalOcean/cloud firewall, add rule in the dashboard
```

---

## Using a Domain Name

If you have a domain name:

1. Point your domain's A record to your VM's IP
2. Update `VITE_API_URL` to use your domain:
   ```
   VITE_API_URL=http://yourdomain.com:8080/api/v1
   ```
3. Rebuild the web container

---

## Troubleshooting

### Web app can't connect to API
- Check that CORS is enabled in the API
- Verify `VITE_API_URL` is correct
- Make sure the API container is running: `docker ps`

### Page shows blank or 404
- Check browser console for errors
- Verify Nginx is serving files correctly
- Make sure the build was successful

### Port 80 already in use
- Stop other services using port 80, or
- Change the port mapping in docker-compose.yml: `"3000:80"`
