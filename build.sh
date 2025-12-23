#!/bin/bash
# Render build script for Shepherd AI Backend

set -o errexit  # Exit on error

echo "🚀 Starting Shepherd AI Backend build..."

# Navigate to backend directory
cd "Agent File/backend"

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🗄️ Running database migrations..."
# Run your database setup if you have migrations
# python -m alembic upgrade head

echo "✅ Build complete!"
