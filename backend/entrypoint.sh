#!/bin/sh
set -e

echo "Container's IP address: $(awk 'END{print $1}' /etc/hosts)"

# Navigate to backend folder
cd /backend

# Install dependencies
make install_deps

# Run your Python backend
# Adjust path since main.py is in plugin root
python ../main.py