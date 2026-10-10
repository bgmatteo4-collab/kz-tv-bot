# 05 · Systèmes urbains

> Exigence du propriétaire : **tout doit être fonctionnel et surtout relié**, pour faire tourner une vraie économie.

## 1. Principes

1. **Chaque réseau existe deux fois** :
   - **physiquement**, dans le plan directeur et la géométrie (postes électriques, transformateurs, armoires de rue, châteaux d'eau, bouches d'incendie, regards, antennes relais, câbles et canalisations dans les galeries) : visibles et interactifs ;
   - **logiquement**, sous forme de graphe simulé côté serveur : chaque bâtiment, lampadaire, feu, station ou terminal de paiement sait à quel nœud il est relié.
2. **Tout est relié** : les systèmes dépendent les uns des autres, et ces dépendances sont la source du gameplay.
3. **État par serveur** : chaque serveur démarre avec une ville en état propre. Seuls l'argent, l'inventaire et la progression des joueurs sont sauvegardés.
4. **Logique pure, testable** : la simulation est écrite en modules Luau sans dépendance à Roblox (`src/shared/Systems`), testés sous Lune. Le serveur ne fait que l'exécuter et appliquer ses effets au monde.
5. **Tout se passe côté serveur** : aucune transaction ni changement d'état décidé par le client (anti-triche).

## 2. Graphe des dépendances

