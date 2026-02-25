# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DIGITALOCEAN DROPLET                     │
│                    (Ubuntu 22.04 Server)                    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              DOCKER CONTAINERS                        │ │
│  │                                                       │ │
│  │  ┌─────────────────┐   ┌──────────────────┐         │ │
│  │  │  Spring Boot API│   │  MySQL Database  │         │ │
│  │  │                 │◄──┤                  │         │ │
│  │  │  Port: 8080     │   │  Port: 3306      │         │ │
│  │  │                 │   │                  │         │ │
│  │  └────────▲────────┘   └────────▲─────────┘         │ │
│  │           │                     │                    │ │
│  │           │        ┌────────────┴──────────┐         │ │
│  │           │        │   phpMyAdmin          │         │ │
│  │           │        │   Port: 8081          │         │ │
│  │           │        │   (Web Interface)     │         │ │
│  │           │        └───────────────────────┘         │ │
│  │           │                                           │ │
│  └───────────┼───────────────────────────────────────────┘ │
│              │                                             │
└──────────────┼─────────────────────────────────────────────┘
               │
               │ Internet
               │
┌──────────────┼──────────────────────────────────────────────┐
│              ▼                                               │
│         EXTERNAL ACCESS                                      │
│                                                              │
│  ┌─────────────────────┐        ┌──────────────────────┐   │
│  │  Mobile/Web App     │        │  Developers          │   │
│  │  http://IP:8080     │        │  http://IP:8081      │   │
│  │  (API Calls)        │        │  (phpMyAdmin)        │   │
│  └─────────────────────┘        └──────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                         │
│                                                              │
│  Your Code → Push to main → GitHub Actions Triggered        │
│                              ↓                               │
│                    SSH to DigitalOcean                       │
│                              ↓                               │
│                    Pull Latest Code                          │
│                              ↓                               │
│                    Rebuild Containers                        │
│                              ↓                               │
│                    ✅ Auto-Deploy Complete!                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. API Request Flow
```
Mobile App → Internet → DigitalOcean IP:8080 → Spring Boot API → MySQL
                                                                    ↓
Mobile App ← Internet ← DigitalOcean ← Spring Boot API ← MySQL Data
```

### 2. Database Management Flow
```
Developer → Browser → http://IP:8081 → phpMyAdmin → MySQL
                                                       ↓
Developer ← Browser ← phpMyAdmin ← MySQL Query Results
```

### 3. Deployment Flow
```
Developer → git push origin main → GitHub Repository
                                        ↓
                              GitHub Actions Workflow
                                        ↓
                          SSH to DigitalOcean Droplet
                                        ↓
                              git pull latest code
                                        ↓
                          docker-compose rebuild
                                        ↓
                              Restart containers
                                        ↓
                          ✅ Application Updated!
```

---

## Container Network

```
┌─────────────────────────────────────────────┐
│         Docker Network: ddas-network        │
│                                             │
│  ┌──────────┐      ┌──────────┐            │
│  │   API    │◄────►│  MySQL   │            │
│  │          │      │          │            │
│  └──────────┘      └─────▲────┘            │
│                          │                  │
│                    ┌─────┴──────┐           │
│                    │ phpMyAdmin │           │
│                    └────────────┘           │
│                                             │
└─────────────────────────────────────────────┘
```

All containers can communicate using service names:
- API connects to MySQL using hostname: `mysql`
- phpMyAdmin connects to MySQL using hostname: `mysql`

---

## Port Mapping

| Service | Internal Port | External Port | Access |
|---------|--------------|---------------|--------|
| Spring Boot API | 8080 | 8080 | Public |
| MySQL | 3306 | 3306 | Public (can be restricted) |
| phpMyAdmin | 80 | 8081 | Public (can be restricted) |

---

## Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: DigitalOcean Firewall (UFW)  │
│  - Allows: 22, 8080, 8081               │
│  - Blocks: All other ports              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 2: Docker Network Isolation      │
│  - Containers isolated by default       │
│  - Only exposed ports accessible        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 3: MySQL Authentication          │
│  - Username/Password required           │
│  - Stored in .env file                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Layer 4: GitHub Secrets                │
│  - SSH keys encrypted                   │
│  - Only GitHub Actions can access       │
└─────────────────────────────────────────┘
```

---

## Storage

```
┌─────────────────────────────────────┐
│  MySQL Data Volume (Persistent)    │
│                                     │
│  Location: Docker Volume            │
│  Name: mysql-data                   │
│  Survives container restarts        │
│                                     │
│  ✅ Your data is safe even if       │
│     containers are recreated        │
└─────────────────────────────────────┘
```

---

## Deployment Process

```
LOCAL MACHINE               GITHUB                DIGITALOCEAN
    │                         │                        │
    │ git push origin main    │                        │
    ├────────────────────────►│                        │
    │                         │                        │
    │                         │ Trigger GitHub Actions │
    │                         ├───────────────────────►│
    │                         │                        │
    │                         │                    SSH Login
    │                         │                        │
    │                         │                   git pull
    │                         │                        │
    │                         │              docker-compose down
    │                         │                        │
    │                         │              docker-compose build
    │                         │                        │
    │                         │              docker-compose up -d
    │                         │                        │
    │                         │◄─────── Deployment ────┤
    │                         │         Complete!       │
    │◄────── Notification ────┤                        │
    │      (GitHub Actions)   │                        │
```

---

## Technologies Used

- **Backend Framework**: Spring Boot 4.0.2
- **Database**: MySQL 8.0
- **Database Management**: phpMyAdmin
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting**: DigitalOcean Ubuntu Droplet
- **Web Server**: Apache Tomcat (embedded in Spring Boot)

---

## Scalability Options (Future)

```
Current Setup:
┌─────────────┐
│ 1 Droplet   │
│ - API       │
│ - MySQL     │
│ - phpMyAdmin│
└─────────────┘

Future Scaling:
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  API        │   │  API        │   │  Database   │
│  Droplet 1  │   │  Droplet 2  │   │  Droplet    │
└──────┬──────┘   └──────┬──────┘   └──────▲──────┘
       │                 │                  │
       └─────────────────┴──────────────────┘
              Load Balancer
```

---

This architecture provides:
- ✅ Easy deployment
- ✅ Team collaboration via phpMyAdmin
- ✅ Automatic updates from GitHub
- ✅ Persistent data storage
- ✅ Container isolation
- ✅ Scalable design

