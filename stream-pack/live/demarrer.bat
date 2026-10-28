@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Kayzx Live

echo.
echo   ================================
echo      KAYZX LIVE
echo   ================================
echo.

node --version >nul 2>&1
if errorlevel 1 (
  echo   Il manque Node.js sur ce PC.
  echo.
  echo   C'est gratuit et ca prend deux minutes :
  echo     1. La page de telechargement va s'ouvrir
  echo     2. Clique sur le gros bouton vert "LTS"
  echo     3. Installe en cliquant Suivant partout
  echo     4. Relance ce fichier
  echo.
  pause
  start https://nodejs.org/fr
  exit /b
)

echo   Demarrage...
echo.
start "" http://localhost:8420
node serveur.js

echo.
echo   Kayzx Live s'est arrete.
pause
