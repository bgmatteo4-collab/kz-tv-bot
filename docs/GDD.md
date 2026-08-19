# KZ Stream Simulator — document de conception

> Version de travail. Ce document est la référence du projet : toute décision
> de design tranchée y est écrite. Si le code et ce document divergent, l'un
> des deux est un bug.

---

## 1. En une phrase

Un simulateur de streaming où l'on ne clique pas sur un bouton pour gagner des
viewers : on monte physiquement son setup, on compose ses émissions, et on gère
une entreprise de contenu qui grandit — de la chambre chez ses parents jusqu'à
un plateau de télévision.

## 2. Ce qui le sépare des simulateurs existants

Les jeux de streaming sur Roblox partagent la même boucle : cliquer, voir un
nombre monter, acheter un objet qui fait monter le nombre plus vite, rebirth.
Le joueur ne prend jamais de décision.

Ici, trois renversements :

1. **La qualité ne s'achète pas, elle se dispose.** Un fond vert mal placé
   incruste mal. Une lampe derrière soi met en contre-jour. La note d'image est
   calculée à partir de la géométrie réelle de la pièce, pas d'une statistique
   d'objet.
2. **L'audience n'est pas un compteur.** C'est une population composée de
   segments, avec une humeur, une mémoire et de la rétention. On peut la trahir.
3. **L'interface est le jeu.** Aucun menu flottant : tout passe par des écrans
   qui existent dans le monde. La progression se manifeste par l'apparition de
   nouveaux logiciels sur l'ordinateur.

## 3. Décisions verrouillées

| Sujet | Décision |
|---|---|
| Ton | Réaliste-satirique. Drôle parce que juste, jamais caricatural. |
| Monétisation | **Aucun achat accélérant la progression.** Pas de gamepass de boost, pas de raccourci payant. L'argent en jeu est une contrainte de gestion, jamais un raccourci. |
| Paradigme de l'OS | Fenêtré, façon Windows : fenêtres déplaçables, redimensionnables, superposées, barre des tâches. |
| Friction de l'OS | Machine vivante : temps de démarrage réel, ralentissements, plantages possibles. La friction diminue quand on monte en gamme. |
| Interface | 100 % diégétique. Zéro HUD flottant. |
| Plateforme | PC d'abord. Le mobile reste possible plus tard, l'UI est paramétrée pour. |
| Multijoueur | Solo au lancement, mais **serveur autoritaire dès le départ**. Les collaborations à deux sont la première marche prévue. |

## 4. Les trois piliers de gestion

### 4.1 L'audience vivante

L'audience est composée de segments (casual, hardcore, jeune public, donateurs),
chacun avec ses attentes, sa fidélité et sa valeur économique. Changer
brutalement de contenu fait fuir une partie de la base. Streamer quatorze heures
par jour épuise l'avatar, et la fatigue dégrade la qualité, qui dégrade la
rétention.

### 4.2 L'économie de créateur

Abonnements, dons, publicité, sponsors, merch — chaque source a ses contraintes.
Un sponsor qui paie bien peut faire chuter la confiance de l'audience. Les
contrats se négocient par mail, sur plusieurs échanges, avec des délais de
paiement réels.

### 4.3 L'équipe et le temps

Monteur, modérateur, community manager, réalisateur. Chacun a un salaire, un
niveau, une charge de travail et un moral. La journée est découpée en créneaux :
streamer, monter, publier, dormir. On ne peut pas tout faire.

## 5. Le setup comme problème d'espace

### 5.1 Le fond vert

L'aperçu du stream est un `ViewportFrame` dont la caméra est placée à l'endroit
exact de la webcam physique. Ce que cette caméra voit est ce que voient les
viewers. Donc :

- fond vert bien placé et bien éclairé → incrustation propre ;
- fond vert trop petit ou décalé → les bords bavent, on voit le mur ;
- lampe derrière le joueur → silhouette en contre-jour.

Tout est dérivé par raycasts et produits scalaires depuis la position réelle des
objets. **On ne peut pas acheter un bon setup, il faut le monter.**

### 5.2 Le câblage

Chaque appareil expose et réclame des ports typés (USB, HDMI, XLR, jack,
alimentation). Les câbles ont une longueur : le micro doit être à portée de la
machine. La multiprise a une limite de puissance, et elle saute — en plein
direct.

Le classique « vingt minutes de live sans micro » est une situation atteignable,
et le jeu ne prévient pas. Le chat, si.

### 5.3 Le placement

Mode construction avec fantôme translucide, aimantation sur grille, rotation,
détection de collision. La disposition est sauvegardée. La vraie contrainte
devient la **place disponible** : le déménagement n'est pas cosmétique, c'est un
déblocage d'espace.

## 6. Le conducteur : composer son émission

