@echo off
setlocal
title AI Assignment Checker - Launcher
color 0A

echo.
echo  ============================================
echo   AI Assignment Checker - Starting Up...
echo  ============================================
echo.

set DOCKER_OK=NO
set OLLAMA_OK=NO

echo [1/7] Checking Python...
python --version >nul 2>&1
if errorlevel 1 ( echo  [ERROR] Python not found. & pause & exit /b 1 )
echo  [OK] Python found.

echo [2/7] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 ( echo  [ERROR] Node.js not found. & pause & exit /b 1 )
echo  [OK] Node.js found.

echo [3/7] Checking Docker...
docker --version >nul 2>&1
if not errorlevel 1 ( set DOCKER_OK=YES & echo  [OK] Docker found. ) else ( echo  [WARN] Docker not found. Grammar check skipped. )

echo [4/7] Checking Ollama...
ollama --version >nul 2>&1
if not errorlevel 1 ( set OLLAMA_OK=YES & echo  [OK] Ollama found. ) else ( echo  [WARN] Ollama not found. Content AI will use fallback. )

echo.
echo  ============================================
echo   Setting up Backend...
echo  ============================================
echo.

echo [5/7] Setting up Python virtual environment...
cd /d "%~dp0backend"
if not exist venv ( python -m venv venv & echo  [OK] venv created. ) else ( echo  [OK] venv exists. )
call venv\Scripts\activate.bat
python -c "import fastapi" >nul 2>&1
if errorlevel 1 ( echo  Installing dependencies... & pip install -r requirements.txt )
echo  [OK] Backend ready.

cd /d "%~dp0"

echo.
echo  ============================================
echo   Setting up Frontend...
echo  ============================================
echo.

echo [6/7] Checking frontend dependencies...
cd /d "%~dp0frontend"
if not exist node_modules ( echo  Running npm install... & npm install )
echo  [OK] Frontend ready.

cd /d "%~dp0"

echo.
echo  ============================================
echo   Starting Services...
echo  ============================================
echo.

echo [7/7] Starting external services...

if "%DOCKER_OK%"=="YES" (
    docker ps 2>nul | findstr "8010" >nul 2>&1
    if errorlevel 1 ( docker run -d -p 8010:8010 --restart unless-stopped silviof/docker-languagetool >nul 2>&1 & echo  [OK] LanguageTool starting. )
    if not errorlevel 1 ( echo  [OK] LanguageTool already running. )
) else ( echo  [SKIP] LanguageTool skipped. )

if "%OLLAMA_OK%"=="YES" (
    curl -s http://localhost:11434 >nul 2>&1
    if errorlevel 1 ( start /min "" ollama serve & timeout /t 3 /nobreak >nul & echo  [OK] Ollama started. )
    if not errorlevel 1 ( echo  [OK] Ollama already running. )
    ollama list 2>nul | findstr "llama2" >nul 2>&1
    if errorlevel 1 ( start "Pulling llama2" cmd /k "ollama pull llama2 && pause" & echo  [INFO] llama2 downloading in new window. )
    if not errorlevel 1 ( echo  [OK] llama2 ready. )
) else ( echo  [SKIP] Ollama skipped. )

if not exist "%~dp0backend\.env" (
    echo  Creating default .env...
    (
        echo MONGO_URI=mongodb://localhost:27017/ai_assignment_checker
        echo SECRET_KEY=change-this-secret-key-in-production
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=1440
        echo LLAMA_URL=http://localhost:11434
        echo LANGUAGETOOL_URL=http://localhost:8010
    ) > "%~dp0backend\.env"
    echo  [OK] .env created.
) else ( echo  [OK] .env found. )

echo.
echo  ============================================
echo   Launching Application
echo  ============================================
echo.

start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "Frontend - Vite" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak >nul
start http://localhost:5173

echo  Backend  ^>  http://localhost:8000
echo  Frontend ^>  http://localhost:5173
echo  API Docs ^>  http://localhost:8000/docs
echo.
pause