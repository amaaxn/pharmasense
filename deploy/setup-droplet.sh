#!/usr/bin/env bash
# =============================================================================
# PharmaSense — DigitalOcean Droplet Provisioning (Part 6 §5.6)
#
# Run once on a fresh Ubuntu 22.04 Droplet:
#   ssh root@<droplet-ip> 'bash -s' < deploy/setup-droplet.sh
#
# Prerequisites:
#   - Droplet: Ubuntu 22.04, 2 vCPU / 4GB RAM (or larger)
#   - DNS A record pointing your domain to the Droplet IP
# =============================================================================

set -euo pipefail

echo "=== PharmaSense Droplet Setup ==="

# 1. System updates
echo "--- Updating system packages ---"
apt-get update -y
apt-get upgrade -y

# 2. Install Docker
echo "--- Installing Docker ---"
if ! command -v docker &>/dev/null; then
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

# 3. Install Docker Compose (v2 plugin)
echo "--- Verifying Docker Compose ---"
docker compose version

# 4. Create application user
echo "--- Creating pharmasense user ---"
if ! id "pharmasense" &>/dev/null; then
    useradd --create-home --shell /bin/bash --groups docker pharmasense
    echo "User pharmasense created"
else
    echo "User pharmasense already exists"
fi

# 5. Create application directory
echo "--- Setting up application directory ---"
APP_DIR="/home/pharmasense/app"
mkdir -p "$APP_DIR"
chown pharmasense:pharmasense "$APP_DIR"

# 6. Configure firewall
echo "--- Configuring UFW firewall ---"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 7. Configure swap (for 2GB RAM droplets)
echo "--- Configuring swap ---"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap configured (2GB)"
else
    echo "Swap already configured"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Clone the repo:       su - pharmasense -c 'cd ~/app && git clone <repo-url> .'"
echo "  2. Copy environment:     cp .env.template .env && nano .env"
echo "  3. Set DOMAIN:           export DOMAIN=pharmasense.example.com"
echo "  4. Deploy:               docker compose -f docker-compose.prod.yml up -d --build"
echo "  5. Check health:         curl -f http://localhost:8080/api/health"
echo ""