| Système | Dépend de | Ce qui en dépend |
|---|---|---|
| **Électricité** | — (poste source) | Tout le reste |
| **Eau** | Électricité (pompes ; le château d'eau donne quelques heures d'autonomie) | Logements, commerces, pompiers |
| **Assainissement** | Électricité (station d'épuration) | Hygiène des bâtiments |
| **Télécoms** | Électricité (batteries de secours limitées dans les antennes) | Smartphone, paiement par carte, informatique, distributeurs |
| **Informatique** | Électricité + télécoms | Caisses, banque, gestion des stocks, police, hôpital, régulation des transports |
| **Transports** | Électricité (sous-stations de traction, signalisation, feux) + informatique (régulation) | Déplacements, livraisons, emplois |
| **Logistique** | Transports, routes, informatique (commandes) | Stocks des commerces |
| **Commerces** | Électricité, eau, télécoms (paiement), logistique (stocks), personnel | Économie des joueurs |
| **Services municipaux** | Budget de la mairie (taxes, factures) | Propreté, réparations, éclairage public |

Exemple de cascade : une surcharge fait sauter le transformateur du quartier de l'Opéra → les fenêtres et lampadaires s'éteignent, les feux tombent en panne, le métro s'arrête entre deux stations, l'antenne relais passe sur batterie puis s'éteint, les caisses n'acceptent plus que les espèces, le café ferme. Un technicien réseau doit intervenir.

## 3. Électricité

- **Topologie** : poste source (zone portuaire) → lignes souterraines → **postes de transformation** (1 à 2 par quartier) → **départs** par rue → points de livraison : bâtiments (compteur), éclairage public (par circuit), feux, armoires télécom, **sous-stations de traction** du métro et du tram.
- **Charge** : profils de consommation par type de bâtiment et selon l'heure (pic le soir). Dépassement de capacité → disjonction.
- **Pannes** : surcharge ; accident (voiture contre une armoire ou un poteau, détecté par collision) ; usure aléatoire rare ; événements scénarisés. Pas de sabotage libre par les joueurs (anti-nuisance), sauf scénario encadré.
- **Effets visibles** : intérieurs éteints, **fenêtres des façades éteintes la nuit** (l'émission des vitres est pilotée par le réseau), lampadaires, enseignes, ascenseurs bloqués, portes automatiques.
- **Secours** : l'hôpital a un groupe électrogène ; le commissariat aussi.
- **Réparation** : un technicien localise la panne (application de supervision), se rend sur place, diagnostique et intervient (gameplay court et lisible), puis remet en service.

## 4. Eau et assainissement

- **Eau potable** : captage/pompage → **château d'eau** (pression, réserve) → conduites sous les rues → bâtiments et **bouches d'incendie**.
- **Effets** : fuite → chaussée inondée, pression réduite dans le quartier ; château d'eau vide (pompes privées d'électricité trop longtemps) → plus d'eau, bouches d'incendie inutilisables.
- **Pompiers** : branchement réel sur les bouches d'incendie ; pression insuffisante = intervention plus difficile.
- **Assainissement** : égouts (galeries **visitables**) → station d'épuration (zone portuaire).

## 5. Télécoms

- **Infrastructure** : antennes relais (sur des toits), central/datacenter, fibre dans les galeries techniques, relais dans le métro.
- **Couverture** calculée par zone (cellules) ; zones blanches réalistes (sous-sols profonds sans relais).
- **Smartphone en jeu** (interface client) : appels et messages (texte), plan de la ville et GPS, horaires des transports, banque, offres d'emploi et missions, **appel d'urgence 112**, appareil photo. Sans réseau : fonctions dégradées.

## 6. Informatique

- **Ordinateurs utilisables** dans les bureaux, commerces et services : interface à applications.
- Applications métiers : **caisse enregistreuse**, **gestion des stocks et commandes**, guichet bancaire, fichier de police, dossiers médicaux, **dispatch logistique**, **régulation des transports**, **supervision des réseaux** (techniciens), messagerie interne.
- Dépend de l'électricité et des télécoms (accès au « réseau » de la ville).
- **Piratage** (roleplay) : envisageable plus tard comme mécanique de jeu encadrée, à concevoir séparément.

## 7. Réseau de transport

- **Rames** (métro, tram, train) circulant sur un graphe de voies avec **signalisation par cantons** et **horaires**.
- **Conduite automatique** par défaut ; un joueur peut prendre les commandes (métier de conducteur).
- **Alimentation** par les sous-stations de traction : coupure → rames arrêtées entre deux stations (évacuation en roleplay).
- **Feux de circulation** alimentés et pilotés.
- **Billettique** : titres de transport payants, validation (lien avec l'économie).
- Avions ambiants : rotations scénarisées liées à l'activité du terminal.

## 8. Économie simulée

### Monnaie et comptes
- Une monnaie fictive. **Espèces** (portefeuille) + **compte bancaire**.
- **Distributeurs** et **paiement par carte** : nécessitent électricité + télécoms. En panne → espèces uniquement.

### Sources et puits (contrôle de l'inflation)
- **Sources** (création d'argent) : salaires versés par la ville (services publics) et par les entreprises du jeu (emplois privés), primes de mission.
- **Puits** (destruction d'argent) : achats, factures, titres de transport, amendes, réparations, frais divers.
- **Prix fixés par le jeu** (pas de prix libres), salaires calibrés au temps de jeu, plafonds et journal de toutes les transactions.

### Entreprises
- Chaque commerce ou service est une **entité** : stock, besoins (électricité, eau, réseau, livraisons, personnel), horaires, état ouvert/fermé.
- Il ferme si ses conditions ne sont plus remplies (panne, rupture de stock…).

### Chaîne logistique
1. Les marchandises arrivent au **port** (bateaux ambiants) et sont stockées dans les **entrepôts**.
2. Quand le stock d'un magasin passe sous un seuil, il **commande** automatiquement (application de gestion).
3. La commande crée une **mission de livraison**. Un joueur livreur la prend ; à défaut, une livraison automatique lente évite que la ville se bloque.
4. Le magasin est réapprovisionné. Catégories de biens : alimentaire, boissons, produits du quotidien, électronique, etc.

### Budget municipal
- Recettes : taxes et factures des entreprises du jeu.
- Dépenses : salaires des services publics, réparations, éclairage public.
- Idée à approfondir : **maire élu** par les joueurs d'un serveur, qui arbitre certaines dépenses.

### Déchets
- Les poubelles se remplissent selon l'activité (commerces, logements) → collecte par les **éboueurs** → centre de tri. Rues visiblement sales si la collecte n'est pas faite.

### Sauvegarde (par joueur)
- Espèces, compte bancaire, inventaire, progression dans les métiers. Écritures côté serveur uniquement, avec journal.

## 9. Métiers liés aux systèmes

| Métier | Missions générées par la simulation |
|---|---|
| **Technicien réseau** | Pannes électriques, fuites d'eau, antennes hors service |
| **Livreur / logisticien** | Commandes des magasins, gestion d'entrepôt |
| **Services municipaux** | Collecte des déchets, voirie, éclairage public, accueil en mairie |
| **Conducteur** | Métro, tram, train (sinon conduite automatique) |

S'ajoutent les métiers des lieux conçus à la main (police, pompiers, médecins, commerçants, banquier…), qui interagissent avec ces systèmes : appel au 112 → répartition ; pompiers → bouches d'incendie ; police → feux en panne, circulation.

## 10. Mise en œuvre

- **Pas de temps de simulation** côté serveur (par exemple toutes les quelques secondes), indépendant de l'image.
- **Bus d'événements** entre systèmes (panne, rétablissement, commande, livraison…).
- **Tableau de bord de débogage** (administrateurs) : état des réseaux, flux économiques, missions en cours.
- **Agents dédiés** : « Réseaux techniques » et « Économie et logistique », plus « Interfaces » pour le smartphone et les ordinateurs.
- Les branchements de chaque bâtiment (circuit électrique, conduite d'eau, cellule télécom) sont **générés dans la spécification de bâtiment** et vérifiés par les validateurs.
