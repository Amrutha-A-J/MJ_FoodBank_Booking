#!/bin/bash
set -euo pipefail

# Configure the server timezone and enable NTP synchronization

# Set timezone to UTC
if command -v timedatectl >/dev/null 2>&1; then
  sudo timedatectl set-timezone UTC
  sudo timedatectl set-ntp true
  timedatectl status
else
  echo "timedatectl not found. Install systemd or configure timezone/NTP manually." >&2
  exit 1
fi
