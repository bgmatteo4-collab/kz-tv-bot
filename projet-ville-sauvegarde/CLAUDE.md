# CLAUDE.md — Projet Ville

Instructions permanentes pour toute session Claude (et tout agent) qui travaille sur ce dépôt.

## Lire avant toute action

1. `docs/01-vision.md` — ce que l'on construit et pourquoi.
2. `docs/04-architecture.md` — comment c'est construit.
3. `docs/07-journal-decisions.md` — les décisions déjà prises. **Ne pas les remettre en question sans raison nouvelle**, et consigner toute nouvelle décision dans ce journal.
4. Le document spécifique au module sur lequel tu travailles (`docs/05-systemes-urbains.md`, `docs/03-plan-directeur.md`…).

## Le propriétaire du projet

- Il parle **français** : toutes les réponses, rapports et messages de commit en français.
- Il **ne code pas** et n'utilise pas Blender. Expliquer simplement, ne jamais lui demander d'éditer du code ou de manipuler un outil technique sans le guider pas à pas.
- **Autonomie par jalon** : avancer en autonomie avec les agents, et soumettre chaque jalon important (fin d'un prototype, premier immeuble, place terminée) avec captures d'écran et, si possible, vidéo.
- Il préfère les **questions cliquables** (outil AskUserQuestion) aux questions ouvertes.
- Budget : **zéro Robux**. Aucune ressource payante.
- Machine : **Mac**, Roblox Studio + Claude Code en local, connectés via le serveur MCP intégré à Studio.

## Règles non négociables

- **Qualité visuelle réaliste** : rien ne doit ressembler à un « vieux jeu Roblox » (matériau Plastic, blocs à angles vifs, éclairage plat, couleurs saturées, textures uniformes, espaces vides). Voir `docs/02-recherches.md`, section rendu.
- **Performances mobiles** : chaque fonctionnalité respecte les budgets de `docs/04-architecture.md`. Mesurer, ne jamais supposer.
- **Déterminisme** : toute génération dépend uniquement de ses données d'entrée et d'une graine. Même graine → même résultat, toujours.
- **La ville est une donnée** : on modifie les données (plan, spécifications), jamais la géométrie générée à la main (sauf bâtiments « conçus à la main », eux aussi décrits en données).
- **Sécurité des assets** : aucun script provenant du Creator Store ou d'une source externe n'entre dans le projet. Seule la géométrie est conservée, après passage par le pipeline d'import.
- **Échelle** : 1 stud ≈ 0,33 m (avatar ≈ 1,75 m). Facteur ×1,25 appliqué aux intérieurs **et** aux façades. Valeurs à recalibrer en phase 0 et à consigner dans le journal.
- **Pas de script par objet** : interactions, lumières, portes… passent par des systèmes centraux pilotés par tags (CollectionService) et attributs.

## Organisation multi-agents

- **L'orchestrateur** (session principale) détient le schéma de données, intègre le travail des agents et est le seul à piloter Studio via MCP (sauf agent QA explicitement désigné).
- **Les agents spécialisés** travaillent chacun dans une copie isolée (git worktree) sur un module, contre les interfaces définies dans `src/shared/Core`. Ils livrent avec des **tests Lune** qui passent.
- Un module ne modifie jamais le schéma commun sans passer par l'orchestrateur.
- Liste des rôles d'agents : `docs/04-architecture.md`, section « Organisation des agents ».

## Outils

- **Rojo** : synchronisation fichiers ↔ Studio.
- **Lune** : exécution et tests Luau hors de Roblox (générateurs, simulation).
- **MCP Studio** : `execute_luau`, `screen_capture`, `start_stop_play`, `character_navigation`, `inspect_instance`, `get_console_output`…
- **Blender en mode script** (`blender --background --python …`) + Python : usine à mesh.
- **Open Cloud** : upload automatique des assets (clé API stockée hors du dépôt, jamais commitée).
