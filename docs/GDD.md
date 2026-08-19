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
| Gameplay du live | **Attention partagée.** Le direct tourne pendant que le joueur travaille à autre chose ; il le rappelle par des incidents. |
| Écoulement du temps | Horloge continue, **vitesse réglable par le joueur** (pause, x1, x4, x10). |
| Fatigue | Continue et progressive. On dort quand on veut ; veiller est rentable le soir et coûteux le lendemain. |
| Achats | Commande en ligne depuis l'OS, **livraison le lendemain**. Le colis arrive physiquement et s'ouvre. |
| Écrans | **Vrais écrans indépendants.** Chaque moniteur a son bureau ; on fait glisser une fenêtre de l'un à l'autre. |
| Connectiques | Branchement automatique à portée, **alimentation gérée manuellement** (prises, puissance, rallonges). |
| Locaux | Plans préconçus, mais **cloisons et zones modifiables** pour que deux studios ne se ressemblent pas. |
| Émissions | **Éditeur complet** : identité, habillage, rubriques, chroniqueurs, invités, récurrence. |
| Menus | Aucun menu classique. Écran-titre au lancement, puis tout vit dans KZ OS. Quitter, c'est se coucher. |

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

## 4bis. Le live : partager son attention

C'est le gameplay minute par minute, et donc la décision la plus structurante
du projet.

Le direct tourne tout seul. Pendant ce temps, le joueur veut avancer : répondre
à un sponsor, monter un clip, préparer l'émission de demain, négocier un
contrat. Mais le live le rappelle sans arrêt — un troll dans le chat, le micro
qui sature, un viewer qui pose une vraie question, la rétention qui décroche.

**La tension vient de ce qu'il ne peut pas tout surveiller à la fois.**

Cette contrainte est matérielle, pas artificielle : au début il n'y a qu'un seul
moniteur. Ouvrir le chat cache le logiciel de stream. Lire ses mails, c'est
devenir aveugle à son propre direct. Le deuxième écran devient l'achat le plus
désirable du jeu, et le Stream Deck la façon d'agir sans rien regarder.

### Les rappels du direct

Chaque incident a un délai avant conséquence. Le joueur peut l'ignorer, mais pas
gratuitement.

| Incident | Si on l'ignore |
|---|---|
| Troll ou dérapage dans le chat | Ambiance qui se dégrade, modération à refaire |
| Micro saturé, image gelée | Chute de rétention, clips embarrassants |
| Question sincère d'un habitué | Perte de fidélité sur le segment concerné |
| Don important non remercié | Effet très négatif sur les donateurs |
| Segment qui déborde | Le suivant est sacrifié |

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

## 5bis. Écrans, connectiques et Stream Deck

### Les écrans

Chaque moniteur posé sur le bureau est une dalle indépendante avec **son propre
bureau**. Les fenêtres se font glisser d'un écran à l'autre en les poussant par
le bord. Techniquement, c'est une instance de KZ OS par machine, et un
gestionnaire de fenêtres par dalle rattachée à cette machine.

La progression est directe et lisible :

| | Ce qu'on peut surveiller en même temps |
|---|---|
| 1 écran | Une seule chose. Lire le chat, c'est perdre le logiciel de stream de vue. |
| 2 écrans | Le direct d'un côté, le travail de l'autre. Le vrai saut de confort. |
| 3 écrans et plus | Chat, régie, analytique, montage. Réservé au local et au plateau. |

### L'alimentation

Poser un appareil à portée de la machine le branche : pas de câble à tirer à la
main, le geste ne devient jamais une corvée. En revanche **l'électricité se
gère** : chaque prise a une puissance, la multiprise a une limite, et la
dépasser fait tout sauter — y compris en plein direct.

Les rallonges et les multiprises deviennent donc du matériel à acheter, et la
disposition du bureau reste une contrainte réelle.

### Le Stream Deck

Un boîtier de touches programmables posé sur le bureau. Techniquement, c'est une
petite dalle : la même `SurfaceGui` que les moniteurs, à plus petite échelle,
avec une grille de touches lisibles et cliquables directement dans le monde.

On programme chaque touche depuis une app de l'OS : changer de scène, couper le
micro, lancer un jingle, déclencher un enregistrement de clip, basculer une
ambiance lumineuse.

**C'est un appareil qui achète de l'attention.** Sans lui, chaque action pendant
un live coûte une fenêtre ouverte donc un écran occupé. Avec lui, une touche
suffit — à condition de l'avoir configurée à l'avance, au calme. Il s'intègre
donc exactement au cœur du jeu au lieu d'être un gadget.

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

### L'éditeur d'émission

La personnalisation va jusqu'au bout, parce que c'est ce qui donne envie de
montrer son émission aux autres :

- **Identité** — nom, logo, palette de couleurs, habillage à l'antenne, jingle.
- **Récurrence** — jour et heure fixes. Un rendez-vous hebdomadaire construit
  une audience d'habitude, bien plus fidèle qu'une audience de passage. Le rater
  coûte cher.
- **Rubriques** — ordonnées librement, avec leur durée prévue.
- **Chroniqueurs** — recrutés parmi ses employés, ils reviennent chaque semaine
  et développent leur propre popularité. Un bon chroniqueur peut partir monter
  sa propre chaîne.
