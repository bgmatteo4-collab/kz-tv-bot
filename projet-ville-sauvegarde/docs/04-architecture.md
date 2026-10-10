# 04 · Architecture technique

## 1. Principe fondateur : la ville est une donnée

Une **chaîne de transformation en couches**, déterministe (même graine → même résultat) :

```
Plan directeur (écrit à la main)
  └─ Terrain, fleuve, graphe routier, lignes de transport (avec profondeur), réseaux techniques
      └─ Îlots → Parcelles
          └─ Spécification de bâtiment (style, étages, noyau, logements, branchements réseaux)
              └─ Plans d'étage → Pièces (fonction sémantique)
                  └─ Aménagement (meubles, objets, interactions, points de consommation)
                      └─ Géométrie Roblox (façades, coque, intérieurs, mobilier)
```

- Les **bâtiments conçus à la main** entrent dans la même chaîne au niveau « spécification de bâtiment », avec des données écrites à la main. Validation, streaming, interactions et réseaux fonctionnent pareil pour eux.
- **Le plan d'étage dicte la façade** : les fenêtres découlent des pièces, jamais l'inverse.
- Chaque élément porte des **données sémantiques** (type de pièce, fonction du meuble, circuit électrique…) exploitées par le gameplay et les systèmes urbains.

## 2. Précalculé ou généré en jeu ?

| Élément | Où | Pourquoi |
|---|---|---|
| Terrain, routes, rails, façades, coques | **Précalculé dans Studio**, sauvegardé dans la place | Inspectable, retouchable, chargement rapide, streaming natif |
| Intérieurs ordinaires | **Générés en jeu**, côté serveur, à la demande, par le même code | Impossible de stocker des millions d'instances ; identiques à chaque visite |
| Intérieurs conçus à la main | **Précalculés et stockés**, clonés à la demande | Même cycle de chargement/déchargement |
| Mesh du kit | **Fabriqués sur le Mac** (usine à mesh), envoyés via Open Cloud | Biseaux, UV, niveaux de détail |

### Cycle de vie d'un intérieur

1. Un joueur approche d'une entrée → le serveur génère (ou clone) l'intérieur dans un **modèle séparé**.
2. Les **différences** par rapport à l'état généré (lumière allumée, objet déplacé, tiroir ouvert, stock consommé) sont stockées dans l'état du serveur.
3. Plus aucun joueur à proximité depuis un délai → l'intérieur est détruit, les objets déplacés reviennent à leur place (sauf état utile aux systèmes : stocks, pannes).

## 3. Outils

| Outil | Rôle |
|---|---|
| **Git** | Versionnement de tout le projet |
| **Rojo** | Synchronisation fichiers ↔ Studio |
| **Lune** | Exécution et tests Luau hors de Roblox : les agents testent les générateurs et les simulations sans Studio, en parallèle |
| **MCP Studio** | Intégration, rendu, captures, parties de test, agent QA |
| **Blender (mode script) + Python** | Usine à mesh : biseaux, UV, LOD, export ; produit un **manifeste** nom → identifiant d'asset |
| **Open Cloud** | Upload automatique des assets (clé API hors du dépôt) |
| **Plugin Studio interne** | « Précalculer un quartier », « Valider », visualiser plans d'étage et réseaux, rapport d'erreurs cliquable |

## 4. Organisation du code (provisoire)

```
src/shared/Core/         Schéma de données, aléatoire déterministe, géométrie, interfaces des modules
src/shared/Generators/   Routes, Parcelles, Bâtiments, Plans d'étage, Aménagement
src/shared/Builders/     Transforment les données en instances Roblox
src/shared/Systems/      Logique pure des simulations (réseaux, économie) — testable sous Lune
src/server/              Service d'intérieurs, interactions, transports, simulation des systèmes, sauvegarde
src/client/              Interactions, smartphone, ordinateurs, éclairage jour/nuit, aides au streaming
plugin/                  Outils Studio internes
tools/mesh-factory/      Usine à mesh (Python + Blender)
tools/assets/            Upload Open Cloud, pipeline d'import, assainissement
tools/validators/        Validateurs hors ligne
data/                    Plan directeur, styles de quartiers, bâtiments conçus à la main, manifeste d'assets
tests/                   Tests Lune
docs/                    Cette documentation
```

## 5. Budgets de performance (provisoires, à calibrer en phase 1)

| Budget | Cible initiale |
|---|---|
| Mémoire client, pic, sur téléphone récent | **≤ 800 Mo** (marge pour les appareils modestes qui plantent vers ~1 Go) |
| Matériaux distincts dans toute la ville | **40 à 60** |
| Résolution des textures | **1024 px** par défaut |
| Triangles par mesh | **≤ 10 000** (limite moteur ~20 000) |
| Instances par appartement meublé | à mesurer en phase 1 (estimation 300–800) |
| Intérieurs chargés simultanément par serveur | **≤ 40** (≈ un par joueur) |
| Lumières projetant des ombres visibles simultanément | à mesurer en phase 1 |

Tout dépassement doit être mesuré, justifié et consigné dans le journal des décisions.

## 6. Validation automatique

- **Accessibilité** : chaque pièce atteignable depuis la rue (graphe de navigation + PathfindingService).
- **Dégagements** : portes non bloquées, hauteur libre sous escaliers, passages ≥ largeur d'avatar.
- **Cohérence** : fenêtres ↔ pièces, noyaux alignés, pas de chevauchement ni de z-fighting.
- **Réseaux** : chaque bâtiment raccordé à l'électricité, à l'eau et aux télécoms ; aucun circuit orphelin.
- **Budgets** : comptage des instances, triangles et matériaux par zone.
- **Agent QA** : se déplace dans la ville via MCP, capture, signale.

## 7. Organisation des agents

L'orchestrateur fixe d'abord **le contrat** (schéma de données + interfaces) dans `src/shared/Core`, puis lance les agents. Trois à cinq agents travaillent en parallèle au maximum, chacun dans sa copie isolée (git worktree), avec des tests Lune.

| Agent | Responsabilité |
|---|---|
| **Orchestrateur** | Schéma, intégration, pilotage de Studio, revue |
| **Terrain et routes** | Terrain, fleuve, quais, graphe routier, profils de voies, ponts, nivellement |
| **Bâtiments** | Grammaire de façades, coques, noyaux de circulation, toitures |
| **Intérieurs** | Plans d'étage, pièces, circulation, typologies de logements, commerces, bureaux |
| **Mobilier** | Mobilier paramétrique, placement, désordre réaliste |
| **Usine à mesh et assets** | Blender/Python, Open Cloud, pipeline d'import, salle d'étalonnage |
| **Interactions** | Service d'intérieurs, système d'interactions, objets ramassables |
| **Transports** | Métro, tram, train, voitures, avions ambiants, horaires |
| **Réseaux techniques** | Électricité, eau, assainissement, télécoms, informatique, pannes |
| **Économie et logistique** | Monnaie, banque, salaires, prix, stocks, livraisons, taxes, sauvegarde |
| **Interfaces** | Smartphone en jeu, ordinateurs, HUD, menus |
| **QA** | Tests en jeu via MCP, captures, rapports, mesures de budgets |
