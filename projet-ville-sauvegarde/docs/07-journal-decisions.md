# 07 · Journal des décisions

Toute décision nouvelle est ajoutée ici, datée, avec sa justification. Ne pas remettre en cause une décision sans élément nouveau.

## 2026-10-10 · Session de conception initiale

| # | Sujet | Décision | Justification |
|---|---|---|---|
| D1 | Nature du projet | Une **ville unique** de grande qualité, pas un générateur générique | Souhait du propriétaire ; la génération est un moyen |
| D2 | Outil de travail | Claude Code en local sur Mac + **MCP intégré à Studio** | Exécution de code, captures, parties de test par l'IA |
| D3 | Style | Ville **européenne fictive**, **2026** | Souhait du propriétaire |
| D4 | Voitures | **Conduisibles**, sans trafic automatique | Choix du propriétaire ; allège la simulation |
| D5 | Métro, tram, trains | **Utilisables** par les joueurs | Choix du propriétaire ; prototype prioritaire (passagers en mouvement) |
| D6 | Avions | **Ambiants**, terminal explorable | Compromis spectaculaire / coût |
| D7 | Genre | **Roleplay urbain** | Les intérieurs deviennent le cœur du jeu |
| D8 | Plateformes | **PC + mobile** | Mémoire mobile = contrainte n° 1 |
| D9 | Joueurs | **20 à 40** par serveur | Standard roleplay |
| D10 | Interactions | **Très interactif** | Système central piloté par les données, meubles en pièces mobiles |
| D11 | Logement | **Pas de propriété** | Simplicité ; tout est public |
| D12 | Intérieurs | **Tout ouvert, détail gradué** | Équilibre qualité / performance |
| D13 | Taille | **Grande ville**, construite **progressivement** | Plan directeur complet, livraison par quartier |
| D14 | Direction artistique | **Réaliste** | Objectif : ne pas ressembler à un vieux jeu Roblox |
| D15 | Assets 3D | **Code** (architecture, mobilier géométrique) + **CC0** + **IA** + **Creator Store filtré** | Analyse par catégorie (voir 02-recherches) |
| D16 | Ambiance | **Cycle jour/nuit**, sans météo | Choix du propriétaire |
| D17 | Moyens | Propriétaire non codeur, sans Blender, sur Mac, **zéro budget** | Pipeline entièrement automatisé et gratuit |
| D18 | Agents | **Plusieurs agents pour le développement** (pas pour la recherche) | Demande du propriétaire |
| D19 | Échelle | **1 stud ≈ 0,33 m** ; intérieurs **et** façades ×1,25 | Avatar ≈ 5,3 studs ≈ 1,75 m ; jouabilité en troisième personne. À recalibrer en phase 0 |
| D20 | Dépôt | Nouveau dépôt **projet-ville** | Séparé de KZ Stream Simulator |
| D21 | Premier morceau | **Boulevards haussmanniens** : place de l'Opéra | Teste toute la chaîne |
| D22 | Nom de la ville | **Plus tard** ; nom de code « Projet Ville » | — |
| D23 | Lieux métiers | Urgences, commerces et restauration, institutions, loisirs | ~20 bâtiments conçus à la main |
| D24 | Espaces annexes | Toits, caves et parkings, cours intérieures, coulisses techniques | Sous-sol planifié en volume |
| D25 | Géographie | **Fleuve en vallée**, boucle autour de la Vieille Ville | Logique historique et ponts spectaculaires |
| D26 | Relief | **Faible** (promontoire léger, quais bas/hauts, collines lointaines) | Simplifie conduite, rails, fondations |
| D27 | Quartiers | 9 quartiers + aéroport, plan directeur v1 **validé** | Voir 03-plan-directeur |
| D28 | Place de l'Opéra | **Place rectangulaire** ; le bâtiment est un **Grand Théâtre-Cinéma** | Choix du propriétaire |
| D29 | Autonomie | **Validation par jalon** | Choix du propriétaire |
| D30 | Test mobile | **Téléphone récent** uniquement → budgets volontairement stricts | Pas d'appareil modeste disponible |
| D31 | Prototypes | **Phase de prototypes de risque** avant la place | Lever les incertitudes avant d'investir |
| D32 | Systèmes urbains | Électricité, eau, assainissement, télécoms, informatique, transports, **tous fonctionnels et reliés** | Exigence du propriétaire : une vraie économie |
| D33 | Économie | **Simulée** (salaires, prix fixes, stocks, logistique, factures, taxes) | Vivante sans dérive inflationniste |
| D34 | Persistance | **État de la ville par serveur** ; argent, inventaire et progression des joueurs sauvegardés | Simple et robuste |
| D35 | Métiers systèmes | Technicien réseau, livreur/logisticien, services municipaux, conducteur | Choix du propriétaire |
| D36 | Intérieurs en jeu | Ordinaires **générés à la demande** côté serveur ; conçus à la main **précalculés et clonés** | Mémoire et cohérence |
| D37 | Mesh | **Fabriqués à l'avance** (Blender script) et importés ; pas d'EditableMesh pour les façades | Budgets et coûts d'EditableMesh |