Le joueur ne choisit pas un « type de stream » dans une liste. Il compose un
format :

- un nom, une identité, une récurrence ;
- une suite de **segments** ordonnés (intro, réaction, invité, débat, jeu avec
  le chat, appels du public, conclusion) ;
- chaque segment a une durée prévue, un coût de préparation et un profil de
  réaction par segment d'audience.

Pendant le direct, le conducteur défile en temps réel dans la régie. Déborder
sur un segment sacrifie le suivant. Improviser un segment non prévu est un
risque assumé.

Dans la chambre, le format tient en une ligne (« je joue à ce jeu deux heures »).
Au plateau, c'est douze segments et deux invités. **C'est le même système**, qui
gagne en profondeur au lieu d'être remplacé.

## 7. Les événements et les invités

Annoncer une émission construit une attente, qui est une **dette** : livrer en
dessous de l'annonce coûte plus cher que ne rien annoncer. Annuler coûte de la
confiance durablement.

Les invités se négocient par mail. Chacun apporte sa propre audience, avec sa
propre composition — et deux publics incompatibles se déclarent la guerre dans
le chat pendant le live. Quand le multijoueur arrivera, l'invité deviendra un
joueur réel sans que le reste du système change.

## 8. Progression

| | Chambre | Appartement | Local | Plateau |
|---|---|---|---|---|
| Scènes | 1 figée | plusieurs, transitions | overlays, alertes | habillage complet |
| Caméras | 1 webcam | webcam + plan large | 2-3 fixes | multi-cam + régie |
| Son | micro casque | micro sur pied | traitement acoustique | table de mixage |
| Format | « je joue » | rubriques simples | émission structurée | conducteur, invités, public |
| Équipe | soi | un monteur | modo, CM | réalisateur, régie, technicien |

Le passage d'un lieu à l'autre est un vrai déménagement, pas un changement de
décor.

## 9. Les applications de KZ OS

Le dock ne montre que ce qui est débloqué. Le joueur ignore qu'une plateforme de
gestion existe tant qu'il n'a pas d'employés — il la découvre par un mail.

| App | Déblocage | Rôle |
|---|---|---|
| KZ Studio | dès le départ | scènes, sources, passage en direct |
| Courrier | dès le départ | conversations, contrats, tutoriel diégétique |
| Fichiers | dès le départ | clips, rushs, miniatures, contrats |
| Analytique | 3 lives terminés | rétention par segment d'audience |
| Gestion | 1er employé | RH, salaires, charge de travail, moral |
| Conducteur | local ou mieux | composition des émissions |

Chaque déblocage arrive par un mail qui explique pourquoi l'outil devient utile
maintenant. **Le joueur ne lit jamais un tutoriel, il lit son courrier.**

## 10. Contraintes techniques assumées

- **Pas de vraie vidéo.** `VideoFrame` n'accepte que des vidéos modérées par
  Roblox. Tout ce qui « joue » à l'écran est du rendu 3D live
  (`ViewportFrame`) ou de l'animation d'interface.
- **Coût des écrans.** Une `SurfaceGui` active est chère. LOD obligatoire :
  au-delà d'une distance, la dalle s'éteint ; dans une régie, seules les dalles
  regardées sont vivantes.
- **Assets.** Le dépôt ne contient aucun modèle 3D ni texture. Le décor de test
  est généré par code (`DevRoom`). Les visuels sont des données, pas du code :
  les remplacer ne demande pas de refactorisation.

## 11. Règles d'architecture

1. **Le serveur fait autorité.** Le client envoie des intentions, jamais des
   résultats. Un jeu de gestion dont le client calcule l'argent se fait vider en
   quinze minutes.
2. **Une seule route réseau** (`Net`), validée en un seul endroit.
3. **Aucune couleur ni marge en dur** hors de `OS/Theme`.
4. **Le contenu est une donnée.** Mails, matériel, segments : des modules de
   données, pas du code. Ajouter une webcam au catalogue ne demande pas
   d'écrire une ligne de logique.
5. **Un seul OS, plusieurs affichages.** `KZOS` dessine dans un cadre logique de
   1280x720 et ignore où il est projeté. La même instance tourne sur un moniteur
   de chambre et sur le mur d'écrans d'une régie.

## 12. Prochaines étapes

- [ ] Système de placement d'objets (fantôme, grille, collisions, sauvegarde)
- [ ] Calcul de la note d'image (cadrage, lumière, fond, propreté)
- [ ] Incrustation du fond vert dans l'aperçu
- [ ] Câblage et ports, avec les câbles visibles en `Beam`
- [ ] Moteur d'audience par segments et chat réactif
- [ ] Sauvegarde `DataStore` (état + disposition de la pièce)
- [ ] Cycle jour / créneaux / fatigue
- [ ] Apps Analytique, Gestion, Conducteur
