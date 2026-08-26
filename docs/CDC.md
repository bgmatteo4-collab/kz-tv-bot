# Cahier des charges — *Plateau* (nom de travail)

> **Statut** : v0.1 — conception. Aucun code écrit.
> **Dernière mise à jour** : 26 août 2026.
>
> Ce document est la référence unique du projet. Toute décision tranchée y est
> inscrite. **Si le code et ce document divergent, l'un des deux est un bug.**

---

## 0. Comment ce projet évolue

Trois documents, trois rôles distincts :

| Document | Rôle |
|---|---|
| `CDC.md` (ici) | La référence. Ce que le projet **est**. Mis à jour à chaque décision. |
| `BACKLOG.md` | La pile. Ce qu'on **voudrait** ajouter, non affecté à une version. |
| `PATCH-NOTES.md` | Le journal. Ce qui a été **livré**, version par version. |

**Le cycle.** Une demande arrive → elle part au backlog, rien n'est codé.
Quand le porteur du projet décide « on démarre la vX.Y », le périmètre est figé,
sorti du backlog, développé, audité, puis consigné en note de version.

**Numérotation.** `v0.x` pendant le développement, `v1.0` à la première sortie
publique, puis `MAJEUR.MINEUR.CORRECTIF`.

---

## 1. Objectif général

Créer une expérience Roblox reproduisant **un local de production audiovisuelle
complet et crédible**, que le joueur aménage librement et dans lequel il produit
ses propres émissions.

L'exigence centrale n'est pas la quantité de fonctionnalités : c'est la
**cohérence visuelle et la crédibilité du lieu**. Un local qui ressemble
vraiment à un local, à l'échelle, avec la bonne lumière et les bons matériaux.

## 2. Vision

Les jeux de studio existants sur Roblox montrent un plateau isolé, posé dans le
vide, avec des caméras décoratives. Ici, le plateau est **une pièce parmi
d'autres dans un lieu qui fonctionne** : on traverse l'open space pour aller en
régie, on prépare son conducteur en salle de réunion, on croise l'équipe à la
cuisine, et on entre sur le plateau par la porte de service.

Trois partis pris structurants :

1. **Le lieu prime sur le plateau.** Bureaux, salon, cuisine, salle de réunion,
   cabines de stream, montage, loges, réserve. Le plateau n'a de valeur que
   parce qu'il est entouré.
2. **Le décor est un système, pas un objet.** Le plateau se reconfigure à partir
   de pièces normalisées : ce n'est pas « quatre décors au choix », c'est un jeu
   de construction dont les quatre formats connus ne sont que des points de
   départ.
3. **Produire est l'activité, pas la récompense.** Tout le matériel est
   disponible immédiatement. Ce qui se gagne, c'est la réussite d'une émission.

## 3. Utilisateurs concernés

- **Joueur principal** : joueur Roblox sur PC, seul, attiré par la création, la
  décoration d'intérieur, la production de contenu et les coulisses des médias.
- **Session type** : 20 à 60 minutes — aménager, préparer, produire une émission.
- **Prérequis** : aucune connaissance de l'audiovisuel. Le vocabulaire métier est
  introduit par l'usage, jamais par un glossaire.
- **Hors cible assumée** : le joueur mobile (voir §14, incompatibilité technique
  avec le style graphique retenu).

---

## 4. Décisions verrouillées

Ces décisions sont prises. Les rouvrir demande une décision explicite du porteur
du projet, consignée ici.

