# TOUCHLINE

Outil d'habillage graphique (overlay) pour la diffusion live de matchs de football sur
Twitch et YouTube. Deux surfaces :

- **L'overlay** — ce que voit le public. Browser Source dans OBS, 1920×1080. **Aucune
  vidéo de match ne passe dessous : l'overlay est l'image.** Un cadre permanent occupe
  tout l'écran, et une scène 16:9 centrale accueille tour à tour la webcam, le terrain
  et les statistiques.
- **La régie** — ce que pilote le streamer. Choisir le match, déclencher les scènes,
  corriger les données, lancer les animations.

## Qui l'utilise

Matteo, streamer football (pronostics, analyses). Il commente en direct, **seul**, souvent
en même temps qu'il regarde le match. Pas de technicien.

**Conséquence de conception :** la régie se pilote d'une main, sans lire, sans réfléchir.
Une action = un clic. Si un contrôle demande deux clics et une confirmation pour afficher
un score, il est mal conçu.

## La règle qui gouverne tout

**Le serveur détient l'état. Les clients l'affichent.**

Une première version a échoué : deux fichiers HTML autonomes synchronisés par
`localStorage`, `BroadcastChannel` et un broker MQTT embarqué. Aucune source de vérité,
trois canaux concurrents, aucun arbitre. Résultat : il fallait rafraîchir l'overlay à la
main pour voir un changement, en plein direct.

La régie envoie des **intentions**. L'overlay ne demande rien et ne calcule rien.

## Priorités, dans l'ordre

1. **Fiabilité en direct.** Rien ne doit jamais exiger un refresh. Une coupure se répare
   toute seule. L'overlay qui perd le serveur garde son affichage — jamais d'écran vide à
   l'antenne — et se resynchronise dès que possible.
2. **Qualité graphique.** `docs/DESIGN_SYSTEM.md` fait autorité. Pas d'improvisation.
3. **Utilisable sans toucher au code.** Installation, configuration, clé d'API, choix du
   match : tout passe par l'interface.
4. **Revendable.** Pas un objectif de v1, mais le cœur reste écrit pour que ce soit un
   ajout et pas une réécriture.

## Contraintes techniques dures

- L'overlay tourne dans le Chromium embarqué d'OBS. Pas d'extension, pas de permission
  spéciale. La transparence ne subsiste que dans la scène centrale, là où OBS compose
  la webcam.
- **Rien n'est jamais vide à l'antenne.** Sans vidéo dessous, un module qui disparaît
  sans successeur laisse un rectangle noir devant le public.
- 60 fps pendant l'encodage vidéo. Animer uniquement `transform` et `opacity`, jamais de
  layout thrashing.
- Latence perçue régie → overlay sous 100 ms. **C'est le critère de réussite du projet.**
- Le poste fait déjà tourner OBS, une vidéo, un navigateur et un chat. L'outil doit être
  léger.

## Documents

| Fichier | Contenu |
|---|---|
| `docs/ARCHITECTURE.md` | Le principe, les exigences de robustesse, les décisions verrouillées, la stack, les jalons |
| `docs/DESIGN_SYSTEM.md` | La direction artistique. Fait autorité sur toute valeur visuelle |
| `.claude/skills/broadcast-overlay/` | Les contraintes du direct, à charger dès qu'on touche overlay, régie, temps réel ou données |
| `.claude/skills/direction-artistique/` | L'application de la DA, à charger dès qu'on écrit du visuel |

## Décisions verrouillées

Prises au cadrage. Le détail et les compromis sont dans `docs/ARCHITECTURE.md`.

- **Local installé**, mono-utilisateur, un match à la fois. Pas d'auth, pas d'infra.
- **Outil perso d'abord.** La revente reste possible, pas prioritaire.
- **Big 5 européennes + coupes.** La saisie manuelle est un repli, pas le mode principal.
- **Régie sur un 2e écran**, souris. La DA s'applique telle quelle.
- **TypeScript de bout en bout.** Serveur Node + `ws`, overlay en TS natif, régie en Svelte,
  build Vite, persistance en JSON atomique.
- **Module cotes purement graphique**, saisie manuelle, aucun fournisseur de cotes.

## Données de match

- L'accès passe par `providers/`, interface unique, un provider par fichier. On doit pouvoir
  changer de fournisseur sans toucher au reste du code.
- Le provider **saisie manuelle** existe et fonctionne seul. C'est le repli quand l'API
  tombe en plein match, et le défaut pour les matchs non couverts.
- **Une correction manuelle verrouille le champ.** Le provider ne l'écrase pas. C'est
  l'erreur la plus coûteuse possible dans ce produit.
- Les endpoints internes ESPN et SofaScore atteints par scraping ne sont pas exploitables :
  conditions d'utilisation, rate-limiting, fragilité totale.
- **Jamais de clé d'API dans le code ni dans le dépôt.**

## Comment travailler sur ce projet

- **Consulter Matteo avant tout choix structurant** : stack, découpage, dépendance lourde,
  changement d'architecture. Proposer, expliquer le compromis, attendre l'accord.
- Ne pas réécrire un module qui marche pour le rendre « plus propre » sans le demander.
- **Écrire en français** : interface, messages d'erreur, commentaires, commits.
- Tester en conditions réelles, pas seulement en théorie : ouvrir la page, cliquer, vérifier
  que l'overlay bouge. Prendre une capture quand c'est possible. Vérifier dans OBS avec
  l'encodage actif, pas seulement dans un onglet.
- Répondre de façon concise. Matteo connaît son sujet, pas besoin de tout réexpliquer.
