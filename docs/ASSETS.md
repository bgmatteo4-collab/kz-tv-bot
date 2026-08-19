# Remplacer les objets par de vrais modèles 3D

Le jeu construit ses objets à partir de primitives assemblées. C'est une
solution d'attente : lisible, cohérente, et suffisante pour jouer — mais ça
reste des blocs.

Dès qu'un vrai modèle est disponible, il prend automatiquement le relais.
**Aucune ligne de code à écrire.**

---

## La règle

Un modèle déposé dans `ReplicatedStorage.Assets.Items` et **nommé exactement
comme l'identifiant de l'objet** remplace la version en primitives.

```
ReplicatedStorage
└── Assets
    └── Items
        ├── desk_family        ← remplace le bureau de départ
        ├── chair_gaming       ← remplace le siège Hexar
        └── plant_large        ← remplace la grande plante
```

Les identifiants sont dans `src/shared/Config/Catalogue/`. Par exemple
`light_ring`, `mic_usb`, `led_hexagons`, `arcade_cabinet`.

## Ce que le jeu fait pour toi

- **Mise à l'échelle.** Le modèle est redimensionné pour occuper exactement
  l'encombrement déclaré au catalogue. Un canapé annoncé à 11 studs de large
  fera 11 studs, quelle que soit la taille du modèle importé.
- **Ancrage.** Toutes les parts sont ancrées et rendues non collisionnables.
- **Fantôme.** Le mode construction affiche ton modèle en translucide. Ce que
  le joueur voit avant de poser est ce qu'il obtient.

## Les deux règles à respecter

1. **Le modèle doit être un `Model`**, pas une `Part` ni un `Folder`.
2. **Pour un écran**, une part enfant doit s'appeler exactement `Screen`, et
   sa face avant doit être son `-Z` local. C'est sur elle que KZ OS est
   projeté. Sans elle, le moniteur sera décoratif.

## Où trouver des modèles

- La boîte à outils de Roblox Studio, en filtrant sur les modèles gratuits.
- Un modeleur externe, exporté en `.obj` ou `.fbx` puis importé via
  **Avatar → Importateur 3D** dans Studio.
- Les tiens.

Vérifie l'orientation après import : un objet doit regarder vers son `-Z`
local pour se poser correctement face au joueur.

## Conseil de méthode

Remplace **par style**, pas au hasard. Faire d'abord tous les objets `cosy`
donne au joueur une direction complète et cohérente ; en faire dix au hasard
dans cinq styles donne une pièce bancale où le neuf jure avec l'ancien.

L'ordre le plus rentable, par ordre d'apparition à l'écran :

1. Le bureau, la chaise, le moniteur — visibles en permanence.
2. Les luminaires — ils portent l'ambiance.
3. La décoration murale et les plantes — elles remplissent le fond.
4. Le reste.