| Sujet | Décision | Date |
|---|---|---|
| Plateforme | Roblox / Luau, synchronisé par Rojo | 26/08 |
| Nombre de joueurs | **Solo**, avec des PNJ | 26/08 |
| Serveur autoritaire | **Oui, dès le départ**, malgré le solo | 26/08 |
| Nature du lieu | Un **local complet**, pas un plateau isolé | 26/08 |
| Structure de jeu | **Bac à sable** : tout le matériel disponible immédiatement | 26/08 |
| Raison de revenir | La **production d'une émission**, répétable, avec un résultat | 26/08 |
| Rôle du joueur | Les trois à tour de rôle : aménager, piloter la régie, être à l'antenne | 26/08 |
| Aménagement | **Tout le local** est modifiable, pas seulement le plateau | 26/08 |
| Style graphique | **Réaliste poussé** : PBR, éclairage Future | 26/08 |
| PNJ | Équipe qui travaille dans les bureaux + public et invités sur le plateau | 26/08 |
| Formats d'événement | Talk-show, plateau esport, session live, journal/débat | 26/08 |
| Échelle | **1 mètre = 3 studs**, sans exception | 26/08 |
| Marques | **Aucune marque réelle.** Identité originale créée pour le projet | 26/08 |
| Monétisation | Non traitée à ce stade. Aucun achat accélérant la progression. | 26/08 |

### Décisions écartées, et pourquoi

- **Application web de régie** — écartée au profit de Roblox. Aurait donné une
  qualité d'habillage supérieure, mais aurait perdu le lieu, la circulation et
  la présence physique, qui sont le cœur du projet.
- **Multijoueur** — écarté au lancement. L'architecture serveur autoritaire est
  néanmoins posée dès maintenant pour ne pas interdire une reprise ultérieure.
- **Progression par déblocage** — écartée. Remplacée par la répétition de
  productions à résultat variable.

---

## 5. Le lieu

### 5.1 Principe

Un local de plain-pied, compact et dense. **La qualité prime sur la surface** :
mieux vaut 700 m² irréprochables que 2000 m² inégaux. C'est le premier garde-fou
imposé par le choix du réalisme poussé.

Surface cible : **environ 670 m² utiles** dans une enveloppe de **768 m² hors
tout**, soit une emprise de **96 × 72 studs** (32 × 24 m). L'écart entre les deux
est la place prise par les murs et les cloisons : environ 13 %, ce qui est la
proportion normale d'un bâtiment de cette taille. Une enveloppe calée au plus
juste sur la somme des pièces ne rentrerait pas.

### 5.2 Programme des espaces *(proposition à valider)*

| Espace | Surface | Hauteur | Rôle |
|---|---|---|---|
| Accueil | 25 m² | 3 m | Entrée, comptoir, mur d'identité |
| Open space | 120 m² | 3 m | 10 à 12 postes de travail |
| Salle de réunion | 30 m² | 3 m | Vitrée, 8 places, écran mural |
| Cuisine / cantine | 45 m² | 3 m | Coin repas, machine à café |
| Salon / détente | 50 m² | 3 m | Canapés, console, baby-foot |
| Cabines de stream | 3 × 12 m² | 3 m | Insonorisées, un setup chacune |
| Salle de montage | 35 m² | 3 m | 3 postes, éclairage tamisé |
| Loge / maquillage | 20 m² | 3 m | Invités, miroirs, portants |
| Réserve matériel | 40 m² | 4 m | Flight cases, racks, pieds |
| **Plateau** | **120 m²** | **6 m** | 12 × 10 m, grill technique |
| **Régie** | **30 m²** | **3 m** | Attenante, vitre sur le plateau |
| Circulations, sanitaires | ~120 m² | 3 m | Couloirs, dégagements |
| **Total utile** | **671 m²** | | Hors murs et cloisons |

La hauteur sous plafond du plateau (6 m) est **non négociable** : c'est elle qui
fait la différence entre un vrai studio et une salle de classe repeinte en noir.
C'est l'erreur la plus fréquente et la plus visible.

### 5.3 Ce qui est fixe, ce qui est libre

- **Fixe** : l'enveloppe. Murs porteurs, position des pièces, ouvertures,
  hauteurs, fenêtres, piliers.
- **Libre** : tout ce qui se pose. Mobilier, matériel, décor, éclairage, dans
  toutes les pièces sans exception.

Ce partage évite l'incohérence architecturale tout en tenant la promesse du bac
à sable.

---

## 6. Le plateau modulable

### 6.1 Le système

Le plateau n'est pas une liste de décors. C'est un **jeu de pièces normalisées**
qui s'assemblent sur une grille commune :

