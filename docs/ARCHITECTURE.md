# TOUCHLINE — architecture

## Principe unique

**Le serveur détient l'état. Les clients l'affichent.**

Tout le reste découle de là. Si une décision d'implémentation entre en conflit avec cette
phrase, c'est la décision qui est fausse.

```
   ┌──────────────┐        ┌─────────────────────┐        ┌──────────────┐
   │  RÉGIE       │◄──────►│   SERVEUR           │◄──────►│  OVERLAY     │
   │  (navigateur)│   WS   │   état du match     │   WS   │  (OBS)       │
   └──────────────┘        │   + moteur de scènes│        └──────────────┘
                           └──────────┬──────────┘
                                      │
                              ┌───────▼────────┐
                              │  PROVIDERS     │
                              │  api / manuel  │
                              └────────────────┘
```

- La régie n'envoie que des **intentions** (« affiche le bandeau score », « corrige le
  buteur »). Elle ne calcule rien d'affichable.
- L'overlay ne demande jamais rien. Il reçoit et rend. Il n'a aucune logique métier.
- Le serveur interroge les providers, met à jour l'état, et diffuse les changements aux
  deux clients simultanément.

## Ce que ça règle

Le problème de refresh de la version précédente disparaît structurellement : il n'y a plus
deux états à réconcilier, donc plus rien à resynchroniser à la main.

## Exigences de robustesse

Elles ne sont pas optionnelles — c'est du direct.

- **Reconnexion automatique** du WebSocket, avec backoff exponentiel plafonné à 5 s.
  Silencieuse. L'utilisateur ne doit rien avoir à faire.
- **L'overlay ne se vide jamais.** S'il perd le serveur, il garde à l'écran ce qu'il
  affichait. Un écran noir en plein direct est pire qu'une donnée périmée de 10 secondes.
- **Resynchronisation complète à la reconnexion** : le serveur renvoie l'état entier, pas
  un différentiel. L'overlay se remet en conformité sans clignoter.
- **Numéro de séquence** sur chaque message d'état. Un client qui reçoit un numéro plus
  ancien que le sien l'ignore.
- **Indicateur de connexion visible en régie**, et uniquement là : connecté, reconnexion,
  perdu. Avec l'âge de la dernière donnée reçue.
- **Persistance de l'état sur disque** côté serveur. Si le serveur redémarre en plein match,
  il repart où il en était.
- **La saisie manuelle prime toujours sur le provider.** Si le streamer corrige un score à
  la main, l'API ne doit pas l'écraser 30 secondes plus tard. Marquer les champs corrigés
  et les verrouiller jusqu'à levée explicite. C'est un piège classique, il coûtera un
  direct raté s'il est oublié.

## Décisions verrouillées

Prises avec Matteo au cadrage. Elles ne se rediscutent pas sans raison nouvelle.

| Sujet | Décision | Conséquence |
|---|---|---|
| Distribution | **Local installé**. L'app tourne sur le poste, l'overlay pointe vers `localhost`. | Aucune infra, aucun coût, aucune dépendance réseau. Latence régie → overlay négligeable. |
| Modèle | **Outil perso d'abord.** La revente à d'autres streamers reste un objectif possible, pas un objectif de v1. | Pas de comptes, pas d'auth, pas de facturation, pas de question de redistribution des données. |
| Locataires | **Mono-utilisateur, un match à la fois.** | L'état est un objet unique. Le cœur reste écrit de façon à ce qu'un passage au multi soit un ajout, pas une réécriture. |
| Compétitions | **Big 5 européennes + coupes européennes.** | Couverture excellente chez les fournisseurs. La saisie manuelle reste un vrai repli, pas le mode principal. |
| Pilotage | **Souris, sur un 2e écran dédié.** | La régie applique la DA telle quelle : dense, plein écran, sans défilement. |
| Module cotes | **Purement graphique, alimenté à la main.** Aucun fournisseur de cotes. | Aucun contrat, aucun sujet réglementaire. |
| Nom | **TOUCHLINE.** | Figé dans le dépôt, les paquets, les dossiers et l'exécutable. |

## Stack

TypeScript de bout en bout. Ce n'est pas un réflexe : `partage/contrats/` est la **source
unique** des types serveur ↔ clients. Un serveur dans un autre langage ferait payer cette
exigence en duplication manuelle des contrats — et un contrat désynchronisé, en direct,
c'est un module qui n'affiche rien sans que rien ne plante.

