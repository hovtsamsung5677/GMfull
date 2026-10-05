@echo off
echo Stopping old backend on port 3000...
for /f "tokens=5" %%a in ('netstat -ano -p tcp ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
echo Starting backend...
call npm run start:dev
pause
