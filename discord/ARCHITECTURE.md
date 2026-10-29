# Serveur Discord Kayzx TV — architecture

Document de référence, à relire et à casser avant que la moindre ligne du bot soit écrite.
Tout ce qui est décrit ici devient un fichier de configuration : le script de déploiement le
lit et construit le serveur. Il est rejouable — on relance, il met à jour au lieu de dupliquer.

---

## 1. Le principe directeur

Un serveur communautaire échoue presque toujours de la même façon : quarante salons, aucun
mode d'emploi, et un nouveau venu qui écrit au mauvais endroit puis se tait.

La réponse ici est systématique : **chaque salon, sans exception, porte sa carte en tête.**
Une image épinglée, aux couleurs de l'univers, qui dit trois choses :

1. à quoi sert ce salon,
2. ce qui est attendu et ce qui ne passe pas,
3. **où aller quand ce n'est pas le bon endroit** — c'est cette troisième ligne qui fait le
   travail de guidage.

Les salons du staff portent en plus leur panneau de commandes. Un modérateur n'a jamais à
retenir une syntaxe : elle est affichée là où il en a besoin.

---

## 2. Les rôles

### Hiérarchie (de haut en bas dans les réglages du serveur)

| Rôle | Couleur | Attribution | Ce qu'il peut |
|---|---|---|---|
| `Kayzx TV` | — | le bot | Administrateur. **Doit rester tout en haut** sans quoi il ne peut gérer les rôles en dessous. |
| `Kayzx` | honey `#E0A93B` | toi | Propriétaire. |
| `Administration` | corail `#B9533F` | manuel | Tout sauf la gestion du serveur lui-même. |
| `Modération` | teal `#1E5B57` | manuel | Sanctionner, gérer les messages, les tickets. |
| `Régie` | chêne `#8A5A36` | manuel | Publier les annonces, ouvrir Le Plateau, distribuer les micros. |
| `Intervenant` | teal néon `#3FD3C2` | **temporaire, par le bot** | Parler sur Le Plateau. Retiré à la fin de la diffusion. |
| `En direct` | honey `#E0A93B` | **automatique** | Cosmétique : remonte en tête de liste quand le membre streame. |
| `Clippeur` | miel clair `#F2C97A` | récompense | Décerné au clip de la semaine. |
| `Abonné Twitch` | teal profond `#123A38` | liaison Twitch | Accès aux salons d'abonnés, emojis. |
| `Membre` | aucune | à la validation du règlement | Écrire partout dans la communauté. |
| `@everyone` | — | — | Voir l'accueil, rien d'autre. |

### Rôles de notification

Sans couleur, mentionnables, choisis par le membre dans `#les-rôles` :
`Ping Live` · `Ping Match` · `Ping Événement`

Personne n'est mentionné sans l'avoir demandé. C'est la différence entre une communauté
qu'on a envie de suivre et un serveur qu'on met en sourdine au bout de trois jours.

### Rôles de centre d'intérêt

Auto-attribués, servent à filtrer les annonces et à trouver des joueurs :
`Football` · `MMA` · `Gaming`
→ **à compléter : quels jeux exactement ?**

### Rôles de sanction

`En quarantaine` — ne voit plus que `#règlement` et son ticket. Pour le temps d'un échange
à froid, quand un bannissement serait disproportionné.

---

## 3. Les catégories et les salons

Code couleur des cartes : **teal** communauté · **miel** direct et matchs · **chêne** gaming ·
**corail** staff.

### 📌 ACCUEIL — *teal* — visible par tous, lecture seule

| Salon | Rôle |
|---|---|
| `#bienvenue` | La carte d'accueil, et un bouton **« J'ai lu le règlement »** qui donne `Membre`. |
| `#règlement` | Les règles en une carte. Pas un pavé de texte que personne ne lit. |
| `#annonces` | **Salon d'annonces.** Le bot seul y écrit. Les autres serveurs peuvent s'y abonner. |
| `#les-rôles` | Menus déroulants : notifications, centres d'intérêt, couleur. |
| `#liens` | Twitch, YouTube, TikTok, X — en carte, avec les boutons. |

**Carte `#bienvenue`** — *Bienvenue sur le Discord de Kayzx TV. Ici on suit les lives, on
regarde les matchs ensemble et on joue.*
1. Lis le règlement — il tient en une image
2. Choisis tes rôles dans `#les-rôles` pour être prévenu de ce qui t'intéresse
3. Présente-toi dans `#général`, on ne mord pas
→ *Un souci, une question ?* `#tickets`

**Carte `#règlement`** — *Six règles, et elles tiennent sur une carte.*
1. Respect — pas d'insulte, pas de moquerie, pas de harcèlement
2. Français — pour que tout le monde suive et que les modos puissent lire
✕ Pas de pub, pas de lien perso, même en message privé
✕ Pas de contenu sensible, pas de spoil
✕ Pas de spam, ni majuscules en rafale, ni message en boucle
♥ Respecte les modos — bénévoles, et leur décision ne se négocie pas en public
→ *Un rappel, puis une exclusion temporaire, puis un bannissement.*

---

