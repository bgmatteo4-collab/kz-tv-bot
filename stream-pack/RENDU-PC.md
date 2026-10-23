# Rendre le pack sur ton PC (carte graphique)

Ici, sans carte graphique, une image en 1080p prend plusieurs minutes. Ta carte graphique le fait beaucoup plus vite :
compte quelques heures pour la boucle de 30 s (900 images).

1. **Installe Blender 5.1** (gratuit, sans compte) : https://www.blender.org/download/ — laisse le dossier
   d'installation par défaut.
2. **Récupère le projet** : sur GitHub, ouvre le dépôt `kz-tv-bot`, choisis la branche `claude/pensive-volta-ddoe0l`,
   puis **Code → Download ZIP**, et dézippe-le où tu veux.
3. **Double-clique sur `stream-pack\rendre-boucle.bat`**. La première fois, il télécharge les assets (environ 1 Go :
   textures, modèles, affiches, paysages de la TV), puis il rend les images et assemble la vidéo.
4. La vidéo finale est dans `stream-pack\rendus\boucle-30s.mp4`. Dans OBS : **Source média**, coche **Boucle**.

Si le rendu est interrompu (PC éteint, coupure), relance simplement le `.bat` : il reprend là où il s'était arrêté.

Sur Mac ou Linux, les mêmes étapes en ligne de commande, depuis le dossier du projet :

    blender -b -P stream-pack/blender/preparer.py
    blender -b -P stream-pack/blender/piece.py -- --clip boucle --film stream-pack/rendus/boucle --gpu 1 --largeur 1920 --echantillons 96
    blender -b -P stream-pack/blender/assembler.py -- --images stream-pack/rendus/boucle --sortie stream-pack/rendus/boucle-30s.mp4
