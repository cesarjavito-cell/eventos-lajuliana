@echo off
title Juliana Catering App
echo =======================================================
echo     Iniciando Servidor de CateringPro (La Juliana)
echo =======================================================
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
echo.
echo La app esta lista. Abre tu navegador en:
echo   - En esta PC:  http://localhost:5173
echo.
npm.cmd run dev -- --host
pause
