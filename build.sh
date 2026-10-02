#!/usr/bin/env bash
# Render build script for Shepherd AI Backend
set -o errexit

echo "Starting Shepherd AI Backend build..."

# Upgrade build tools
python -m pip install --upgrade pip setuptools wheel

# Install dependencies in backend directory
cd "Agent File/backend"
python -m pip install -r requirements.txt

echo "Build complete!"
