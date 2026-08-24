# TOUCHLINE — direction artistique (proposition)

> **Ce document ne fait pas encore autorité.** C'est la réécriture proposée après
> la précision de Matteo : aucune vidéo de match ne passe sous l'overlay, le
> cadre est plein écran, la webcam occupe une scène 16:9 centrale.
>
> Tant qu'il n'a pas validé, `docs/DESIGN_SYSTEM.md` reste la référence et c'est
> lui que lisent les skills, les tokens et le test de dérive. À la validation, ce
> fichier remplace l'autre et les tokens suivent dans le même commit.

Une fois validé, ce document fait autorité. Toute couleur, toute taille de texte, tout rayon d'angle du
projet vient d'ici. Si un besoin n'est pas couvert, on étend ce document — on n'improvise
pas dans un fichier CSS.

---

## L'idée directrice

**L'overlay n'accompagne pas l'image : il est l'image.**

Aucune vidéo de match ne passe dessous. Ce que le public regarde pendant deux heures,
c'est ce document rendu à l'écran, plus une webcam. Il n'y a rien derrière pour rattraper
une hiérarchie ratée, et rien pour occuper l'œil quand nous n'avons rien à dire.

Trois conséquences, dont tout le reste découle.

**Un spectateur qui arrive doit comprendre l'état du match en une seconde.** Il ne voit
pas le terrain. Le score, le chrono et la phase sont donc permanents, jamais masqués,
jamais déplacés.

**Rien n'est jamais vide.** Un module qui disparaît sans successeur, c'est un rectangle
noir à l'antenne. La scène centrale a toujours un occupant — c'est une règle de moteur
autant qu'une règle de design.

**Ça doit tenir deux heures.** Un habillage qui bouge en permanence fatigue au bout de dix
minutes. Le cadre est calme et immobile ; seule la scène centrale change. L'animation est
un événement, pas un fond sonore.

Registre visé : le sérieux d'une application de données sportives (SofaScore, FotMob),
pas l'énergie d'un overlay gaming. Sobre, dense, rapide.

> **Ce qui a changé, et pourquoi.** La version précédente de ce document partait d'un
> overlay superposé à la vidéo du match : « un objet posé sur une image en mouvement dont
> il ne connaît ni les couleurs ni la luminosité ». C'est de là que venaient les blocs
> opaques et l'interdiction du texte posé sur l'image. Cette prémisse est fausse — il n'y
> a pas de vidéo. Les blocs opaques restent, mais parce qu'ils structurent le cadre, plus
> parce qu'ils protègent d'un fond inconnu.

---

## Le cadre et la scène

Le canevas 1920×1080 se divise en deux zones qui n'obéissent pas aux mêmes règles.

```
┌──────────────────────────────────────────────┐
│           SCORE · CHRONO · PHASE             │ 180
├──────────┬────────────────────────┬──────────┤
│  colonne │                        │  colonne │
│  gauche  │      SCÈNE 16:9        │  droite  │ 720
│          │      1280 × 720        │          │
│   320    │                        │   320    │
├──────────┴────────────────────────┴──────────┤
│                bandeau bas                   │ 180
└──────────────────────────────────────────────┘
```

**Le cadre** — bandeau haut, colonnes, bandeau bas. Permanent. Il ne s'anime jamais à
l'entrée : il est là avant le direct et il y reste. Ses valeurs changent, sa géométrie
non. Il ne porte pas de lame — il n'entre par aucun côté.

**La scène** — 1280×720 au centre, à partir de (320, 180). C'est le seul endroit qui
change : webcam, terrain, statistiques, ouverture, clôture. 1280×720 est une taille native
de webcam, donc aucun rééchantillonnage, et les marges tombent sur des valeurs rondes.

**La scène est vide quand la webcam l'occupe.** L'overlay laisse alors le trou réellement
transparent et OBS y compose la caméra. C'est le seul endroit du produit où la
transparence a encore un rôle.

Les tailles de cette section sont des tokens (`--scene-x`, `--scene-y`, `--scene-largeur`,
`--scene-hauteur`). Rien ne les recalcule ailleurs.

**Zones sûres.** Les 48 px de marge extérieure restent : les plateformes recadrent. Rien
de vital dans cette bande.

---

## Couleur

