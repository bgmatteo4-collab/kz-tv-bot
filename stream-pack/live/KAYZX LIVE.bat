@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
title Kayzx Live
color 0E

echo.
echo    KAYZX LIVE
echo    ==========
echo.

rem --- Node.js : le moteur. On l'installe tout seul s'il manque.
node --version >nul 2>&1
if not errorlevel 1 goto pret

echo    Premiere utilisation : il manque le moteur (Node.js).
echo    Je l'installe, ca prend une minute. Ne ferme pas cette fenetre.
echo.

where winget >nul 2>&1
if errorlevel 1 goto manuel

winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
rem winget met a jour le PATH : on le relit sans fermer la fenetre
for /f "skip=2 tokens=2,*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set "SYSPATH=%%b"
for /f "skip=2 tokens=2,*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USRPATH=%%b"
set "PATH=%SYSPATH%;%USRPATH%"

node --version >nul 2>&1
if not errorlevel 1 (
  echo.
  echo    C'est installe.
  echo.
  goto pret
)

echo.
echo    Node.js est installe mais Windows ne le voit pas encore.
echo    Ferme cette fenetre et relance KAYZX LIVE : ce sera bon.
echo.
pause
exit /b

:manuel
echo    Je n'ai pas pu l'installer tout seul.
echo.
echo    La page de telechargement va s'ouvrir :
echo      1. Clique sur le gros bouton vert "LTS"
echo      2. Installe en cliquant Suivant partout
echo      3. Relance KAYZX LIVE
echo.
pause
start https://nodejs.org/fr
exit /b

:pret
rem --- Raccourci sur le Bureau, la premiere fois seulement
if not exist ".raccourci-fait" (
  powershell -NoProfile -Command ^
    "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Kayzx Live.lnk');" ^
    "$s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.Description='Kayzx Live'; $s.Save()" >nul 2>&1
  echo fait > ".raccourci-fait"
  echo    J'ai mis un raccourci "Kayzx Live" sur ton Bureau.
  echo.
)

echo    C'est parti. La page de reglages s'ouvre dans ton navigateur.
echo    Laisse cette fenetre ouverte pendant tout le live.
echo.

start "" http://localhost:8420
node serveur.js %*

echo.
echo    Kayzx Live s'est arrete.
pause