- **Sol** : praticables (podiums) de hauteurs normalisées, marches, plinthes.
- **Fonds** : cyclo, panneaux LED, cloisons habillables, fond vert, rideaux.
- **Structures** : ponts lumière, pieds, barres, accroches au grill.
- **Éclairage** : découpes, panneaux LED, projecteurs, tubes colorés.
- **Mobilier de plateau** : canapés, fauteuils, pupitres, tables, bureaux JT.
- **Écrans** : moniteurs de retour, écrans géants, murs d'images.
- **Prise de vue** : caméras sur pied, sur trépied, épaule, plans fixes.
- **Son** : perches, micros pupitre, micros cravate, retours.
- **Public** : gradins modulaires, chaises, barrières.

Toute pièce respecte la grille et les hauteurs de la charte (§9). Deux pièces
compatibles s'alignent toujours parfaitement — c'est la condition pour que le
plateau ne paraisse jamais bricolé.

### 6.2 Les quatre formats

Ce sont des **points de départ**, pas des limites. Chacun est une disposition
préenregistrée que le joueur peut charger, puis modifier librement.

| Format | Configuration | Contrainte propre |
|---|---|---|
| **Talk-show** | Canapés en L, table basse, fond habillé, public de face | Le format le plus polyvalent, celui du tutoriel |
| **Plateau esport** | Pupitres commentateurs, écran géant, cabines joueurs | Beaucoup d'écrans allumés : coût de rendu à surveiller |
| **Session live** | Scène basse, backline réduit, ponts lumière, public debout | Format volontairement modeste : le plateau est petit, une vraie salle de concert serait un mensonge |
| **Journal / débat** | Bureau de présentation ou pupitres, fond LED, tribune | Le plus dense en habillage à l'écran |

### 6.3 Le montage et le démontage

Changer de format est une **opération**, pas un bouton. Charger une disposition
place les pièces, mais elles arrivent depuis la réserve : le passage d'un format
à l'autre prend du temps de jeu et occupe l'équipe. C'est ce qui donne du poids
à la modularité au lieu d'en faire un menu.

---

## 7. Produire une émission

### 7.1 La boucle

1. **Préparer** — choisir un format, composer le conducteur (suite de segments
   avec leur durée), inviter les intervenants, vérifier le matériel.
2. **Monter** — configurer le plateau, placer caméras, lumières et son.
3. **Produire** — l'émission se déroule en temps réel, segment par segment.
4. **Résultat** — un bilan à la fin, dépendant de ce qui a été préparé et de la
   façon dont les imprévus ont été gérés.

### 7.2 Pendant la prise

Le joueur alterne entre trois postes, et **ne peut pas être partout** :

- **Régie** — choisir la caméra à l'antenne, lancer les habillages, suivre le
  chrono, gérer les incidents.
- **Caméra** — cadrer, suivre les intervenants, changer de valeur de plan.
- **Antenne** — présenter, enchaîner les segments, réagir.

Les postes qu'il ne tient pas sont tenus par des PNJ, moins bien que lui. C'est
le cœur de la tension : déléguer, c'est perdre en qualité ; tout faire est
impossible.

### 7.3 Les imprévus

Chaque incident a un délai avant conséquence. L'ignorer coûte, mais le traiter
coûte l'attention prise ailleurs.

| Incident | Si on l'ignore |
|---|---|
| Micro coupé ou saturé | Segment inaudible, chute de la note |
| Caméra mal cadrée | Plan inutilisable à l'antenne |
| Segment qui déborde | Le suivant est sacrifié |
| Invité qui décroche | Blanc à l'antenne |
| Projecteur qui lâche | Zone d'ombre sur le plateau |
| Public sans réaction | Ambiance plate, l'émission tombe à plat |

### 7.4 Le résultat

Une note par axe plutôt qu'un score unique : **image**, **son**, **rythme**,
**contenu**, **ambiance**. Chaque axe se rattache à des causes lisibles, pour
que le joueur comprenne quoi corriger. Aucun axe n'est aléatoire.

---

## 8. Les PNJ

Deux familles, deux exigences très différentes.

### 8.1 L'équipe

Des employés occupent le local : postes de travail, cuisine, salon, montage,
salle de réunion. Ils ont un emploi du temps et des trajets crédibles.

