# Kayzx Live

Tu pilotes ton stream depuis ton téléphone. Sondages, minuteur, messages,
mini-jeux, objectifs. Rien à payer, aucun compte à créer, rien qui sorte de ton PC.

## Comment on s'en sert

**Double-clique sur `KAYZX LIVE.bat`.**

C'est tout. La première fois, il installe ce qu'il faut et met un raccourci sur
ton Bureau. Ensuite, ce raccourci suffit.

Une page s'ouvre dans ton navigateur et te guide. Elle fait le travail à ta place :

- **Ta chaîne** : tu tapes son nom, le chat se connecte. Rien d'autre.
- **OBS** : tu cliques sur « Chercher OBS », tu coches tes scènes, et il crée
  les sources lui-même. Tu n'as aucune adresse à copier.
- **Ton téléphone** : tu scannes le QR code, le panel s'installe comme une appli.
- **Sondages Twitch** : facultatif, et la page explique les clics un par un.

Laisse la fenêtre noire et la page ouvertes pendant le live.

## Pour essayer sans être en live

Double-clique sur **`KAYZX LIVE (demo).bat`**. Un faux chat se met à parler,
des viewers votent à tes sondages et jouent à tes mini-jeux. De quoi tout régler
tranquillement, sans que personne voie.

## Ce que tu peux afficher

| Section du panel | À l'écran |
|---|---|
| Chat | Montrer, cacher, mettre en haut ou en bas, changer la taille |
| Message | Un texte dans une carte papier, avec quatre messages tout prêts |
| Sondage | Un vrai sondage Twitch, ou un vote où le chat tape 1, 2, 3… |
| Prédiction | Une prédiction Twitch, avec les points misés et le résultat |
| Objectif | Une barre qui avance toute seule avec les follows et les abonnements |
| Minuteur | Un compte à rebours, avec pause et + 1 min |
| Compteur | Morts, victoires, ce que tu veux |
| Mini-jeux | Devine le nombre, le plus rapide, le pendu, tirage au sort |
| Mettre en avant | Un message du chat en grand sur la cam, 12 s |
| Ambiance | Une jauge qui monte quand le chat s'emballe |

Les mini-jeux se jouent **dans le chat** : les viewers tapent un nombre, un mot
ou une lettre, et l'écran suit tout seul.

## Si ça ne marche pas

**La fenêtre se ferme tout de suite**
Relance-la : elle installe le moteur au premier lancement et demande parfois un
deuxième départ.

**« Je ne trouve pas OBS »**
OBS doit être **ouvert**. Puis dans OBS : menu **Outils** → **Paramètres du serveur
WebSocket** → coche **Activer le serveur WebSocket** → **OK**. Reviens sur la page
et clique sur Réessayer.

**Le téléphone n'affiche rien**
Il n'est pas sur le même Wi-Fi que le PC, ou Windows bloque. Cherche « Pare-feu
Windows », autorise Node.js sur les réseaux privés.

**OBS affiche une page blanche**
La fenêtre noire s'est fermée. Relance le raccourci, puis dans OBS clic droit sur
la source → Actualiser.

**Le chat reste vide**
Vérifie le nom de ta chaîne sur la page de réglages, tout en haut.

**Le panel dit « Clé incorrecte »**
Rescanne le QR code sur le PC : la clé a changé.

## Pour les curieux

Tout tient dans ce dossier. `serveur.js` est le programme, `public/` contient la
page de réglages, le panel et l'overlay. `config.json` garde tes réglages et n'est
jamais envoyé nulle part.

Le chat Twitch est lu en anonyme, sans autorisation. Seuls les sondages, les
prédictions et les follows en direct demandent un jeton, qui reste dans
`config.json`, sur ton PC.
