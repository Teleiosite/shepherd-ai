# Shepherd AI Backend - Quick Setup Script
# Run this script to set up your development environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Shepherd AI Backend Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Python
Write-Host "[1/5] Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Python found - $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "Error: Python not found. Please install Python 3.10+ from python.org" -ForegroundColor Red
    exit 1
}

# Step 2: Create Virtual Environment
Write-Host "`n[2/5] Creating virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "Success: Virtual environment already exists" -ForegroundColor Green
} else {
    python -m venv venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success: Virtual environment created" -ForegroundColor Green
    } else {
        Write-Host "Error: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Activate Virtual Environment
Write-Host "`n[3/5] Activating virtual environment..." -ForegroundColor Yellow
try {
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "Success: Virtual environment activated" -ForegroundColor Green
} catch {
    Write-Host "Info: Trying to set execution policy..." -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    & ".\venv\Scripts\Activate.ps1"
    Write-Host "Success: Virtual environment activated" -ForegroundColor Green
}

# Step 4: Install Dependencies
Write-Host "`n[4/5] Installing dependencies (this may take 5-10 minutes)..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
pip install -r requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 5: Check .env file
Write-Host "`n[5/5] Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "Success: .env file exists" -ForegroundColor Green
} else {
    Write-Host "Info: Creating .env from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Success: .env file created" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: You need to edit .env file with your credentials:" -ForegroundColor Yellow
    Write-Host "   - DATABASE_URL (from Supabase)" -ForegroundColor White
    Write-Host "   - GEMINI_API_KEY (your API key)" -ForegroundColor White
    Write-Host "   - SECRET_KEY (generate below)" -ForegroundColor White
}

# Generate SECRET_KEY
Write-Host "`nGenerate SECRET_KEY for .env:" -ForegroundColor Cyan
python -c "import secrets; print(secrets.token_hex(32))"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your credentials" -ForegroundColor White
Write-Host "2. Run: python -m uvicorn app.main:app --reload" -ForegroundColor White
Write-Host "3. Visit: http://localhost:8000/api/docs" -ForegroundColor White
Write-Host ""