**Ils ne sont pas intelligents, ils sont occupés.** L'objectif n'est pas de
simuler des collègues mais de faire qu'un lieu ne sonne jamais vide. Ambition
tenue volontairement basse pour être atteinte.

Pendant une production, ils tiennent les postes que le joueur ne tient pas, avec
une compétence inférieure à la sienne.

### 8.2 Le public et les invités

Le public remplit les gradins pendant les productions, réagit (rires,
applaudissements, silence) et porte l'ambiance. Les invités s'assoient, parlent,
et occupent leur segment.

**Contrainte technique majeure** : un public nombreux en style réaliste est le
principal risque de performance du projet. Traité en §14.

---

## 9. Direction artistique

### 9.1 L'échelle — la règle fondatrice

**1 mètre = 3 studs.** Sans exception, dans tout le projet.

L'avatar Roblox par défaut mesure environ 5,2 studs, soit **1,73 m** — la taille
moyenne d'un adulte. Toutes les dimensions du monde réel se convertissent donc
directement, et tout objet doit être dimensionné à partir de sa cote réelle.

| Élément | Réel | Studs |
|---|---|---|
| Hauteur de porte | 2,10 m | 6,3 |
| Hauteur de plan de bureau | 0,74 m | 2,2 |
| Assise de chaise | 0,45 m | 1,35 |
| Plafond de bureau | 3,00 m | 9 |
| Plafond de plateau | 6,00 m | 18 |
| Praticable, module bas | 0,20 m | 0,6 |
| Écran 27 pouces (largeur) | 0,60 m | 1,8 |

**Aucune dimension d'objet ne sera choisie à l'œil.** Chaque entrée du catalogue
déclare sa cote réelle en mètres ; la conversion est faite par le code.

### 9.2 La grille

- **Grille de placement** : 0,25 m (0,75 stud) — assez fin pour du mobilier,
  assez grossier pour que rien ne flotte entre deux positions.
- **Grille de construction du plateau** : 0,50 m (1,5 stud) pour les praticables
  et panneaux, afin que les modules s'alignent toujours.
- **Rotations** : par pas de 15°.

### 9.3 La lumière

C'est elle qui fait « studio professionnel », davantage que la géométrie.

- **Technologie** : `Future` (ombres portées, lumières locales réalistes).
- **Bureaux** : lumière neutre et froide, plafonniers, apport de fenêtres.
- **Salon, cuisine** : lumière chaude, sources basses, contraste doux.
- **Montage, régie** : sombre, contrastée, écrans comme sources dominantes.
- **Plateau** : trois points classiques (face, latérale, contre-jour), plus les
  ambiances colorées du format joué.

**Budget d'éclairage** : nombre maximal de lumières projetant une ombre défini
et respecté (voir §14). Le reste est de la lumière sans ombre ou du matériau
émissif.

### 9.4 Les matériaux

Bibliothèque PBR restreinte et partagée par tout le projet, via
`SurfaceAppearance`. Une dizaine de matériaux maîtrisés valent mieux que
cinquante hétérogènes.

Palette de base : moquette technique noire, béton lissé, alu brossé, bois clair,
verre, plexiglas, tissu, peinture mate. Chaque matériau existe en une seule
version, utilisée partout.

### 9.5 L'habillage à l'écran

Roblox ne permet pas un motion design de niveau broadcast : ni vectoriel, ni
shader d'interface, ni polices personnalisées. Le parti pris est donc **assumé
et net** plutôt qu'imitatif : formes pleines, aplats, typographie grasse,
animations simples et rapides. Un habillage franc et lisible, jamais une
imitation ratée de télévision.

Toutes les valeurs (couleurs, marges, durées, tailles) vivent dans un module de
thème unique. **Aucune valeur graphique en dur ailleurs.**

### 9.6 Identité

Le projet crée sa **propre identité de média** : nom, logo vectoriel, palette,
déclinaisons, habillage. Elle est conçue pour de vrai, pas approximée.

**Aucune marque réelle n'est reproduite.** Les codes du secteur s'étudient et se
reprennent ; une marque, un logo ou une charte appartenant à quelqu'un, non.
Cette règle est absolue et ne souffre aucune exception, y compris pour un
placeholder temporaire.

