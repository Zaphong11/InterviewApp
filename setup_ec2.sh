#!/bin/bash

# setup_ec2.sh
# Script to set up a fresh Ubuntu server for the Interview App

set -e  # Exit immediately if a command exits with a non-zero status.

# Function to print colored output
print_status() {
    echo -e "\033[1;32m==> $1\033[0m"
}

print_status "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

print_status "Installing prerequisites..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release

print_status "Installing Docker..."
# Add Docker's official GPG key:
sudo mkdir -p /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
fi

# Set up the repository:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

print_status "Adding user to docker group..."
# Get the actual user (if run with sudo, use SUDO_USER, otherwise USER)
REAL_USER=${SUDO_USER:-$USER}
sudo usermod -aG docker "$REAL_USER"
print_status "User $REAL_USER added to docker group."

print_status "Creating necessary directories..."
# Create backend/uploads directory
mkdir -p backend/uploads
# Ensure the user owns the directory (in case it was created with root permissions if script run as root)
sudo chown -R "$REAL_USER:$REAL_USER" backend

print_status "Setup complete!"
echo "----------------------------------------------------------------"
echo "Vui lòng Logout và Login lại để áp dụng thay đổi nhóm Docker."
echo "Sau đó:"
echo "1. Tạo file .env (dựa trên .env.example nếu có)"
echo "2. Chạy lệnh: docker compose -f docker-compose.prod.yml up -d --build"
echo "----------------------------------------------------------------"