- **Invités** — négociés par mail, chacun apportant son audience.
- **Public en studio** — à partir du local. Une jauge d'ambiance qui influence
  le direct : un plateau qui rit porte l'émission, un plateau froid la plombe.

Les modèles réels sont documentés : Popcorn fonctionne en quatuor présentateur
plus chroniqueurs plus invités, Backseat tient sur un rendez-vous hebdomadaire
fixe avec une quarantaine de personnes physiquement dans le studio.

## 7. Les événements et les invités

Annoncer une émission construit une attente, qui est une **dette** : livrer en
dessous de l'annonce coûte plus cher que ne rien annoncer. Annuler coûte de la
confiance durablement.

Les invités se négocient par mail. Chacun apporte sa propre audience, avec sa
propre composition — et deux publics incompatibles se déclarent la guerre dans
le chat pendant le live. Quand le multijoueur arrivera, l'invité deviendra un
joueur réel sans que le reste du système change.

## 7bis. Les grands événements

Le vrai endgame n'est pas d'avoir un plateau, c'est d'**organiser son propre
événement**. Trois échelles existent dans le paysage réel, et elles servent de
paliers.

### L'émission récurrente

Le rendez-vous hebdomadaire depuis son local. C'est le socle : une audience
d'habitude, des chroniqueurs, un public en studio.

### Le marathon caritatif

Plusieurs créateurs réunis, non-stop, une cagnotte commune. La mécanique
intéressante n'est pas l'argent : **on ne s'y invite pas soi-même, on est
choisi**. C'est une jauge de réputation qui ne s'achète avec rien, et le seul
contenu du jeu totalement inaccessible à l'argent.

Y participer, c'est aussi accepter une épreuve d'endurance qui met la fatigue au
centre : plusieurs jours quasiment sans dormir, avec des conséquences longues.

### L'événement-spectacle

Le sommet. Un lieu réel loué, des sponsors à convaincre, une régie
multi-caméras, des créateurs à recruter, une billetterie, et des mois de
préparation pendant lesquels la chaîne doit continuer de tourner.

C'est un projet parallèle qui consomme du temps, de l'argent et de l'équipe
pendant des semaines — et qui peut échouer en public. Le GP Explorer a réuni
près de 1,5 million de spectateurs simultanés ; c'est l'ordre de grandeur visé
comme fin de partie.

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

### Les locaux et leur aménagement

La chambre et l'appartement sont fixes : c'est précisément leur contrainte, et
elle doit se subir. La liberté arrive comme récompense.

À partir du local, on choisit parmi **plusieurs lieux au plan différent** (un
ancien commerce en rez-de-chaussée, un plateau de bureaux, un hangar, un
demi-étage d'immeuble), chacun avec ses avantages : surface, hauteur sous
plafond, lumière naturelle, isolation phonique, loyer, quartier.

L'enveloppe est fixe — murs porteurs, fenêtres, piliers. **Tout le reste se
modifie** : cloisons à poser et à abattre, portes, revêtements de sol et de mur,
et surtout des **zones à assigner** (plateau, régie, montage, détente,
stockage). C'est le joueur qui décide que ce coin devient la régie, et le jeu en
tire les conséquences.

Deux joueurs partant du même hangar n'auront donc pas le même studio, sans qu'il
faille dessiner cinquante plans différents.

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

## 11bis. Documents liés

- [CATALOGUE.md](CATALOGUE.md) — familles d'objets, styles de décor, LED
  pilotables, Stream Deck.
- [BACKLOG.md](BACKLOG.md) — bugs remontés en test et leur traitement.
- [INSTALLATION.md](INSTALLATION.md) — lancer le projet.

## 12. Prochaines étapes

Dans l'ordre, chaque étape s'appuyant sur la précédente.

**Socle**
- [ ] Catalogue d'objets étendu (mobilier, éclairage, décor, alimentation)
- [ ] Système de placement (fantôme, aimantation, collisions, rotation)
- [ ] Sauvegarde `DataStore` (état du joueur + disposition de la pièce)
- [ ] Boutique dans l'OS, commande et livraison le lendemain

**Le setup devient jouable**
- [ ] Multi-écran : une dalle = un bureau, fenêtres déplaçables entre écrans
- [ ] Alimentation : prises, puissance, surcharge, coupure
- [ ] Stream Deck : dalle réduite, touches programmables, pages
- [ ] Hub LED : ambiances, liaison aux scènes et aux touches
- [ ] Note d'image : cadrage, lumière, fond, cohérence de style
- [ ] Incrustation du fond vert dans l'aperçu

**Le live prend vie**
- [ ] Moteur d'audience par segments
- [ ] Chat réactif à ce qui se passe réellement
- [ ] Incidents et rappels du direct
- [ ] Horloge continue, vitesse réglable, fatigue

**L'entreprise**
- [ ] Apps Analytique, Gestion, Paramètres
- [ ] Employés : recrutement, salaires, charge, moral
- [ ] Locaux : choix du lieu, cloisons, zones assignables

**L'émission**
- [ ] Éditeur de format : identité, rubriques, récurrence
- [ ] Chroniqueurs et invités
- [ ] Régie multi-caméras et conducteur en direct
- [ ] Public en studio

**L'endgame**
- [ ] Marathon caritatif sur invitation
- [ ] Organisation d'un événement-spectacle