---

## 10. Fonctionnalités

### 10.1 Principales — sans elles, le projet n'existe pas

| # | Fonctionnalité | Justification |
|---|---|---|
| F1 | Le local construit et parcourable | Le lieu est le produit |
| F2 | Système de placement d'objets (fantôme, aimantation, rotation, collision) | Condition du bac à sable |
| F3 | Catalogue d'objets, petit mais complet et cohérent | Aucun trou dans le décor |
| F4 | Sauvegarde de l'aménagement et de l'état | Sans elle, tout est perdu à la déconnexion |
| F5 | Plateau modulable et quatre formats préenregistrés | Le cœur du concept |
| F6 | Conducteur : composer une suite de segments | Structure de l'émission |
| F7 | Production en temps réel avec chrono et segments | La boucle de jeu |
| F8 | Régie : sélection de caméra, retour, habillage | Le poste principal du joueur |
| F9 | Imprévus pendant la production | La tension |
| F10 | Bilan par axes à la fin | La raison de recommencer |
| F11 | PNJ équipe : occupation crédible du local | Le lieu ne doit jamais sonner vide |
| F12 | PNJ public et invités pendant les productions | Le plateau ne doit jamais sonner vide |

### 10.2 Secondaires — le projet vit sans, mais moins bien

Éclairage pilotable par ambiances · caméras supplémentaires et valeurs de plan ·
son (perches, micros, retours) · loge et préparation des invités · réserve
matérielle avec transport des pièces · plusieurs identités d'émission ·
personnalisation de l'avatar · cycle jour/nuit · météo visible par les fenêtres ·
photo mode.

### 10.3 Priorités

**P0 — le lieu existe** : F1, F2, F3, F4.
Un local parcourable, aménageable, et qui se souvient. Rien d'autre.

**P1 — le plateau existe** : F5.
Le plateau se configure, les formats se chargent.

**P2 — l'émission existe** : F6, F7, F8, F10.
On produit, il se passe quelque chose, on obtient un résultat.

**P3 — le lieu est vivant** : F11, F12, F9.
Les PNJ peuplent le local, les imprévus surviennent.

Ordre non négociable : **une fonctionnalité de priorité N ne commence pas tant
que toutes celles de N-1 ne sont pas terminées** au sens du §18.

---

## 11. Architecture technique

### 11.1 Règles d'architecture

1. **Le serveur fait autorité.** Le client envoie des intentions, jamais des
   résultats. Vrai même en solo : c'est gratuit maintenant, impossible à
   rattraper plus tard, et cela n'interdit pas le multijoueur.
2. **Une seule route réseau**, validée en un seul endroit.
3. **Le contenu est une donnée.** Un objet du catalogue, un format de plateau,
   un type d'incident : des entrées de données, jamais du code. Ajouter une
   chaise ne demande pas d'écrire une ligne de logique.
4. **Aucune valeur graphique en dur** hors du module de thème.
5. **Aucune dimension à l'œil.** Toute cote vient du réel, convertie par le code
   (§9.1).
6. **Un module, une responsabilité.** Un fichier qui dépasse 400 lignes est un
   signal, pas une fatalité.

### 11.2 Technologies

| Besoin | Choix | Pourquoi |
|---|---|---|
| Moteur | Roblox | Décidé (§4) |
| Langage | Luau, mode strict | Typage natif, détecte l'essentiel des erreurs bêtes |
| Sync Studio ↔ dépôt | Rojo | Standard de fait, seul outil permettant un vrai suivi Git |
| Gestion d'outils | Aftman | Versions d'outils épinglées et reproductibles. **Aucun binaire versionné.** |
| Linting | Selene | Standard Roblox, catalogue d'erreurs pertinent |
| Formatage | StyLua | Supprime tout débat de style |
| Tests unitaires | TestEZ | Standard Roblox, suffisant pour les modules purs |
| Intégration continue | GitHub Actions | Lint, format et tests à chaque poussée |

