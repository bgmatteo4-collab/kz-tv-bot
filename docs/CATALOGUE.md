# Catalogue — matériel, mobilier et décor

Ce document définit **ce qu'on peut acheter** et surtout **pourquoi le décor
compte mécaniquement**. Il complète le [GDD](GDD.md) et sert de référence pour
remplir `src/shared/Config/`.

Tout ce qui est listé ici est de la donnée, pas du code : ajouter un objet ne
demande jamais d'écrire de la logique.

---

## 1. Le problème à résoudre

Dans les simulateurs de streaming existants, décorer sert à deux choses :
dépenser de l'argent et cocher une case. Le résultat est toujours le même
capharnaüx — tout le monde achète tout, et les studios finissent identiques et
laids.

On règle ça par une seule règle : **le décor est jugé par l'image**.

Ce que la caméra voit derrière le joueur passe à l'antenne. Un fond chargé et
incohérent fatigue le spectateur ; un fond travaillé et lisible donne l'air
professionnel. Le jeu mesure donc deux choses distinctes :

- **La lisibilité** — le fond est-il trop chargé, trop vide, mal éclairé ?
- **La cohérence** — les objets racontent-ils la même chose ?

### Le score de cohérence

Chaque objet porte un **style** et une **palette**. Cinq styles :

| Style | Ce qu'il évoque |
|---|---|
| `sobre` | Bois clair, blanc cassé, plantes. Rassurant, adulte. |
| `gamer` | Noir, RGB, néons, figurines. Énergique, jeune. |
| `retro` | Bois foncé, CRT, affiches jaunies, cassettes. Chaleureux, niche. |
| `cosy` | Textiles, lumière chaude, guirlandes, bibliothèque. Intime. |
| `pro` | Gris, acoustique visible, éclairage neutre. Crédible, froid. |

Mélanger deux styles proches est neutre. En empiler quatre fait chuter la note
d'identité visuelle. **On ne gagne donc pas en achetant tout**, mais en
choisissant une direction et en s'y tenant — exactement ce qu'on demande à un
vrai créateur.

Chaque segment d'audience réagit différemment aux styles : les jeunes préfèrent
`gamer`, les habitués de talk-show préfèrent `pro` ou `sobre`. Changer
radicalement de style désoriente la base existante.

---

## 2. Familles d'objets

### 2.1 Matériel technique

Caméras, micros, machines, écrans, cartes d'acquisition, casques, interfaces
audio. Déjà amorcé dans `Config/Devices.lua`.

Ils portent des specs (qualité, latence, bruit de fond), une consommation
électrique et un encombrement. Ils sont fonctionnels avant d'être décoratifs.

### 2.2 Mobilier