| Couche | Choix | Pourquoi |
|---|---|---|
| Serveur | Node LTS + TypeScript, `ws` | Écosystème sûr, types partagés avec les clients. Empreinte mémoire négligeable à côté d'OBS. |
| Persistance | Fichier JSON, écriture atomique | Un seul match à la fois. SQLite serait une dépendance pour rien tant qu'on ne garde pas d'historique. |
| Build | Vite | Sert le dev, produit le bundle, embarque Archivo en local. |
| Overlay | **TypeScript natif, sans framework** | Contrôle total de ce qui touche le DOM, aucun coût de réconciliation pendant l'encodage. Le `moteur/` orchestre déjà les entrées-sorties : un framework ferait doublon avec lui. |
| Régie | **Svelte** | UI dense et très pilotée par l'état. Compilé, pas de DOM virtuel. |

## Le décalage direct

Matteo commente sur un flux web retardé de **30 à 60 secondes** par rapport au match réel.
Sans correction, l'overlay annoncerait le but avant que le public le voie. Le décalage ne
s'applique pas au même endroit selon la nature de l'information :

- **Les données provider passent par un tampon retardé.** Un événement à 78:12 réelles
  n'entre dans l'état qu'une fois le retard écoulé.
- **Le chrono affiché est en temps vidéo, pas en temps réel.** Match à 78:00, retard de
  40 s → l'overlay affiche 77:20. C'est la seule valeur cohérente avec ce que voit le public.
- **Les actions de régie sont instantanées.** Le retard est un tampon sur l'entrée provider,
  jamais sur la diffusion vers les clients.

Le mécanisme arrive au jalon 2 avec le provider API. L'état est écrit dès le jalon 1 pour
qu'une couche de retard puisse s'intercaler entre le provider et lui.

## Découpage attendu

```
serveur/
  etat/            état du match, réducteurs, numérotation de séquence
  providers/       une interface, N implémentations (manuel, api-football, …)
  scenes/          moteur de scènes : quoi est visible, dans quel ordre
  temps-reel/      WebSocket, diffusion, resynchronisation
overlay/
  modules/         un composant visuel par module (bandeau, stats, compo, ticker)
  moteur/          orchestration des entrées/sorties, file d'attente d'animations
regie/
  panneaux/        un panneau par zone de contrôle
partage/
  contrats/        types partagés serveur ↔ clients (source unique)
  liaison/         la connexion temps réel, commune aux deux clients
  design/          tokens issus de DESIGN_SYSTEM.md, générés, jamais édités à la main
outils/            génération des tokens, lancement, banc d'essai en conditions réelles
```

`partage/liaison/` n'était pas prévu au départ. Il existe parce que la
reconnexion est précisément ce qui a fait échouer la version précédente :
deux implémentations séparées, c'est deux comportements qui divergent, et la
divergence se découvre en direct.

## Modules de l'overlay (portée initiale)

Reprise de ce qui existait, à reconstruire proprement :

1. **Bandeau score** — équipes, score, chrono, statut. Le module toujours affiché.
2. **Statistiques** — possession, tirs, tirs cadrés, corners, cartons.
3. **Compositions** — onze de départ, formation, remplacements.
4. **Ticker autres matchs** — rotation paginée des scores en cours.
5. **Scène d'ouverture** — avant match, avec compte à rebours vers le coup d'envoi.
6. **Scène de clôture** — score final, faits marquants.
7. **Cotes** — affichage seul, saisie manuelle, aucun fournisseur.

Chaque module est indépendant : affichable, masquable et testable seul.

## Jalons

| | Contenu | Ce que ça prouve |
|---|---|---|
| **0** | Le socle documentaire | Les skills ont de quoi se référer |
| **1** | Le squelette qui tient | Que la chaîne survit au direct |
| **2** | Les données automatiques + le décalage | Que l'API ne casse pas ce qui marchait |
| **3** | Statistiques, compositions, moteur de scènes | Que plusieurs modules cohabitent |
| **4** | Ouverture, clôture | Que le produit a une dramaturgie |
| **5** | Ticker, cotes | Confort |

Le packaging pour d'autres streamers n'est pas dans ce plan — l'outil est perso d'abord.
Le cœur reste écrit pour que ce soit un ajout et pas une réécriture.

### Critère de sortie du jalon 1

Vérifié dans OBS avec l'encodage actif, captures à l'appui. Tant que ces cinq points ne
passent pas, le jalon n'est pas fini, même si le bandeau est joli.

1. Une action de régie se voit sur l'overlay en moins de 100 ms, sans rechargement.
2. Serveur coupé → l'overlay garde son affichage, la régie signale la perte.
3. Serveur redémarré → les deux clients se réalignent seuls.
4. Overlay rechargé en plein match → il revient dans le bon état, sans rejouer les
   animations d'entrée.
5. Score corrigé à la main → il reste corrigé.

## Qualité

- Tests sur la logique d'état et de reconnexion en priorité — c'est là qu'est le risque.
- Un mode démonstration qui rejoue un match enregistré, pour tester l'overlay sans match
  en cours et pour faire des captures.
- Vérifier le rendu réel dans OBS, pas seulement dans un navigateur : le fond transparent
  et les performances s'y comportent différemment.