Aucune bibliothèque tierce n'est retenue à ce stade. Les quelques briques
génériques nécessaires (signal, nettoyage d'objets, création d'instances) sont
courtes et seront écrites : une dépendance externe pour cinquante lignes est un
mauvais échange.

### 11.3 Structure du projet

```
src/
├── shared/            répliqué : partagé client et serveur
│   ├── Lib/           briques génériques
│   ├── Config/        données : catalogue, formats, incidents, charte
│   ├── UI/            thème et composants d'interface
│   └── Net.lua        la route réseau unique
├── server/            autorité : état, règles, validation, sauvegarde
│   └── Services/
└── client/            affichage, entrées, caméra
    ├── Build/         mode aménagement
    └── Control/       régie
```

---

## 12. Données et sauvegarde

### 12.1 Ce qui est sauvegardé

L'aménagement complet du local (objets posés : identifiant, position, rotation),
les dispositions de plateau enregistrées, les conducteurs composés, l'historique
des productions et leurs résultats, l'état de l'avatar et les préférences.

### 12.2 Comment

`DataStoreService`, une clé par joueur, écriture au départ du joueur et
périodiquement pendant la session.

**Cette fonctionnalité est en priorité P0, non négociable.** Un jeu de bac à
sable sans persistance est une démonstration, pas un jeu.

### 12.3 Garanties exigées

- **Sauvegardes versionnées** : chaque enregistrement porte un numéro de schéma,
  et le code sait migrer une ancienne sauvegarde. Une mise à jour ne détruit
  jamais un local existant.
- **Écriture protégée** : `UpdateAsync`, jamais `SetAsync`, pour éviter d'écraser
  une écriture concurrente.
- **Verrou de session** : empêcher deux serveurs d'écrire la même clé.
- **Sauvegarde de secours** : la dernière sauvegarde valide est conservée en
  parallèle. Une donnée corrompue n'efface pas la précédente.
- **Budget respecté** : les quotas de `DataStoreService` sont limités. La
  sauvegarde est compacte (identifiants courts, pas de texte redondant) et
  jamais déclenchée en rafale.

### 12.4 API et services externes

**Aucun.** Le jeu ne dépend d'aucun service tiers, d'aucun appel HTTP sortant,
d'aucune clé d'API. C'est un choix : chaque dépendance externe est un point de
panne qu'on ne contrôle pas. Il n'y a donc **aucune variable d'environnement**
et aucun secret à gérer — cette section restera vide tant que ce sera vrai.

---

## 13. Interfaces et UX

### 13.1 Principes

- **Diégétique par défaut.** Une information qui peut vivre sur un écran du
  monde y vit. La régie s'utilise depuis la régie, pas depuis un menu.
- **Le HUD flottant est réservé** à ce qui n'a pas de support physique : les
  invites contextuelles et le mode aménagement.
- **Aucune information critique en simultané** hors du champ de vision : si le
  joueur doit le savoir, il doit pouvoir le voir d'où il est.

### 13.2 Les interfaces prévues

| Interface | Support | Rôle |
|---|---|---|
| Aménagement | Superposition à l'écran | Catalogue, fantôme, rotation, validation |
| Régie | Écrans de la régie | Caméras, habillage, chrono, conducteur |
| Conducteur | Écran de la salle de réunion | Composer les segments |
| Retours plateau | Moniteurs du plateau | Ce qui est à l'antenne |
| Bilan | Écran de la régie | Notes par axe et causes |
| Invites | HUD minimal | « E — s'asseoir », « F — aménager » |

### 13.3 Lisibilité sur écran 3D

Un texte projeté sur une surface du monde se lit mal : il est vu de biais, à
distance, et souvent dans la pénombre. Conséquences imposées : tailles de texte
généreuses, contrastes élevés, jamais plus de trois niveaux d'information par
écran, et **verrouillage de la caméra face à l'écran** quand on l'utilise.

---

## 14. Performances et compatibilité

Le style réaliste poussé est le choix le plus coûteux possible. Ces budgets ne
sont pas des objectifs souhaitables, ce sont des **limites de conception**.

