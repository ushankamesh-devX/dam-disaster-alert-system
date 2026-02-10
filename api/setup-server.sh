#!/bin/bash

# DigitalOcean Droplet Setup Script for Dam Disaster Alert System
# Run this script on your DigitalOcean droplet after initial creation

set -e

echo "========================================="
echo "Setting up Dam Disaster Alert System"
echo "========================================="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
echo "Adding user to docker group..."
sudo usermod -aG docker $USER

# Install Git
echo "Installing Git..."
sudo apt install -y git

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/dam-disaster-alert-system
sudo chown $USER:$USER /opt/dam-disaster-alert-system

# Clone repository (you'll need to set this up)
echo "========================================="
echo "Manual steps required:"
echo "========================================="
echo ""
echo "1. Clone your repository:"
echo "   cd /opt/dam-disaster-alert-system"
echo "   git clone https://github.com/YOUR_USERNAME/dam-disaster-alert-system.git ."
echo ""
echo "2. Create .env file:"
echo "   cd /opt/dam-disaster-alert-system/api"
echo "   cp .env.example .env"
echo "   nano .env  # Edit with your passwords"
echo ""
echo "3. Start the application:"
echo "   docker-compose up -d"
echo ""
echo "4. Configure firewall:"
echo "   sudo ufw allow 22/tcp"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw allow 8080/tcp"
echo "   sudo ufw allow 8081/tcp"
echo "   sudo ufw enable"
echo ""
echo "5. Access your services:"
echo "   - API: http://YOUR_DROPLET_IP:8080"
echo "   - phpMyAdmin: http://YOUR_DROPLET_IP:8081"
echo ""
echo "========================================="
echo "Setup script completed!"
echo "========================================="

