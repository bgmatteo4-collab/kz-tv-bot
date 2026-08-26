# Backlog

Tout ce qu'on voudrait ajouter ou modifier, **non affecté à une version**.

Rien d'inscrit ici n'est développé tant que le porteur du projet n'a pas dit
« on démarre la vX.Y ». À ce moment-là, les entrées retenues sortent d'ici,
entrent dans la version, et se retrouvent dans `PATCH-NOTES.md` une fois livrées.

| Colonne | Sens |
|---|---|
| **Priorité** | P0 le lieu · P1 le plateau · P2 l'émission · P3 la vie · P4 confort · P5 idée |
| **État** | `à décider` · `retenu` · `en cours` · `écarté` |

---

## Décisions en attente

| # | Sujet | Priorité | État |
|---|---|---|---|
| D1 | Nom définitif du projet | P0 | à décider |
| D2 | Validation du plan du local (CDC §5.2) | P0 | à décider |
| D3 | Nom et identité du média fictif | P1 | à décider |
| D4 | Vue première ou troisième personne | P0 | à décider |
| D5 | Transport des objets depuis la réserve | P1 | à décider |
| D6 | Durée d'une production en temps de jeu | P2 | à décider |
| D7 | Horloge continue ou journées découpées | P2 | à décider |

## Fonctionnalités souhaitées

| # | Sujet | Priorité | État |
|---|---|---|---|
| S1 | Éclairage pilotable par ambiances préenregistrées | P3 | retenu |
| S2 | Valeurs de plan et cadrage manuel à la caméra | P3 | retenu |
| S3 | Chaîne son : perches, micros cravate, retours | P3 | retenu |
| S4 | Loge et préparation des invités | P4 | retenu |
| S5 | Plusieurs identités d'émission enregistrables | P4 | retenu |
| S6 | Personnalisation de l'avatar | P4 | à décider |
| S7 | Cycle jour/nuit et lumière naturelle par les fenêtres | P4 | à décider |
| S8 | Mode photo | P5 | à décider |
| S9 | Rediffusion d'une émission produite | P5 | à décider |
| S10 | Multijoueur coopératif | P5 | écarté au lancement |

## Dette technique et éléments temporaires

*Vide. À remplir dès la première solution provisoire introduite — avec sa
raison d'être et ce qui devra la remplacer.*

## Problèmes connus

*Vide. Aucun code écrit.*

## À vérifier dans le moteur

Points dont la valeur a été posée par le calcul et qui doivent être confrontés
au rendu réel avant d'être figés.

| # | Sujet | Pourquoi |
|---|---|---|
| V1 | Hauteur exacte de l'avatar par défaut | Toute la table d'échelle en dépend (CDC §9.1) |
| V2 | Largeur de porte praticable | 6,3 studs est juste au réel, mais l'avatar Roblox est large |
| V3 | Plafond de bureau à 9 studs | Peut paraître écrasant en vue première personne |
| V4 | Budget de 12 lumières à ombre | Valeur posée par prudence, à mesurer réellement |
