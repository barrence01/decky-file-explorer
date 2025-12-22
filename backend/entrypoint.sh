#!/bin/sh
set -e

# Go to plugin root (one level up from backend/)
cd ..

# Check that the current folder is named "decky_file_explorer"
CURRENT_DIR_NAME=$(basename "$PWD")
if [ "$CURRENT_DIR_NAME" != "decky_file_explorer" ]; then
    echo "Error: plugin root folder must be named 'decky_file_explorer'. Current folder is '$CURRENT_DIR_NAME'."
    exit 1
fi

# Install Python dependencies from pyproject.toml
pip install -e .

# Run Python backend
python main.py
