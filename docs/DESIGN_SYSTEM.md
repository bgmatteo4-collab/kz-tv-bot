# TOUCHLINE — direction artistique

Ce document fait autorité. Toute couleur, toute taille de texte, tout rayon d'angle du
projet vient d'ici. Si un besoin n'est pas couvert, on étend ce document — on n'improvise
pas dans un fichier CSS.

---

## L'idée directrice

Un overlay de match n'est pas une interface. C'est un **objet posé sur une image en
mouvement**, dont il ne connaît ni les couleurs ni la luminosité. Une pelouse verte, un
maillot rouge, un flash de stade, un ralenti sombre : tout passe dessous en quelques
secondes.

D'où la contrainte fondatrice, qui produit toute l'esthétique : **chaque élément doit être
lisible sans jamais dépendre de ce qu'il y a derrière.** Pas de texte posé directement sur
la vidéo, pas de transparence décorative, pas de dégradé subtil qui disparaît sur fond clair.
Les modules sont des blocs opaques, francs, aux arêtes nettes. Ils s'assument comme des
objets, pas comme des filtres.

Registre visé : le sérieux d'une application de données sportives (SofaScore, FotMob),
pas l'énergie d'un overlay gaming. Sobre, dense, rapide.

---

## Couleur

Palette volontairement courte. Six valeurs, pas une de plus.

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Fond des modules | `--surface` | `#0E1620` | Bleu-nuit profond, jamais du noir pur. Opacité 0.94 minimum. |
| Fond surélevé | `--surface-raised` | `#18242F` | Lignes alternées, en-têtes de panneau, champs de saisie. |
| Bordure | `--line` | `#2B3A48` | 1px. Sépare, ne décore pas. |
| Texte principal | `--ink` | `#F2F6F9` | Blanc légèrement bleuté. |
| Texte secondaire | `--ink-muted` | `#8DA0B0` | Labels, unités, métadonnées. Jamais pour un chiffre important. |
| Accent | `--signal` | `#FFB020` | Ambre. Voir ci-dessous. |

Plus deux couleurs d'état, strictement fonctionnelles :

| | | |
|---|---|---|
| `--live` | `#FF4438` | Uniquement le point « en direct » et le carton rouge. |
| `--good` | `#3DD68C` | Uniquement une confirmation en régie. Jamais dans l'overlay. |

**Pourquoi l'ambre.** L'accent doit rester visible sur tout ce que peut afficher un match :
pelouse verte, ciel, maillots. Un accent vert se noie dans le terrain. Un rouge entre en
conflit avec les maillots et avec le signal « live ». Un bleu vif disparaît sur les plans
larges de stade. L'ambre saturé n'entre en collision avec presque rien de ce que produit un
match de football, et il porte une association de balisage et de signalisation qui va bien
au sport.

**Règle d'usage de l'accent.** L'ambre ne colorie pas du texte. Il ne sert qu'à **la lame**
(voir Signature) et aux états actifs de la régie. Un module qui contient trois éléments
ambre est un module raté.

Les couleurs d'équipe fournies par les données peuvent apparaître, mais uniquement sur des
surfaces dédiées et bornées (pastille d'équipe, barre de possession). Elles ne débordent
jamais sur le châssis.

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
`11 · 13 · 15 · 18 · 24 · 32 · 44 · 64`

Rien entre deux valeurs. Le 64 est réservé au score principal.

**Lisibilité sur vidéo.** Aucun texte ne repose directement sur l'image. S'il n'y a pas de
bloc opaque derrière, il n'y a pas de texte. Pas d'ombre portée pour compenser — l'ombre
est un aveu de mauvaise structure.

---

## Formes et espace

- **Rayon d'angle : 3px.** Presque droit. Les angles arrondis adoucissent, et ce produit
  n'a pas besoin d'être doux. Aucune exception, y compris pour les boutons.
- **Grille d'espacement : multiples de 4px.** `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- **Zones sûres OBS : 48px** sur chaque bord du canevas 1920×1080. Rien de vital en dehors —
  les plateformes recadrent.
- **Ombres :** une seule, `0 8px 24px rgba(0,0,0,.45)`, appliquée aux modules qui flottent
  au-dessus de la vidéo. Elle sépare de l'image, elle ne décore pas.
- **Densité :** l'overlay respire (il partage l'écran avec le match), la régie est dense
  (elle occupe un écran entier et doit tout montrer sans défilement).

---

## Signature : la lame

L'élément unique qui rend le produit reconnaissable.

Chaque module porte, sur son bord d'attaque, **une lame ambre de 3px sur toute la hauteur** —
le côté par lequel il entre à l'écran. Un module qui arrive par la gauche a sa lame à
gauche. La lame indique d'où vient l'objet.

Et elle porte toute l'animation : **rien n'apparaît en fondu.** Un module se déploie depuis
sa lame, comme si la lame le dépliait. La lame se pose (120 ms), le corps se déplie
(220 ms, `cubic-bezier(.16,1,.3,1)`), le contenu se révèle en cascade de 40 ms. À la
sortie, le mouvement s'inverse et la lame disparaît en dernier.

Une seule lame par module. C'est le seul endroit où le produit se permet d'être décoratif,
et c'est pour ça qu'il faut être avare partout ailleurs.

**Le chrono live** est le second porteur d'identité : la lame du bandeau score pulse une
fois par minute de jeu, très légèrement (opacité 1 → 0.45 → 1 sur 900 ms). Discret à
l'écran, mais donne au bandeau un pouls. Uniquement quand le match est effectivement en
cours — jamais à la mi-temps.

---

## Mouvement

| Type | Durée | Courbe |
|---|---|---|
| Entrée de module | 220 ms | `cubic-bezier(.16,1,.3,1)` |
| Sortie de module | 160 ms | `cubic-bezier(.4,0,1,1)` |
| Changement de valeur (score, chrono) | 180 ms | `ease-out` |
| Retour d'interaction en régie | 80 ms | `ease-out` |

Règles :
- Animer **uniquement** `transform` et `opacity`. Jamais `width`, `height`, `top`, `left` —
  ça déclenche un recalcul de layout à chaque frame et ça coûte des fps au streamer.
- Un chiffre qui change (un score qui passe de 1 à 2) monte, il n'apparaît pas : l'ancien
  sort par le haut, le nouveau entre par le bas. C'est le geste des tableaux de stade.
- `prefers-reduced-motion` : les modules apparaissent sans déplacement, la lame ne pulse plus.
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
- Abréviations sportives standard uniquement, en majuscules : MT, TAB, CSC, xG.

---

## Ce qu'on ne fait pas

- Pas de dégradés sur les fonds de modules.
- Pas de verre dépoli (`backdrop-filter`) — coûteux en encodage et illisible sur image claire.
- Pas d'emoji dans l'overlay ni dans la régie. Icônes vectorielles uniquement, trait 1.5px,
  jeu unique sur tout le produit.
- Pas de police système par défaut visible à l'antenne, même en secours.
- Pas de deuxième couleur d'accent. S'il en faut une, c'est que la hiérarchie est ratée.
