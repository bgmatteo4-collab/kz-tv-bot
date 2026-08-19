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

### Aucune icône, donc rien à ouvrir
*Remonté au 5e test.* La barre des tâches n'affichait aucun lanceur : le jeu
devenait injouable dès le démarrage.

**Cause.** Les icônes étaient des caractères Unicode (`◉`, `✉`, `◍`) posés sur
des boutons au fond transparent. Une police qui ne contient pas ces glyphes ne
laisse donc strictement rien à voir ni à viser.

**Correction.** Les lanceurs sont désormais des tuiles pleines et colorées
portant un monogramme en lettres normales, et le lanceur principal a été
déplacé sur le bureau, où les icônes sont plus grandes et lisibles de loin sur
une dalle 3D. La barre des tâches garde les mêmes monogrammes.

---

## À surveiller

- **Un deuxième écran posé démarre son propre KZ OS.** Conséquence directe du
  fait qu'une dalle taguée devient un poste complet. C'est spectaculaire à voir
  et ce n'est pas le comportement visé : deux moniteurs branchés sur la même
  machine doivent partager un seul système, avec des fenêtres qui glissent de
  l'un à l'autre. À unifier quand le multi-écran sera implémenté pour de bon.
- **Les objets sont des primitives assemblées.** Correct et cohérent, mais ça
  reste des blocs. Le système d'assets est en place : déposer un modèle nommé
  comme l'objet dans `ReplicatedStorage.Assets.Items` le remplace
  automatiquement. Voir [ASSETS.md](ASSETS.md).
- **Le rappel « E — se lever » se dessine au-dessus des fenêtres** en bas à
  gauche du bureau.
- **Les objets posés ne bloquent pas le passage.** `CanCollide` est à false
  faute de vrais volumes : on traverse son propre canapé. À rétablir avec les
  modèles 3D.

- **Lisibilité de l'interface sur la dalle.** Les tailles de texte et les
  marges ont été calibrées sans jamais voir le rendu. Tout est réglable dans
  `src/shared/OS/Theme.lua`.
- **Coût des `SurfaceGui`.** Une seule dalle aujourd'hui, mais la régie du
  plateau en aura une dizaine. Le LOD actuel se contente d'éteindre au-delà de
  14 studs — il faudra un vrai palier intermédiaire (image figée).
- **Le rappel « E — se lever »** se dessine dans le même plan que les fenêtres
  et peut passer devant l'une d'elles en bas à gauche.