### 💬 LA COMMUNAUTÉ — *teal* — réservée à `Membre`

| Salon | Rôle |
|---|---|
| `#général` | La discussion principale. |
| `#détente` | Hors-sujet, photos, mèmes, musique. |
| `#clips` | Les moments du live. Le meilleur de la semaine part sur TikTok. |
| `#suggestions` | Idées pour la chaîne et le serveur, avec vote intégré. |
| `#vocal-texte` | Le fil texte attaché aux vocaux (liens, images pendant une partie). |

**Carte `#général`** — *Le salon principal. Tout ce qui ne va nulle part ailleurs va ici.*
1. Une discussion à la fois — si un sujet s'emballe, on ouvre un fil
✕ Pas de mur de messages d'une ligne
♥ Les nouveaux sont les bienvenus — dis bonjour
→ *Hors-sujet* `#détente` · *Un clip* `#clips` · *Une idée* `#suggestions`

**Carte `#suggestions`** — *Une idée pour la chaîne ou le serveur ? Pose-la ici.*
1. Une idée par message — le bot ajoute les votes automatiquement
2. Dis **pourquoi**, pas seulement quoi
✕ Pas de « faites un stream sur X » sans un minimum d'argument
→ *Les idées retenues partent dans* `#annonces`

---

### 📺 LE DIRECT — *miel* — réservée à `Membre`

Le cœur de la chaîne : les lives et les matchs retransmis.

| Salon | Rôle |
|---|---|
| `#live` | Le bot annonce le démarrage du live, avec le titre et la miniature. |
| `#tribune` | Le chat pendant la diffusion d'un match. |
| `#programme` | Le calendrier : lives, matchs de Ligue 1, cartes MMA, grands rendez-vous. |
| `#résultats` | Le résumé d'après-match, posté par la régie. |
| 🔊 `Le Plateau` | **Salon de conférence.** Diffusion commentée : les intervenants parlent, la communauté écoute. |
| 🔊 `La Loge` | Vocal privé `Intervenant` + `Régie` : on se cale avant, on débriefe après. |

**Carte `Le Plateau`** — *Le vocal de diffusion. On regarde le match ensemble, commenté en direct.*
1. Le micro est aux intervenants — tout le monde écoute, les réactions passent en `#tribune`
✕ Pas de spoil du résultat — beaucoup regardent en différé
★ Demander le micro — `/micro`, la régie t'ouvre le son si le moment s'y prête
→ *Réagir* `#tribune` · *Le calendrier* `#programme` · *Les résumés* `#résultats`

**Carte `#tribune`** — *Le salon de réaction pendant la diffusion. Ça peut aller vite, c'est normal.*
1. Réagis librement — c'est l'endroit fait pour ça
✕ Pas de spoil si le match est diffusé en différé
✕ Pas d'insulte envers un joueur, un combattant ou un arbitre
→ *Parler au micro* `Le Plateau` · *Analyse à froid* `#résultats`

---

### 🎮 GAMING — *chêne* — réservée à `Membre`

| Salon | Rôle |
|---|---|
| `#jeux` | Discussion jeux, sorties, bons plans. |
| `#recherche-équipe` | Trouver des joueurs. Un message = une recherche. |
| 🔊 `➕ Créer un vocal` | **Le hub.** On s'y connecte, le bot crée un salon et t'y déplace. |
| 🔊 `Salon commun` | Un vocal permanent, pour que la catégorie ne soit jamais vide. |

Les salons créés à la demande portent le nom du jeu détecté, appartiennent à leur créateur
(renommer, limiter, verrouiller via `/vocal`) et **se suppriment une fois vides**. Fini les
douze vocaux fantômes qui donnent l'impression d'un serveur mort.

**Carte `#recherche-équipe`** — *Tu cherches des joueurs ? C'est ici, et nulle part ailleurs.*
1. Un message = une recherche — jeu, nombre de places, niveau, horaire
2. Préviens quand c'est complet — une réaction suffit
✕ Pas de relance toutes les dix minutes
→ *Discuter du jeu* `#jeux` · *Lancer un vocal* `➕ Créer un vocal`

---

### 🎟️ SUPPORT — *teal* — visible par `Membre`

| Salon | Rôle |
|---|---|
| `#tickets` | Un bouton, une catégorie de problème, et un salon privé s'ouvre avec le staff. |

Les tickets créent des salons privés `ticket-0001`, visibles du seul demandeur et du staff.
À la fermeture, la transcription part dans `#signalements` et le salon est supprimé.

**Carte `#tickets`** — *Un souci avec un membre, une question pour le staff, un problème technique ?*
1. Clique sur le bouton, choisis la catégorie, décris en quelques lignes
2. Un salon privé s'ouvre — seuls toi et le staff le voient
✕ N'écris pas en message privé à un modo : ça ne laisse aucune trace et ça se perd
→ *Rien d'urgent, juste une idée ?* `#suggestions`

---

### 🛠️ STAFF — *corail* — cachée, `Modération` et au-dessus