Palette volontairement courte. Six valeurs, pas une de plus.

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Sol de l'habillage | `--surface` | `#0E1620` | Bleu-nuit profond, jamais du noir pur. Le fond du cadre, plein et opaque. |
| Blocs posés dessus | `--surface-raised` | `#18242F` | Panneaux, lignes alternées, en-têtes, champs de saisie. |
| Bordure | `--line` | `#2B3A48` | 1px. Sépare, ne décore pas. |
| Texte principal | `--ink` | `#F2F6F9` | Blanc légèrement bleuté. |
| Texte secondaire | `--ink-muted` | `#8DA0B0` | Labels, unités, métadonnées. Jamais pour un chiffre important. |
| Accent | `--signal` | `#FFB020` | Ambre. Voir ci-dessous. |

Plus deux couleurs d'état, strictement fonctionnelles :

| | | |
|---|---|---|
| `--live` | `#FF4438` | Uniquement le point « en direct » et le carton rouge. |
| `--good` | `#3DD68C` | Uniquement une confirmation en régie. Jamais dans l'overlay. |

**Pas de septième valeur pour le sol.** `--surface` devient le fond plein de l'habillage
et `--surface-raised` porte ce qui se pose dessus. Les rôles s'inversent par rapport à la
version précédente, la palette ne s'allonge pas.

**Pourquoi l'ambre.** Il reste l'accent le mieux placé pour un habillage de football :
distinct des couleurs de club les plus fréquentes, sans conflit avec le rouge du signal
« en direct », et porteur d'une association de balisage qui va bien au sport.

**Règle d'usage de l'accent.** L'ambre ne colorie pas du texte. Il ne sert qu'à **la lame**
(voir Signature) et aux états actifs de la régie. Un module qui contient trois éléments
ambre est un module raté.

Les couleurs d'équipe fournies par les données peuvent apparaître, mais uniquement sur des
surfaces dédiées et bornées : pastille d'équipe, barre de possession, maillot d'un joueur
sur le terrain. Elles ne débordent jamais sur le châssis.

---

## Typographie

**Archivo** en famille unique, exploitée sur trois axes différents. Une seule famille,
c'est de la discipline : la variation vient de la largeur et de la graisse, pas d'un
mélange de polices. Google Fonts, licence libre, chargée en local dans le build (l'overlay
doit démarrer même sans réseau).

| Rôle | Réglage | Pour quoi |
|---|---|---|
| Scores et chiffres | Archivo Expanded 700, `font-variant-numeric: tabular-nums` | La largeur étendue donne du poids au score sans le grossir. Les chiffres tabulaires empêchent le chrono de trembler à chaque seconde. |
| Noms d'équipes et de joueurs | Archivo Semi-Condensed 600, majuscules, interlettrage +0.04em | Condensé pour absorber « Borussia Mönchengladbach » sans réduire le corps. |
| Texte courant et régie | Archivo 400 / 500 | Neutre, lisible en petit. |
| Labels et unités | Archivo 500, 11px, majuscules, interlettrage +0.12em | « TIRS CADRÉS », « 2e MI-TEMPS ». |

Échelle typographique, en pixels, base 1920×1080 :
`11 · 13 · 15 · 18 · 24 · 32 · 44 · 64 · 88`

Rien entre deux valeurs. Le 88 est réservé au score du bandeau haut, le 64 aux chiffres
mis en avant dans une scène.

> **Extension.** Le 88 est nouveau. Le score n'est plus un détail dans un bandeau de
> 64 px de haut posé sur une image : c'est l'information principale d'un bandeau de 180 px
> qu'on lit de loin. Le 64 ne tenait plus le rôle.

**Lisibilité.** Aucun texte ne repose sur une surface qui ne nous appartient pas. Dans la
scène, quand la webcam est à l'antenne, aucun texte n'entre dans le cadre 1280×720 — le
seul endroit où nous ne maîtrisons pas ce qu'il y a derrière. Pas d'ombre portée pour
compenser : l'ombre est un aveu de mauvaise structure.

---

## Formes et espace

- **Rayon d'angle : 3px.** Presque droit. Les angles arrondis adoucissent, et ce produit
  n'a pas besoin d'être doux. Aucune exception, y compris pour les boutons.
- **Grille d'espacement : multiples de 4px.** `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- **Zones sûres OBS : 48px** sur chaque bord du canevas.
- **Ombres :** une seule, `0 8px 24px rgba(0,0,0,.45)`, réservée à ce qui se pose
  au-dessus de la scène. Le cadre n'en porte pas : il est le sol, il ne flotte sur rien.
- **Densité :** le cadre respire — il est permanent, un cadre chargé fatigue en deux
  heures. La scène est dense : c'est elle qu'on regarde, et elle ne dure qu'un moment.
  La régie est dense aussi (elle occupe un écran entier et doit tout montrer sans
  défilement).

---

## Signature : la lame

L'élément unique qui rend le produit reconnaissable.

