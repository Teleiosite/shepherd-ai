@echo off
echo.
echo 🐍 Starting Shepherd AI Backend...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    echo ✅ Virtual environment created!
    echo.
)

REM Activate virtual environment
echo 🔓 Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if uvicorn is installed
pip show uvicorn >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing dependencies (this may take 2-3 minutes)...
    pip install -r requirements.txt
    echo ✅ Dependencies installed!
    echo.
)

REM Check for .env file
if not exist ".env" (
    echo ⚠️  WARNING: .env file not found!
    echo 📝 Creating .env from template...
    copy .env.example .env
    echo.
    echo 🔧 IMPORTANT: Edit .env file and add your:
    echo    - DATABASE_URL (from Supabase)
    echo    - GEMINI_API_KEY (from Google AI Studio)
    echo    - SECRET_KEY (any random 32 characters)
    echo.
    echo Press any key after you've updated .env to continue...
    pause >nul
)

REM Start the server
echo.
echo 🚀 Starting FastAPI server...
echo 📍 URL: http://localhost:8000
echo 📖 API Docs: http://localhost:8000/api/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app.main:app --reload --port 8000
