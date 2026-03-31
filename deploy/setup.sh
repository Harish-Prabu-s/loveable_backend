#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Vibely — Production Server Bootstrap Script
# Usage: curl -sSL https://raw.githubusercontent.com/.../setup.sh | sudo bash
# ─────────────────────────────────────────────────────────────────────────────

set -e # Exit on error

echo "🚀 Starting Vibely Production Bootstrap..."

# 1. System Updates
apt update && apt upgrade -y

# 2. Install Dependencies
apt install -y curl git ufw nginx certbot python3-certbot-nginx

# 3. Configure Firewall (UFW)
echo "🔒 Configuring Firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https

# Mediasoup SFU (WebRTC Audio/Video)
ufw allow 40000:49999/udp
# Coturn (STUN/TURN)
ufw allow 3478/udp
ufw allow 3478/tcp
ufw allow 5349/tcp # TURNS (TLS)

echo "y" | ufw enable

# 4. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 5. Security: Setup Authorized SSH Key
# Replace with the user's specific key if not already there
SSH_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIETulgidNdFF9KWzEVwNDg4nPpYmcmzzFgBzhJwXGhIn"

if ! grep -q "$SSH_KEY" ~/.ssh/authorized_keys; then
    echo "🔑 Adding authorized SSH key..."
    mkdir -p ~/.ssh
    echo "$SSH_KEY" >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys
fi

# 6. Setup Directory Structure
mkdir -p /app/backend /app/sfu-server /app/coturn /app/media /app/redis_data

echo "✅ System bootstrap complete!"
echo "--------------------------------------------------------"
echo "Next steps:"
echo "1. Clone your repo into /app"
echo "2. Set up your .env files with your PUBLIC_IP: $(curl -s ifconfig.me)"
echo "3. Run: docker compose up -d"
echo "4. Run: certbot --nginx -d your-domain.com"
echo "--------------------------------------------------------"
