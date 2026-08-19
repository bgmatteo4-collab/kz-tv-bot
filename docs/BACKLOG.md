# Suivi — bugs connus et corrections

Journal des problèmes remontés en test et de leur traitement. Les tâches de
conception à venir sont dans la section « Prochaines étapes » du
[GDD](GDD.md).

---

## Corrigé

### Le contenu des fenêtres est invisible
*Remonté au 3e test.* Les fenêtres s'ouvrent, la barre des tâches répond, mais
l'intérieur des applications ne s'affiche pas.

**Cause.** Une interface créée par script utilise par défaut le comportement
`ZIndexBehavior.Global` : le `ZIndex` est alors comparé à l'échelle de toute la
surface, et non entre frères et soeurs. Le cadre d'une fenêtre, qui porte un
`ZIndex` élevé pour gérer l'empilement, se dessinait donc par-dessus son propre
contenu resté à 1.

**Correction.** `ZIndexBehavior = Sibling` sur la `SurfaceGui`. Le `ZIndex`
d'un élément n'est plus comparé qu'à celui de ses frères, ce qui est le
comportement supposé partout dans le code de l'OS.

### L'écran du moniteur restait noir
*Remonté au 2e test.* La face `Front` d'une part pointe vers son `-Z` local.
Le moniteur n'était pas tourné, la `SurfaceGui` s'affichait donc vers le mur du
fond. Tout le mobilier orienté vers le joueur est désormais tourné
explicitement.

### Rien n'était cliquable
*Remonté au 2e test.* Viser une interface de 1280x720 de biais à plusieurs
mètres est impraticable. Ajout d'une invite de proximité qui verrouille la
caméra face à la dalle et libère le curseur.

### La séquence de démarrage se jouait dans le vide
*Remonté au 1er test.* L'OS démarrait dès la réception de l'état, sur une dalle
encore éteinte parce que le joueur était trop loin. Le démarrage attend
maintenant que le joueur soit à portée.

---

## À surveiller

- **Lisibilité de l'interface sur la dalle.** Les tailles de texte et les
  marges ont été calibrées sans jamais voir le rendu. Tout est réglable dans
  `src/shared/OS/Theme.lua`.
- **Coût des `SurfaceGui`.** Une seule dalle aujourd'hui, mais la régie du
  plateau en aura une dizaine. Le LOD actuel se contente d'éteindre au-delà de
  14 studs — il faudra un vrai palier intermédiaire (image figée).
- **Le rappel « E — se lever »** se dessine dans le même plan que les fenêtres
  et peut passer devant l'une d'elles en bas à gauche.
