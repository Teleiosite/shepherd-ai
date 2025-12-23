#!/bin/bash
# Render build script for Shepherd AI Backend

set -o errexit  # Exit on error

echo "🚀 Starting Shepherd AI Backend build..."

# Upgrade pip, setuptools, and wheel first
echo "⬆️ Upgrading build tools..."
pip install --upgrade pip setuptools wheel

# Navigate to backend directory
cd "Agent File/backend"

echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Build complete!"
