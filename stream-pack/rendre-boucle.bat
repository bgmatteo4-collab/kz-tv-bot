@echo off
rem Rendu final de la boucle d'attente sur la carte graphique du PC (voir RENDU-PC.md).
rem Relancer ce fichier reprend le rendu la ou il s'etait arrete.
setlocal
set "BLENDER=C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
if not exist "%BLENDER%" (
  echo Blender 5.1 introuvable. Installe-le depuis blender.org, ou corrige la ligne BLENDER de ce fichier.
  pause
  exit /b 1
)
set "ICI=%~dp0"
echo [1/3] Preparation des assets (seulement la premiere fois)...
"%BLENDER%" -b -P "%ICI%blender\preparer.py" || goto erreur
echo [2/3] Rendu des 900 images sur la carte graphique...
"%BLENDER%" -b -P "%ICI%blender\piece.py" -- --clip boucle --film "%ICI%rendus\boucle" --gpu 1 --largeur 1920 --echantillons 96 || goto erreur
echo [3/3] Assemblage de la video avec le grain...
"%BLENDER%" -b -P "%ICI%blender\assembler.py" -- --images "%ICI%rendus\boucle" --sortie "%ICI%rendus\boucle-30s.mp4" || goto erreur
echo Termine : rendus\boucle-30s.mp4
pause
exit /b 0
:erreur
echo Une etape a echoue : lis les messages ci-dessus.
pause
exit /b 1
