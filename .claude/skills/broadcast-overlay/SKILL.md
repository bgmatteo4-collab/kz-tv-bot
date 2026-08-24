---
name: broadcast-overlay
description: À utiliser dès qu'on touche à l'overlay, à la régie, au temps réel ou aux données de match du projet TOUCHLINE. Couvre les contraintes du direct (OBS, transparence, performances d'encodage, zones sûres), les règles de synchronisation serveur-clients, et les pièges spécifiques à la diffusion sportive en direct. Se déclenche pour : Browser Source, WebSocket, chrono de match, scènes, providers de données, reconnexion.
---

# Diffusion en direct — contraintes non négociables

Ce projet part en direct devant un public. Une erreur ne se corrige pas après coup : elle
se voit, en grand, pendant que le streamer parle.

## Avant d'écrire quoi que ce soit

Se demander : **que se passe-t-il si ça échoue à la 78e minute d'un match serré ?**
Si la réponse implique que le streamer doive faire quoi que ce soit à la main, la
conception est à revoir.

## Règles de synchronisation

- Un seul détenteur de l'état : le serveur. Aucun client ne calcule une valeur affichable.
- Aucune donnée d'affichage dans `localStorage`, `sessionStorage` ou `BroadcastChannel`.
  Ces mécanismes ont fait échouer la version précédente du projet.
- Toute mise à jour part du serveur vers les clients, jamais l'inverse. La régie envoie des
  intentions, pas des états.
- Chaque message porte un numéro de séquence. Un message plus ancien que le dernier reçu
  est ignoré, jamais appliqué.
- À la reconnexion, le serveur renvoie l'état complet. Le client se réaligne sans
  clignoter ni rejouer les animations d'entrée.

## Le chrono de match

C'est la partie la plus piégeuse d'un overlay sportif.

- Ne jamais compter les secondes côté client à partir d'une heure locale : les horloges
  dérivent, et l'overlay dans OBS peut être ralenti par l'encodage.
- La source de vérité est l'horloge fournie par le provider. Le client interpole entre deux
  mises à jour, et se recale à chaque réception.
- Gérer explicitement : mi-temps, temps additionnel, prolongations, tirs au but, match
  suspendu. Chacun a un affichage distinct — ce ne sont pas des cas limites, ils arrivent
  à chaque match.
- Chiffres en `tabular-nums`, sinon le chrono tremble à chaque seconde.
- **Le chrono affiché est en temps vidéo.** Matteo commente un flux retardé : le décalage
  configuré se soustrait au temps réel du match. Voir `docs/ARCHITECTURE.md`.

## Données de match

- Passer par la couche `providers/`. Ne jamais appeler une API de données directement
  depuis un module d'affichage.
- Une correction manuelle du streamer verrouille le champ. Le provider ne l'écrase pas.
  C'est l'erreur la plus coûteuse possible dans ce produit.
- Préserver les données au changement de match en s'appuyant sur l'identifiant de rencontre,
  jamais sur l'ordre d'arrivée ou l'index.
- Toute donnée affichée porte un âge. Au-delà d'un seuil, la régie le signale — l'overlay,
  lui, ne montre jamais un doute au public.
- Les données provider passent par le tampon de décalage avant d'entrer dans l'état. Les
  intentions de régie, elles, sont appliquées immédiatement.
- Pas de clé d'API dans le dépôt.

## Contraintes OBS

- **Aucune vidéo de match ne passe sous l'overlay : il est l'image.** Le cadre est une
  surface pleine, opaque, permanente. La seule zone réellement transparente est la scène
  centrale, quand la webcam l'occupe — voir `docs/DESIGN_SYSTEM.md`.
- Conséquence directe : **la scène n'est jamais vide**. Un module qui sort sans que le
  suivant entre laisse un rectangle noir en plein direct. Le suivant commence son entrée
  pendant que le précédent finit sa sortie.
- Canevas de référence 1920×1080. Mise à l'échelle par `transform: scale()` sur un conteneur
  racine, pas par des unités relatives dispersées dans tout le CSS.
- Zones sûres de 48px sur chaque bord.
- OBS recharge la page à sa guise (changement de scène, reconnexion). Le démarrage doit être
  instantané et l'état récupéré depuis le serveur, pas reconstruit.
- Les polices sont servies en local. Une police qui ne charge pas produit un saut visible
  à l'antenne.

## Performances

Le poste du streamer encode de la vidéo pendant que l'overlay tourne. Chaque frame perdue
est visible par le public.

- Animer exclusivement `transform` et `opacity`.
- Pas de `backdrop-filter`, pas d'ombre animée, pas de `filter` en continu.
- Pas de rendu à chaque frame pour un chrono : mettre à jour à la seconde.
- Retirer du DOM les modules masqués plutôt que les laisser en `opacity: 0`.
- Vérifier dans OBS avec l'encodage actif, pas seulement dans un onglet de navigateur.

## Vérifier avant de dire que c'est fini

- L'overlay reflète une action de régie en moins de 100 ms, sans rechargement.
- Couper le serveur : l'overlay garde son affichage, la régie signale la perte.
- Redémarrer le serveur : les deux clients se réalignent seuls, sans intervention.
- Recharger l'overlay en plein match : il revient dans le bon état.
- Corriger un score à la main : le provider ne l'écrase pas au cycle suivant.