Bureaux (largeur = nombre d'écrans possibles, gestion de câbles intégrée),
fauteuils (confort = vitesse de montée de la fatigue), étagères, meubles bas,
tables d'invités, canapés pour la zone détente.

Le bureau est la pièce la plus structurante du jeu : il détermine combien
d'objets tiennent devant le joueur.

### 2.3 Éclairage fonctionnel

C'est le matériel qui agit sur la note d'image, par sa **position réelle** :

- **Key light** — la lumière principale, à 45° du visage. Softbox ou panneau LED
  à diffuseur. C'est elle qui fait la différence entre « filmé » et « surveillé ».
- **Fill light** — de l'autre côté, moins puissante, pour adoucir les ombres.
- **Éclairage de fond** — dédié au fond vert. Un fond vert mal éclairé incruste
  mal, quel que soit son prix.
- **Contre-jour / rim light** — derrière le joueur, détache la silhouette du fond.

Mal placées, ces lampes nuisent : une source derrière le joueur sans rien devant
donne une silhouette noire.

### 2.4 Éclairage décoratif et LED pilotables

Bandeaux LED, barres verticales, panneaux hexagonaux, néons personnalisés,
guirlandes, spots colorés.

Ils comptent double : ils habillent le fond **et** ils sont pilotables.

**Le hub LED** est un appareil à acheter. Une fois installé, il regroupe tous
les luminaires connectés de la pièce et permet de définir des **ambiances** :
un nom, une couleur ou un dégradé, une intensité, une animation (fixe, pulsation
lente, balayage).

Une ambiance peut alors être :

- assignée à une touche du Stream Deck ;
- liée à une scène du logiciel de stream (la scène « Pause » passe en bleu) ;
- déclenchée par un événement (rouge bref sur un gros don, vert sur un palier
  d'abonnés).

C'est la première mécanique qui relie le décor, l'OS et le direct dans une même
boucle.

### 2.5 Acoustique

Panneaux muraux, pièges à basses d'angle, tapis épais, rideaux lourds.

Ils agissent sur la qualité sonore, qui est le facteur de rétention le plus
sous-estimé : une mauvaise image se pardonne, un mauvais son fait fermer
l'onglet. Ils sont visibles à l'image et portent un style — les panneaux nus
tirent vers `pro`, un rideau épais vers `cosy`.

### 2.6 Décoration personnelle

Affiches, figurines, plantes, bibliothèque, cadres, tapis, plaid, néon au
pseudo, écran secondaire diffusant une animation.

Aucun effet technique, mais ils portent le style et remplissent le fond. C'est
là que le joueur exprime son identité — et c'est aussi là qu'il peut tout gâcher
en accumulant.

### 2.7 Alimentation

Multiprises (nombre de prises, puissance maximale), rallonges (longueur),
onduleur (protège d'une coupure en plein direct — un achat qui ne sert à rien
jusqu'au jour où il sauve un live).

---

## 3. Le Stream Deck

Un boîtier de touches programmables posé sur le bureau. Techniquement, c'est une
petite dalle : la même `SurfaceGui` que les moniteurs, à échelle réduite.

| Modèle | Touches | Rôle |
|---|---|---|
| Mini | 6 | Les gestes vitaux : couper le micro, scène principale, scène pause. |
| Standard | 15 | Ambiances lumineuses, jingles, clips, scènes multiples. |
| XL | 32 | Pilotage complet d'une émission à rubriques. |

Chaque touche se programme depuis une app de l'OS : on choisit une action, une
icône et une couleur. Les touches s'organisent en **pages**, et une touche peut
servir à changer de page — un profil « stream solo » et un profil « émission ».

**Sa vraie fonction est d'acheter de l'attention.** Sans lui, agir pendant un
live coûte une fenêtre ouverte, donc un écran occupé, donc une zone d'aveuglement.
Avec lui, une touche suffit — à condition de l'avoir configurée à l'avance, au
calme. C'est un investissement de préparation qui paie en direct.

---

## 4. Cohérence visuelle du catalogue

Contrainte de production, à respecter en remplissant le catalogue :

1. **Un objet appartient à un style et un seul.** Pas d'objet passe-partout.
2. **Chaque style doit couvrir toutes les familles.** Il faut pouvoir monter une
   pièce entièrement `cosy` ou entièrement `pro`, sinon le score de cohérence
   est injouable.
3. **Trois gammes de prix par famille.** L'entrée de gamme doit rester
   présentable : on ne punit pas la pauvreté du début de partie par de la
   laideur, on la punit par des performances.
4. **Les palettes sont définies dans le catalogue**, pas dans les modèles 3D.
   Un même meuble doit pouvoir exister en plusieurs coloris sans nouvel asset.

---

## 5. Sources de référence

Guides d'aménagement et d'éclairage consultés pour construire ces familles :

- [Décor de streamer : guide et comparatif d'aménagement](https://magamingroom.fr/decor-de-streamer-guide-et-comparatif-damenagement/)
- [Comment créer et éclairer un décor de streaming ?](https://stream-tech.fr/news-creer-eclairer-decor-streaming/)
- [Innovations en éclairage pour streamers — néon LED](https://lightgenius.fr/article/eclairage-pour-streamers-neon-led/)
- [24 Streaming Setup Ideas for Home Office Studios](https://www.diycraftsy.com/streaming-setup-ideas/)
