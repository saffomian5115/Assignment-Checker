@echo off
title AI Assignment Checker - Launcher
color 0A

echo.
echo  ============================================
echo   AI Assignment Checker - Starting Up...
echo  ============================================
echo.

:: ─── Check Python ───────────────────────────────────
echo [1/7] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)
echo  [OK] Python found.

:: ─── Check Node.js ──────────────────────────────────
echo [2/7] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] Node.js found.

:: ─── Check Docker ────────────────────────────────────
echo [3/7] Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo  [WARN] Docker not found. LanguageTool (grammar check) will be skipped.
    echo         Install Docker from https://docker.com to enable grammar checking.
    set DOCKER_AVAILABLE=0
) else (
    echo  [OK] Docker found.
    set DOCKER_AVAILABLE=1
)

:: ─── Check Ollama ────────────────────────────────────
echo [4/7] Checking Ollama...
ollama --version >nul 2>&1
if errorlevel 1 (
    echo  [WARN] Ollama not found. Content AI check will use fallback scores.
    echo         Install Ollama from https://ollama.com to enable AI content analysis.
    set OLLAMA_AVAILABLE=0
) else (
    echo  [OK] Ollama found.
    set OLLAMA_AVAILABLE=1
)

echo.
echo  ============================================
echo   Setting up Backend...
echo  ============================================
echo.

:: ─── Backend venv ────────────────────────────────────
echo [5/7] Setting up Python virtual environment...
cd backend

if not exist venv (
    echo  Creating venv...
    python -m venv venv
    if errorlevel 1 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  [OK] venv created.
) else (
    echo  [OK] venv already exists.
)

:: ─── Activate venv and check/install requirements ────
call venv\Scripts\activate.bat

:: Check if fastapi is installed as a proxy for all deps
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo  [INFO] Installing backend dependencies (this may take a minute)...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo  [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed.
) else (
    echo  [OK] Backend dependencies already installed.
)

cd ..

:: ─── Frontend node_modules ────────────────────────────
echo.
echo  ============================================
echo   Setting up Frontend...
echo  ============================================
echo.
echo [6/7] Checking frontend dependencies...
cd frontend

if not exist node_modules (
    echo  [INFO] Running npm install (this may take a minute)...
    npm install
    if errorlevel 1 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo  [OK] npm packages installed.
) else (
    echo  [OK] node_modules already exists.
)

cd ..

:: ─── Start external services ──────────────────────────
echo.
echo  ============================================
echo   Starting Services...
echo  ============================================
echo.

echo [7/7] Starting external services...

:: Start LanguageTool via Docker
if "%DOCKER_AVAILABLE%"=="1" (
    echo  Checking LanguageTool Docker container...
    docker ps | findstr "8010" >nul 2>&1
    if errorlevel 1 (
        echo  Starting LanguageTool on port 8010...
        docker run -d -p 8010:8010 --restart unless-stopped silviof/docker-languagetool >nul 2>&1
        echo  [OK] LanguageTool starting (may take 20-30 seconds to be ready).
    ) else (
        echo  [OK] LanguageTool already running on port 8010.
    )
) else (
    echo  [SKIP] LanguageTool skipped (Docker not available).
)


:: Start Ollama and pull llama2 if needed
if "%OLLAMA_AVAILABLE%"=="1" (
    echo  Checking Ollama service...
    curl -s http://localhost:11434 >nul 2>&1
    if errorlevel 1 (
        echo  Starting Ollama service...
        start /min "" ollama serve
        timeout /t 3 /nobreak >nul
        echo  [OK] Ollama started.
    ) else (
        echo  [OK] Ollama already running.
    )

    echo  Checking if llama2 model is available...
    ollama list | findstr "llama2" >nul 2>&1
    if errorlevel 1 (
        echo  [INFO] Pulling llama2 model (this may take several minutes on first run)...
        start "Ollama - Pulling llama2" cmd /k "ollama pull llama2 && echo Done! You can close this window. && pause"
        echo  [INFO] llama2 download started in a new window. Backend will use fallback until download completes.
    ) else (
        echo  [OK] llama2 model already available.
    )
) else (
    echo  [SKIP] Ollama skipped (not installed).
)

:: ─── Check .env file ──────────────────────────────────
echo.
if not exist backend\.env (
    echo  [WARN] backend\.env not found. Creating default .env...
    (
        echo MONGO_URI=mongodb://localhost:27017/ai_assignment_checker
        echo SECRET_KEY=change-this-secret-key-in-production
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=1440
        echo LLAMA_URL=http://localhost:11434
        echo LANGUAGETOOL_URL=http://localhost:8010
    ) > backend\.env
    echo  [OK] Default .env created. Edit backend\.env to change settings.
) else (
    echo  [OK] backend\.env found.
)

:: ─── Check MongoDB ────────────────────────────────────
echo  Checking MongoDB connection...
mongosh --eval "db.runCommand({ping:1})" --quiet >nul 2>&1
if errorlevel 1 (
    echo  [WARN] MongoDB not detected on localhost:27017.
    echo         Make sure MongoDB is running before using the app.
) else (
    echo  [OK] MongoDB is running.
)

:: ─── Launch Backend ───────────────────────────────────
echo.
echo  ============================================
echo   Launching Application
echo  ============================================
echo.
echo  Starting Backend  (http://localhost:8000)
echo  Starting Frontend (http://localhost:5173)
echo.
echo  API Docs available at: http://localhost:8000/docs
echo.
echo  Press Ctrl+C in each window to stop.
echo.

:: Backend in new window
start "Backend - FastAPI" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: Small delay so backend starts first
timeout /t 2 /nobreak >nul

:: Frontend in new window
start "Frontend - Vite" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Open browser after a short delay
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo  ============================================
echo   All services launched!
echo  ============================================
echo.
echo   Backend  ^>  http://localhost:8000
echo   Frontend ^>  http://localhost:5173
echo   API Docs ^>  http://localhost:8000/docs
echo.
echo  Close this window anytime. Each service
echo  runs in its own window.
echo.
pause