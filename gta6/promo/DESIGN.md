# DESIGN.md — Promo de lancement GTA VI

Le système de la vidéo, écrit avant de construire. Chaque couleur, taille, durée et courbe
de la promo vient d'ici. Si un plan a besoin d'une valeur qui n'y est pas, on l'ajoute ici
d'abord.

Ton : une campagne de grand média. Une régie de diffusion, des cartes d'info nettes, du
vrai footage partout. Rien d'abstrait sans raison.

## Couleurs

Prises sur le logo officiel « VI » et la jaquette.

| Nom | Valeur | Usage |
|---|---|---|
| `nuit` | `#14021F` | Fond principal (la jaquette est en `#1D002E`) |
| `aubergine` | `#1D002E` | Surfaces, cartes pleines |
| `contour` | `#1E0031` | Contours du logo, ombres portées colorées |
| `bleu` | `#3F45BB` | Début du dégradé VI |
| `violet` | `#9A39BB` | Milieu haut du dégradé |
| `rose` | `#E25790` | Milieu bas, mise en valeur |
| `corail` | `#FF775C` | Prix, appels à l'action |
| `orange` | `#FF9745` | Fin du dégradé, éclats de lumière |
| `creme` | `#FFF4E8` | Texte principal sur fond sombre |
| `brume` | `rgba(255,244,232,.62)` | Texte secondaire |
| `verre` | `rgba(255,255,255,.08)` + flou 24 px + liseré `rgba(255,255,255,.18)` | Cartes en verre |

Dégradé VI : `linear-gradient(180deg, #3F45BB 0%, #9A39BB 32%, #E25790 58%, #FF775C 80%, #FF9745 100%)`.
On ne l'emploie que pour les grands moments : logo, prix, date, titre de chapitre.
Pas plus d'un dégradé VI à l'écran à la fois.

## Typographie

| Rôle | Police | Réglages |
|---|---|---|
| Titres géants | Archivo (variable) | capitales, `wght` 800–900, `wdth` 62 (serré) ; interlignage 0,86 ; approche −0,01 em |
| Titres animés | Archivo (variable) | la largeur `wdth` 125 → 62 et la graisse 300 → 900 s'animent : les lettres « se resserrent » |
| Accents éditoriaux | Instrument Serif italique | un mot ou deux par plan, en minuscules (« deux histoires », « bienvenue ») |
| Données, régie | JetBrains Mono | capitales, 15–20 px, approche +0,22 em |

Échelle (px à 1920×1080) : 15 · 20 · 28 · 44 · 72 · 120 · 200 · 340.
Chiffres toujours en chiffres tabulaires pour les compteurs.

## Grille

- Image 1920 × 1080, marges de sécurité 96 px (côtés) et 72 px (haut, bas).
- 12 colonnes de 116 px, gouttières de 32 px.
- Cartes : rayon 28 px (grandes), 16 px (petites) ; liseré 1,5 px.

## Mouvement

Une seule famille de courbes pour tout le film :

| Nom | Courbe | Usage |
|---|---|---|
| `sortie` | `cubic-bezier(0.16, 1, 0.3, 1)` | Tout ce qui arrive |
| `traversee` | `cubic-bezier(0.76, 0, 0.24, 1)` | Ce qui se déplace d'un point à un autre (caméra, volets) |
| `entree` | `cubic-bezier(0.7, 0, 0.84, 0)` | Ce qui sort ; une sortie dure 0,6 × l'entrée |
| `ressort` | ressort amorti (raideur 170, amortissement 22) | Cartes d'interface, prix, badges : léger dépassement, jamais de rebond mou |

- **Tempo** : la chanson du trailer 2 tourne à 129,7 BPM. 1 temps = 0,4625 s, 1 mesure = 1,85 s.
  Les coupes tombent sur les temps, les changements de chapitre sur les mesures.
- **Cascade** : 60 ms entre deux éléments d'un groupe (1/8 de temps).
- On n'anime jamais depuis `scale(0)` : une arrivée part de `scale(0.92)` + opacité 0 + flou 12 px.
- Le flou masque les transitions : chaque coupe rapide passe par un flou directionnel de 2 images.
- Flou de mouvement sur tout le film (sous-images, obturateur à 180°).
- Seuls `transform`, `opacity` et `filter` s'animent dans l'habillage HTML.

## Les 10 effets du vocabulaire (où ils servent)

| Effet | Où |
|---|---|
| Déclenché | Chaque carte d'info qui entre (éditions, prix, plateformes) |
| Lié | La caméra qui traverse le « VI » ; l'aiguille du tuner radio qui suit la musique |
| Parallaxe | Leonida : 3 couches (footage, cartes de régions, titres) à des vitesses différentes |
| Collant | Le cadre de régie : coins, chapitre « 03 / 07 », timecode, voyant REC |
| Épinglé | La mosaïque de la jaquette reste en place pendant que ses cases s'allument une à une |
| Aimanté | Le carrousel des personnages et le tuner radio se posent net sur chaque élément |
| Horizontal | Le carrousel des personnages ; la bande des stations radio |
| Cascade | Les cases de la mosaïque, les lignes du comparatif des éditions |
| Révélation du texte | Les accroches, mot par mot, au rythme de la voix et des temps |
| Barre de progression | En bas du cadre : la progression du film, puis le compte à rebours jusqu'à la sortie |

## Texture

Grain léger (opacité 0,05), vignette douce, aberration chromatique de 1–2 px seulement
sur les impacts, éclats de lumière orange sur les temps forts. Le footage garde ses
couleurs d'origine ; on ne le teinte jamais.