| Salon | Rôle |
|---|---|
| `#bureau` | La coordination, avec le panneau de commandes. |
| `#décisions` | Ce qui est acté, et pourquoi. La mémoire de l'équipe. |
| `#signalements` | Les tickets remontés et les transcriptions. |
| `#régie` | Préparer les annonces, caler Le Plateau, brouillons. |
| `#traces` | Journal automatique : chaque sanction, qui, quand, pourquoi. |
| `#mouvements` | Arrivées, départs, changements de pseudo. |
| `#messages` | Messages supprimés et édités, avec leur contenu d'origine. |
| 🔊 `Réunion` | Le vocal du staff. |

**Carte `#bureau`** — *La coordination de l'équipe. Les décisions se prennent ici, jamais en privé.*
| `/sanction` | Avertir, exclure, bannir. Motif obligatoire. |
| `/historique` | Le passé d'un membre : sanctions, notes, arrivée. |
| `/note` | Une note privée sur un membre, visible du seul staff. |
| `/annonce` | Publier au nom de la chaîne. Aperçu avant envoi. |
| `/plateau` | Ouvrir la diffusion : crée le vocal et distribue les micros. |
→ *Signalements* `#tickets` · *Journal* `#traces` · *Un doute : on en parle avant d'agir*

**Carte `#régie`** — *Tout ce qui sera publié passe d'abord ici.*
| `/annonce` | Rédiger, prévisualiser, programmer. |
| `/programme` | Ajouter un match ou un live au calendrier. |
| `/micro` | Donner ou retirer `Intervenant` pendant une diffusion. |
→ *Une annonce engage la chaîne : on la relit à deux.*

---

## 4. Les permissions

Trois principes, appliqués partout :

1. **`@everyone` ne voit que l'accueil.** Les cinq salons de la catégorie ACCUEIL, en lecture
   seule. Tout le reste demande le rôle `Membre`.
2. **`Membre` s'obtient en validant le règlement** — un bouton dans `#bienvenue`. C'est une
   seconde pour un humain, et ça arrête la quasi-totalité des robots publicitaires.
3. **Le staff voit tout, mais n'écrit pas partout.** Les salons de journal (`#traces`,
   `#mouvements`, `#messages`) sont en lecture seule même pour l'administration : un journal
   qu'on peut éditer ne vaut rien.

> **Point à trancher.** Ce portail d'entrée est le réglage par défaut que je propose. Il
> protège bien, mais il ajoute un clic avant de voir le serveur. Si tu préfères une entrée
> directe — tout le monde voit et écrit dans la communauté dès l'arrivée — c'est une ligne à
> changer dans la configuration, dis-le-moi.

Partout ailleurs : pas de mention `@everyone` ni `@here` sauf pour la régie, pas de fils créés
par les membres dans les salons d'annonce, pas d'envoi de fichiers dans les salons de texte
pur, historique des fils nettoyé automatiquement après trois jours d'inactivité.

---

## 5. Ce que le bot fait tourner

| Domaine | Fonctions |
|---|---|
| **Cartes** | Génération des images, pose et mise à jour en tête de salon, `/salon` pour la version texte. |
| **Annonces** | `/annonce` avec formulaire, aperçu, programmation, publication croisée, modification après coup. |
| **Modération** | `/sanction`, paliers automatiques, `/historique`, `/note`, anti-spam, filtre de liens et de mots, journal complet. |
| **Tickets** | Ouverture par bouton, salons privés, transcription, fermeture. |
| **Vocaux** | Salons à la demande, `/vocal`, suppression automatique. |
| **Diffusion** | `/plateau`, `/micro`, rôle `Intervenant` temporaire, annonce automatique. |
| **Live** | Détection du live Twitch, annonce dans `#live`, rôle `En direct`. |
| **Sondages** | `/sondage` — choix simple ou multiple, anonyme ou public, minuteur, résultats en direct. |
| **Jeux** | Quiz, pendu, duels, loterie. Le détail reste à cadrer avec toi. |
| **Progression** | XP, niveaux, rôles débloqués, classement. |

---

## 6. L'ordre de déploiement

Le script n'a pas le droit de se tromper d'ordre, sinon les permissions tombent dans le vide :

1. Les rôles, de haut en bas.
2. Les catégories, avec leurs permissions.
3. Les salons, qui héritent de leur catégorie puis appliquent leurs exceptions.
4. Les réglages du serveur : salon de règles, salon système, niveau de vérification.
5. Les cartes : génération des images, puis pose ou mise à jour.
6. Les commandes slash.

Chaque étape est **idempotente** : on retrouve l'existant par son identifiant stocké, on le
met à jour, et on ne crée que ce qui manque. Relancer le script dix fois donne le même serveur.

---

## 7. Ce qu'il me manque encore

1. **Les jeux** à mettre dans les rôles de centre d'intérêt et le nommage des vocaux.
2. **Le portail d'entrée** — on le garde ou on ouvre le serveur directement ?
3. **Les abonnés Twitch** — on branche la liaison Twitch pour leur donner un rôle et des
   salons à eux, ou on laisse ça pour plus tard ?
4. **Les jeux du bot** — lesquels t'intéressent vraiment ? Autant en faire trois bien faits
   que dix bâclés.
5. **Le nom exact du serveur** et son icône.
