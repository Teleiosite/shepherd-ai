# Shepherd AI Backend Startup Script
# Run this from: SHEPHERD Ai\Agent File\backend\

Write-Host "🐍 Starting Shepherd AI Backend..." -ForegroundColor Green
Write-Host ""

# Check if virtual environment exists
if (-Not (Test-Path "venv\Scripts\Activate.ps1")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Virtual environment created!" -ForegroundColor Green
    Write-Host ""
}

# Activate virtual environment
Write-Host "🔓 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Check if dependencies are installed
Write-Host "📋 Checking dependencies..." -ForegroundColor Yellow
$uvicornCheck = & python -m pip list | Select-String "uvicorn"

if (-Not $uvicornCheck) {
    Write-Host "📦 Installing dependencies (this may take 2-3 minutes)..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Check for .env file
if (-Not (Test-Path ".env")) {
    Write-Host "⚠️  WARNING: .env file not found!" -ForegroundColor Red
    Write-Host "📝 Creating .env from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "🔧 IMPORTANT: Edit .env file and add your:" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL (from Supabase)" -ForegroundColor Yellow
    Write-Host "   - GEMINI_API_KEY (from Google AI Studio)" -ForegroundColor Yellow
    Write-Host "   - SECRET_KEY (any random 32 characters)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press Enter after you've updated .env to continue..." -ForegroundColor Cyan
    Read-Host
}

# Start the server
Write-Host "🚀 Starting FastAPI server..." -ForegroundColor Green
Write-Host "📍 URL: http://localhost:8000" -ForegroundColor Cyan
Write-Host "📖 API Docs: http://localhost:8000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

uvicorn app.main:app --reload --port 8000
