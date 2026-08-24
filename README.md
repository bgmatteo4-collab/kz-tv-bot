# TOUCHLINE

Habillage graphique pour la diffusion live de matchs de football sur Twitch et
YouTube.

Un **overlay** affiché en Browser Source dans OBS, une **régie** pour le
piloter, et un serveur local qui détient l'état du match et le pousse aux deux.

## En un principe

**Le serveur détient l'état. Les clients l'affichent.** La régie envoie des
intentions, l'overlay reçoit et rend. Rien n'exige jamais un rafraîchissement
manuel — c'est ce qui avait tué la version précédente.

## Installer

Il faut **Node.js 22 LTS** (ou 20.19 minimum) — [nodejs.org](https://nodejs.org).
Vérifie avec `node --version`.

```sh
git clone https://github.com/bgmatteo4-collab/kz-tv-bot.git touchline
cd touchline
git checkout claude/sports-broadcast-scoping-d9ay6t
npm install
```

## Lancer

```sh
npm run demarrer
```

La commande construit les deux clients puis démarre le serveur. Elle affiche :

```
[serveur] TOUCHLINE écoute sur http://localhost:4000
[serveur]   régie   → http://localhost:4000/regie/
[serveur]   overlay → http://localhost:4000/overlay/
```

**Laisse cette fenêtre ouverte pendant tout le direct.** La fermer arrête le
serveur : l'overlay garderait son dernier affichage, mais plus rien ne
bougerait.

Il n'y a pas d'adresse publique. Le serveur tourne sur ta machine et rien ne
sort sur Internet — c'est ce qui garantit la latence et l'absence de panne
réseau en plein match.

## Régler OBS

1. Dans ta scène, **ajoute une source → Navigateur**.
2. URL : `http://localhost:4000/overlay/`
3. Largeur **1920**, hauteur **1080**.
4. Coche **Rafraîchir le navigateur lorsque la scène devient active**.
5. Dans la liste des sources, **place ta webcam SOUS la source navigateur.**
   Le centre de l'overlay est un trou réellement transparent : c'est OBS qui y
   compose ta caméra. Si la webcam est au-dessus, elle masquera l'habillage.
6. Redimensionne ta webcam pour qu'elle remplisse le trou central : il fait
   1280×720 à partir du point (320, 180).

## Ouvrir la régie

Dans un navigateur, sur ton deuxième écran : **http://localhost:4000/regie/**

Elle occupe l'écran entier, sans défilement. Mets-la en plein écran (F11).

## Développer

`npm run dev` remplace `npm run demarrer` et ajoute le rechargement à chaud.
Les clients passent alors par le port 5173 : `http://localhost:5173/overlay/`
et `http://localhost:5173/regie/`.

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm run demarrer` | Construit les clients et lance le serveur. C'est la commande d'usage. |
| `npm run dev` | Serveur et clients en rechargement à chaud. |
| `npm test` | Tests d'état, de verrous, de reconnexion et de persistance. |
| `npm run verifier` | Typage TypeScript et Svelte. |
| `npm run verifier-direct` | Banc d'essai réel : lance le serveur, ouvre les deux pages dans Chromium, coupe le serveur, le relance, recharge l'overlay, et vérifie les cinq critères. Écrit ses captures dans `captures/`. |
| `npm run tokens` | Régénère `partage/design/` depuis le design system. |

## État du projet

**Jalon 1 terminé.** Le squelette tient : serveur autoritaire, WebSocket,
reconnexion silencieuse, persistance, bandeau score, saisie manuelle,
verrouillage des corrections, mode démonstration.

| Jalon | Contenu |
|---|---|
| 0 | Socle documentaire |
| **1** | **Le squelette qui tient** |
| 2 | Données automatiques et décalage direct |
| 3 | Statistiques, compositions, moteur de scènes |
| 4 | Ouverture, clôture |
| 5 | Ticker, cotes |

### Ce que le jalon 1 garantit, vérifié en conditions réelles

1. Une action de régie se voit sur l'overlay en moins de 100 ms, sans
   rechargement — mesuré à 3 ms au pire.
2. Serveur coupé : l'overlay garde son affichage, la régie signale la perte.
3. Serveur redémarré : les deux clients se réalignent seuls.
4. Overlay rechargé en plein match : il revient dans le bon état, sans rejouer
   ses animations d'entrée.
5. Un score corrigé à la main n'est pas écrasé par le provider.

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — principe, robustesse,
  décisions verrouillées, stack, jalons
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** — direction artistique,
  fait autorité
- **[CLAUDE.md](CLAUDE.md)** — contexte et règles de travail
