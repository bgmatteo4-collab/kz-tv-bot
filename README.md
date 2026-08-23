# TOUCHLINE

Habillage graphique pour la diffusion live de matchs de football sur Twitch et
YouTube.

Un **overlay** affiché en Browser Source dans OBS, une **régie** pour le
piloter, et un serveur local qui détient l'état du match et le pousse aux deux.

## En un principe

**Le serveur détient l'état. Les clients l'affichent.** La régie envoie des
intentions, l'overlay reçoit et rend. Rien n'exige jamais un rafraîchissement
manuel — c'est ce qui avait tué la version précédente.

## Lancer

```sh
npm install
npm run demarrer
```

Puis dans OBS : **Source navigateur**, largeur 1920, hauteur 1080, URL

```
http://localhost:4000/overlay/
```

La régie s'ouvre dans un navigateur, sur le deuxième écran :

```
http://localhost:4000/regie/
```

Pour développer avec rechargement à chaud, `npm run dev` remplace
`npm run demarrer` (les clients passent alors par le port 5173).

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
