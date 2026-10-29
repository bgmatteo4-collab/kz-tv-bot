# Le Discord de Kayzx TV

Le bot et le serveur, faits maison. Rien n'est sous-traité à MEE6, Dyno ou un autre :
la modération, les sondages, les jeux et les salons sont à nous.

## Pour commencer, sur Mac

### 1. Récupérer les fichiers

Sur la page GitHub du dépôt : bouton vert **Code** → **Download ZIP**. Décompresse, et
ouvre le dossier `discord`.

### 2. Le premier lancement

macOS bloque par défaut les fichiers téléchargés d'internet. Donc **la première fois
seulement** : clic droit sur `CONFIGURER.command` → **Ouvrir** → puis **Ouvrir** dans la
fenêtre d'avertissement. Les fois suivantes, un double-clic suffit.

L'assistant demande le token du bot et l'identifiant du serveur, les vérifie auprès de
Discord, et les enregistre. Rien ne sort de l'ordinateur.

### 3. Construire le serveur

Double-clique sur **`DÉPLOYER LE SERVEUR.command`** (clic droit → Ouvrir, la première fois).
Il montre d'abord ce qu'il va faire et attend une confirmation. Puis il construit tout :
rôles, catégories, salons, permissions.

Si Node.js manque, les deux fichiers le disent et donnent le lien.

### Si tu préfères le Terminal

```sh
cd ~/Downloads/kz-tv-bot-*/discord
npm install
node configurer.js
node deployer.js --verifier
node deployer.js
```

## Où est le token

Dans `.env`, à côté de ces fichiers. Ce fichier n'est **jamais** envoyé sur GitHub : il est
ignoré par git. Si le token fuite un jour, retourne sur le portail Discord, onglet Bot,
**Reset Token**, puis relance `CONFIGURER.command`.

## Modifier le serveur

Tout est décrit dans **`serveur.config.js`** : les rôles, les catégories, les salons, leurs
permissions et le texte de chaque carte. On change une ligne, on relance le déploiement.

Le script est **rejouable**. Il retrouve ce qu'il a déjà créé grâce à `etat.json` et met à
jour au lieu de dupliquer. Renommer un salon à la main dans Discord ne le casse pas.

## Les fichiers

| | |
|---|---|
| `serveur.config.js` | La description du serveur. Le seul fichier à modifier. |
| `deployer.js` | Construit le serveur. `--verifier` montre sans rien faire. |
| `configurer.js` | L'assistant qui enregistre le token. |
| `cartes/` | Les gabarits d'images postées en tête de salon. |
| `*.command` | Les lanceurs à double-cliquer sur Mac. |
| `ARCHITECTURE.md` | Le document de conception, en français. |

## L'ordre de déploiement

Les rôles d'abord, puis les catégories, puis les salons — sinon les permissions s'appliquent
à des rôles qui n'existent pas encore. Le script impose cet ordre, il n'y a rien à surveiller.

## Une manipulation manuelle, une seule

Après avoir invité le bot, va dans **Paramètres du serveur → Rôles** et fais glisser le rôle
`Kayzx TV` **tout en haut** de la liste. Un bot ne peut pas gérer un rôle situé au-dessus du
sien, et il ne peut pas se hisser lui-même.