Chaque module de scène porte, sur son bord d'attaque, **une lame ambre de 3px sur toute la
hauteur** — le côté par lequel il entre à l'écran. Un module qui arrive par la gauche a sa
lame à gauche. La lame indique d'où vient l'objet.

Et elle porte toute l'animation : **rien n'apparaît en fondu.** Un module se déploie depuis
sa lame, comme si la lame le dépliait. La lame se pose (120 ms), le corps se déplie
(220 ms, `cubic-bezier(.16,1,.3,1)`), le contenu se révèle en cascade de 40 ms. À la
sortie, le mouvement s'inverse et la lame disparaît en dernier.

Une seule lame par module. **Le cadre n'en porte pas** : il n'entre jamais, il est là.

**Le chrono live** est le second porteur d'identité : la lame de la scène pulse une fois
par minute de jeu, très légèrement (opacité 1 → 0.45 → 1 sur 900 ms). Discret à l'écran,
mais donne un pouls à l'habillage. Uniquement quand le match est effectivement en cours —
jamais à la mi-temps.

---

## Mouvement

| Type | Durée | Courbe |
|---|---|---|
| Entrée de module | 220 ms | `cubic-bezier(.16,1,.3,1)` |
| Sortie de module | 160 ms | `cubic-bezier(.4,0,1,1)` |
| Bascule d'équipe sur le terrain | 320 ms | `cubic-bezier(.16,1,.3,1)` |
| Changement de valeur (score, chrono) | 180 ms | `ease-out` |
| Retour d'interaction en régie | 80 ms | `ease-out` |

Règles :

- Animer **uniquement** `transform` et `opacity`. Jamais `width`, `height`, `top`, `left` —
  ça déclenche un recalcul de layout à chaque frame et ça coûte des fps au streamer.
- Un chiffre qui change (un score qui passe de 1 à 2) monte, il n'apparaît pas : l'ancien
  sort par le haut, le nouveau entre par le bas. C'est le geste des tableaux de stade.
  **Réservé aux valeurs rares et signifiantes** : un score, pas un chrono. Une horloge qui
  s'animerait chaque seconde serait bruyante et coûterait des frames pour rien.
- **La bascule.** Le terrain ne montre qu'une équipe à la fois. On passe à l'adversaire par
  un basculement du terrain sur son axe horizontal — les joueurs sortent avec lui, les
  nouveaux arrivent avec la face qui se présente. Pas de fondu, pas de glissement latéral :
  la bascule dit qu'on retourne le même objet, pas qu'on en amène un autre.
- **La scène ne se vide jamais entre deux occupants.** Le suivant commence son entrée
  pendant que le précédent finit sa sortie ; le fond de scène, lui, reste. Aucune image
  n'existe où le centre est noir.
- `prefers-reduced-motion` : les modules apparaissent sans déplacement, la lame ne pulse
  plus, la bascule devient un remplacement direct.
- Jamais deux modules qui entrent en même temps. On séquence, décalage de 80 ms.

---

## Écriture d'interface

- Langue : français. Vouvoiement proscrit, on est entre streamers — mais pas de familiarité
  forcée non plus.
- Les libellés nomment ce que fait le bouton, à l'infinitif ou à l'impératif :
  « Afficher le score », pas « Score ON ».
- Un bouton garde le même mot dans tout le parcours. « Diffuser » produit « Diffusé ».
- Les erreurs disent ce qui s'est passé et quoi faire : « Données indisponibles — passe en
  saisie manuelle ». Pas de « Une erreur est survenue », pas d'excuse.
- Un écran vide propose une action, il ne constate pas le vide.
- Abréviations sportives standard uniquement, en majuscules : MT, TAB, CSC, xG. Les
  ordinaux gardent leur forme écrite : « 2e MI-TEMPS », jamais « 2E ».

---

## Ce qu'on ne fait pas

- Pas de dégradés sur les fonds de modules.
- Pas de verre dépoli (`backdrop-filter`) — coûteux en encodage, et sans vidéo dessous il
  ne dépolirait que notre propre fond.
- Pas d'emoji dans l'overlay ni dans la régie. Icônes vectorielles uniquement, trait 1.5px,
  jeu unique sur tout le produit.
- Pas de police système par défaut visible à l'antenne, même en secours.
- Pas de deuxième couleur d'accent. S'il en faut une, c'est que la hiérarchie est ratée.
- **Pas de texte ni de module dans la scène quand la webcam l'occupe.** C'est la seule
  surface que nous ne maîtrisons pas.
- **Pas de cadre qui s'anime.** Il est le sol : un sol qui bouge donne le mal de mer au
  bout de deux heures.
