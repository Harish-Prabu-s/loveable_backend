# 🚀 Vibely — Production Deployment Guide

This guide details the step-by-step process for deploying the Vibely stack (Backend + SFU + Coturn) to a Linux VPS (Ubuntu 22.04+).

---

## 🔐 1. Initial Server Setup

### SSH Configuration
To secure your server, use the following **SSH Public Key** for the root or deployment user:

```ssh
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIETulgidNdFF9KWzEVwNDg4nPpYmcmzzFgBzhJwXGhIn
```

> [!IMPORTANT]
> **Disable Password Authentication** in `/etc/ssh/sshd_config` once this key is added. Set `PasswordAuthentication no` and `PermitRootLogin prohibit-password`.

### Firewall (UFW)
Mediasoup and Coturn require specific UDP port ranges to be open for WebRTC traffic (using your public IP: **72.62.195.63**).

```bash
# Web
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp

# Mediasoup SFU (WebRTC Audio/Video)
ufw allow 40000:49999/udp

# Coturn (STUN/TURN)
ufw allow 3478/udp
ufw allow 3478/tcp
ufw allow 5349/tcp # TURNS (TLS)

ufw enable
```

---

## 🛠️ 2. Tooling Installation

Install Docker and Nginx on the host machine.

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Nginx & Certbot
apt update && apt install -y nginx certbot python3-certbot-nginx
```

---

## 📦 3. Application Deployment

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/your-username/loveable_backend.git /app
    cd /app
    ```

2.  **Environment Setup**:
    Sync the `.env` values (especially the `DJANGO_SECRET_KEY` and `TURN_STATIC_SECRET`).

3.  **Spin up the Stack**:
    ```bash
    docker compose -f docker-compose.yml up -d
    ```

---

## 🌐 4. Nginx Reverse Proxy (SSL)

Generate certificates for your domains:

```bash
certbot --nginx -d loveable.sbs -d api.loveable.sbs -d sfu.loveable.sbs -d turn.loveable.sbs
```

### Nginx Configuration Template (`/etc/nginx/sites-available/vibely`)

```nginx
server {
    listen 443 ssl;
    server_name api.loveable.sbs;

    # Allow large uploads for reels and images (up to 100MB)
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Serve uploaded media files directly (Profile pictures, Reels, etc.)
    # Note: Ensure this path correctly points to your Django media folder
    location /media/ {
        alias /var/www/loveable_backend_PRO/media/;
    }

    # WebSocket signaling endpoint
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}

server {
    listen 443 ssl;
    server_name sfu.loveable.sbs;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

## 📈 5. Scaling Strategy (1K → 1M Users)

| Metric | Config |
| :--- | :--- |
| **1K Users** | Single 8-core, 16GB VPS. Docker Compose with 4 SFU workers. |
| **10K Users** | Multi-server setup. Dedicated Redis cluster. Load-balancing across 3 SFU instances. |
| **100K Users** | Kubernetes (EKS/GKE). Auto-scaling SFU pods based on CPU. Amazon RDS for PostgreSQL. |
| **1M Users** | **Global Anycast Networking**. Multiple regions (US-East, EU-West, Asia-South-1). Geo-proximate TURN servers. |

---

-   **SFU Logs**: `docker compose logs -f sfu`

---

## 🔧 7. Common Issues & Debugging

### Docker Networking: Redis Connection
If you see `Error: Connection refused` in your backend logs while trying to connect to Redis:
- **Check the URL**: Inside Docker Compose, you MUST use `REDIS_URL=redis://redis:6379`.
- **Avoid localhost**: Using `localhost` inside a container refers only to that specific container. To talk to the Redis container, you must use its service name (`redis`).
- **Check health**: Run `docker compose ps` to ensure the `redis` service is "healthy".

### TURN Server Connection
If your WebRTC calls work on your local Wi-Fi but fail over Mobile Data (4G/5G):
- **Check port 3478**: Ensure UDP/TCP port 3478 is open on your server firewall.
- **Check external-ip**: Ensure the `external-ip` in `turnserver.conf` matches your server's **Public IP (72.62.195.63)**.
- **Check secret**: Verify that `TURN_STATIC_SECRET` in your `.env` matches `static-auth-secret` in `turnserver.conf`.