| Poste | Budget |
|---|---|
| Fluidité cible | 60 img/s sur PC de milieu de gamme |
| Plancher acceptable | 30 img/s, jamais en dessous pendant une production |
| Lumières avec ombre, simultanées | 12 au maximum |
| PNJ animés visibles simultanément | 25 au maximum |
| Surfaces d'interface actives | 6 au maximum, extinction au-delà d'une distance |
| Matériaux PBR distincts | 12 au maximum sur tout le projet |

**Moyens.** `StreamingEnabled` obligatoire (le local n'est jamais chargé
entièrement). Niveaux de détail sur les écrans : actif près, image figée à
moyenne distance, éteint au loin. Public traité par instanciation légère plutôt
que par personnages complets si le budget de 25 est atteint.

**Compatibilité.** PC uniquement. Le mobile est **hors cible** : PBR et
éclairage `Future` y sont injouables. Cette exclusion découle directement du
style graphique retenu et doit être acceptée comme telle. Manette : à évaluer,
non prioritaire.

---

## 15. Sécurité

Même en solo, le client ne décide de rien :

- Toute intention est validée côté serveur : l'objet existe-t-il au catalogue ?
  l'emplacement est-il licite ? la pièce autorise-t-elle cet objet ?
- Les positions reçues sont bornées à l'emprise du local.
- Le débit des requêtes est limité par joueur.
- **Aucun outil de développement actif en production.** Un drapeau unique de
  configuration, vérifié côté serveur à chaque route d'administration, et
  obligatoirement à `false` avant toute publication. Masquer une interface ne
  protège rien.
- Aucune donnée personnelle collectée, aucun texte libre de joueur affiché à
  d'autres joueurs (sans objet en solo, mais la règle est posée).

---

## 16. Erreurs, journalisation, débogage

- **Une erreur ne casse jamais le jeu.** Le placement d'un objet qui échoue
  laisse le local intact ; une sauvegarde qui échoue est réessayée puis signalée.
- **Journalisation par niveaux** (debug, info, avertissement, erreur), avec un
  préfixe par service, désactivable en production.
- **Aucune erreur silencieuse.** Un échec est journalisé avec son contexte.
- **Console d'administration** de développement : téléportation, remise à zéro
  du local, forçage d'incident, affichage des compteurs de performance.
  Strictement soumise au drapeau du §15.

---

## 17. Assets : règles, sources, licences

### 17.1 Règles absolues

1. **Aucune marque, logo ou charte appartenant à un tiers**, sous aucune forme,
   pas même temporairement.
2. **Aucun placeholder dans une version livrée.** Une pièce non finie n'est pas
   livrée.
3. **Aucun asset dont la licence n'est pas vérifiée** et consignée.
4. **Aucune dimension arbitraire** : tout objet est dimensionné depuis sa cote
   réelle (§9.1).

### 17.2 Registre obligatoire

Chaque asset externe important est consigné dans `docs/ASSETS.md` avec : nom,
source, licence exacte, résolution ou nombre de polygones d'origine, date
d'intégration, et modifications effectuées.

### 17.3 Si un asset manque

**Il n'est jamais remplacé silencieusement par une approximation.** Le manque est
signalé, inscrit au backlog, et une solution est proposée. Un objet manquant est
un problème visible ; un objet approximatif est un problème invisible qui
contamine la cohérence de tout le lieu.

### 17.4 Méthode d'intégration

Remplacer **par espace**, jamais au hasard : finir entièrement l'open space donne
un lieu cohérent ; poser dix objets répartis dans cinq pièces donne un lieu
bancal partout. Ordre : plateau et régie, puis open space, puis salon et cuisine,
puis le reste.

---

## 18. Tests et critère de « terminé »

### 18.1 Ce qui est automatisé

- **Syntaxe** : compilation Luau de tous les fichiers, à chaque poussée.
- **Lint** : Selene, sans avertissement toléré.
- **Format** : StyLua en mode vérification.
- **Tests unitaires** : TestEZ sur les modules purs — conversion d'échelle,
  validation de placement, calcul du bilan, migration de sauvegarde. Ce sont
  précisément les endroits où une erreur est invisible à l'œil.

### 18.2 Ce qui est manuel

