# TOUCHLINE

Habillage graphique pour la diffusion live de matchs de football sur Twitch et YouTube.

Un **overlay** affiché en Browser Source dans OBS, une **régie** pour le piloter, et un
serveur local qui détient l'état du match et le pousse aux deux.

## En un principe

**Le serveur détient l'état. Les clients l'affichent.** La régie envoie des intentions,
l'overlay reçoit et rend. Rien n'exige jamais un rafraîchissement manuel — c'est ce qui
avait tué la version précédente.

## État du projet

Jalon 0 : socle documentaire. Aucun code applicatif pour l'instant.

| Jalon | Contenu |
|---|---|
| 0 | Socle documentaire |
| 1 | Le squelette qui tient — serveur, état, WebSocket, reconnexion, persistance, bandeau score, saisie manuelle |
| 2 | Données automatiques et décalage direct |
| 3 | Statistiques, compositions, moteur de scènes |
| 4 | Ouverture, clôture |
| 5 | Ticker, cotes |

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — principe, robustesse, décisions
  verrouillées, stack, jalons
- **[docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)** — direction artistique, fait autorité
- **[CLAUDE.md](CLAUDE.md)** — contexte et règles de travail
