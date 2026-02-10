#!/bin/bash

# Quick verification script to check if everything is set up correctly
# Run this on your DigitalOcean droplet

echo "========================================="
echo "  Dam Disaster Alert System"
echo "  Deployment Verification Script"
echo "========================================="
echo ""

# Check if Docker is installed
echo "Checking Docker..."
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
else
    echo "❌ Docker is NOT installed"
    exit 1
fi

# Check if Docker Compose is installed
echo "Checking Docker Compose..."
if command -v docker-compose &> /dev/null; then
    echo "✅ Docker Compose is installed: $(docker-compose --version)"
else
    echo "❌ Docker Compose is NOT installed"
    exit 1
fi

# Check if Git is installed
echo "Checking Git..."
if command -v git &> /dev/null; then
    echo "✅ Git is installed: $(git --version)"
else
    echo "❌ Git is NOT installed"
    exit 1
fi

# Check if repository exists
echo "Checking repository..."
if [ -d "/opt/dam-disaster-alert-system" ]; then
    echo "✅ Repository directory exists"
else
    echo "❌ Repository directory NOT found at /opt/dam-disaster-alert-system"
    exit 1
fi

# Check if .env file exists
echo "Checking .env file..."
if [ -f "/opt/dam-disaster-alert-system/api/.env" ]; then
    echo "✅ .env file exists"
else
    echo "⚠️  .env file NOT found - you need to create it from .env.example"
fi

# Check if Docker containers are running
echo "Checking Docker containers..."
cd /opt/dam-disaster-alert-system/api
if [ "$(docker-compose ps -q)" ]; then
    echo "✅ Docker containers are running:"
    docker-compose ps
else
    echo "⚠️  No Docker containers running - run: docker-compose up -d"
fi

# Check if ports are open
echo ""
echo "Checking open ports..."
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":8080"; then
        echo "✅ Port 8080 (API) is open"
    else
        echo "❌ Port 8080 (API) is NOT open"
    fi

    if netstat -tuln | grep -q ":8081"; then
        echo "✅ Port 8081 (phpMyAdmin) is open"
    else
        echo "❌ Port 8081 (phpMyAdmin) is NOT open"
    fi
else
    echo "⚠️  netstat not installed, skipping port check"
fi

# Check firewall status
echo ""
echo "Checking firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "✅ Firewall is active"
        sudo ufw status numbered | grep -E "8080|8081|22"
    else
        echo "⚠️  Firewall is NOT active - consider enabling it"
    fi
else
    echo "⚠️  UFW firewall not installed"
fi

echo ""
echo "========================================="
echo "  Verification Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. If .env file is missing, create it from .env.example"
echo "2. If containers are not running, run: docker-compose up -d"
echo "3. Access API at: http://$(curl -s ifconfig.me):8080"
echo "4. Access phpMyAdmin at: http://$(curl -s ifconfig.me):8081"
echo ""