Un protocole de test écrit et rejoué à chaque version : parcours du local,
aménagement et sauvegarde, rechargement, chargement de chaque format, production
complète d'une émission, relevé des images par seconde dans les six lieux les
plus chargés.

### 18.3 Une fonctionnalité est terminée si

Elle fonctionne · elle respecte ce document · elle ne casse rien d'existant ·
ses erreurs sont gérées · elle est testée · son code passe lint et format · ses
assets sont intégrés aux bonnes dimensions · son rendu respecte la charte · ses
performances tiennent les budgets du §14 · elle est documentée si elle change
une procédure.

**« Ça marche chez moi » n'est jamais suffisant.**

---

## 19. Installation, configuration, dépendances

*(À rédiger avec le premier code. Cible : `INSTALLATION.md`.)*

Principes déjà arrêtés : installation par Aftman, aucun binaire versionné dans
le dépôt, aucune dépendance externe, `rojo serve` pour développer, et un fichier
de place jouable produit par la CI plutôt que versionné à la main.

---

## 20. Déploiement, maintenance, reprise après incident

- **Déploiement** : publication manuelle depuis Studio vers une expérience
  Roblox, après passage complet du protocole de test manuel et vérification du
  drapeau de développement.
- **Deux environnements** : une place de test privée, une place publique.
  Jamais de publication directe.
- **Reprise** : une version qui pose problème est remplacée par la précédente
  via l'historique de versions de Roblox. Les sauvegardes joueur étant
  versionnées (§12.3), un retour en arrière du code ne détruit pas les locaux
  construits.
- **Maintenance** : le cahier des charges est mis à jour avant le code, jamais
  après.

---

## 21. Risques identifiés

| Risque | Gravité | Traitement |
|---|---|---|
| Volume de travail graphique du réalisme poussé | **Élevée** | Local compact, charte écrite d'abord, remplacement par espace |
| Performances : PBR + Future + PNJ + écrans | **Élevée** | Budgets chiffrés du §14 traités comme des limites de conception |
| Bac à sable solo sans raison d'y rester | **Élevée** | La production d'émission est l'activité récurrente, pas un bonus |
| Périmètre : douze fonctionnalités principales | **Élevée** | Priorités P0 à P3 strictement séquentielles |
| Public nombreux en style réaliste | Moyenne | Plafond de 25 PNJ animés, instanciation légère au-delà |
| Tentation d'utiliser des marques réelles | Moyenne | Règle absolue du §17.1, identité originale créée |
| Sauvegardes corrompues par une mise à jour | Moyenne | Schéma versionné, migration, sauvegarde de secours |
| Lisibilité des écrans 3D | Faible | Verrouillage caméra, contraste, trois niveaux maximum |

---

## 22. Questions ouvertes

À trancher avant ou pendant la v0.1. Aucune ne bloque le démarrage.

1. **Le nom du projet.** « Plateau » est un nom de travail.
2. **Le plan du local** (§5.2) est une proposition : nombre de pièces, surfaces
   et disposition restent à valider.
3. **Le nom et l'identité du média fictif** produit dans le local.
4. **La vue** : première personne, troisième personne, ou les deux.
5. **Le déplacement des objets lourds** : instantané ou transporté depuis la
   réserve.
6. **La durée d'une production** en temps de jeu.
7. **Le passage du temps** : horloge continue ou journées découpées.

---

## 23. Journal des décisions

| Date | Décision | Motif |
|---|---|---|
| 26/08 | Abandon du projet précédent, remise à zéro du dépôt | Nouveau projet sans rapport |
| 26/08 | Roblox retenu malgré le plafond visuel sur l'habillage | Le lieu, la circulation et la présence physique priment |
| 26/08 | Réalisme poussé retenu malgré la charge de travail | Choix assumé, compensé par un local compact |
| 26/08 | Bac à sable retenu, complété par la production comme activité | Éviter le lieu vide sans imposer un tunnel de déblocage |
| 26/08 | Échelle fixée à 1 m = 3 studs | Toute cote doit dériver du réel |
| 26/08 | Enveloppe portée à 96 × 72 studs | Les 671 m² utiles ne tenaient pas dans l'emprise annoncée |
