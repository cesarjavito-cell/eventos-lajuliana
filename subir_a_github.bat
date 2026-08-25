@echo off
title Subir a GitHub - CateringPro
echo =======================================================
echo     Subiendo CateringPro a tu cuenta de GitHub
echo =======================================================
set PATH=%PATH%;C:\Program Files\nodejs
cd /d "%~dp0"
echo.
git remote add origin https://github.com/cesarjavito-cell/catering-pro.git
git branch -M main
git push -u origin main
echo.
echo =======================================================
echo   Si finalizo correctamente, ya esta subido a GitHub!
echo =======================================================
pause
