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
| `cartes/gabarit.js` | Le dessin des cartes : la configuration entre, du HTML sort. |
| `cartes/generer.js` | Rend les 29 cartes en PNG. Demande Playwright. |
| `poser-cartes.js` | Publie les cartes dans les salons et les épingle. |
| `*.command` | Les lanceurs à double-cliquer sur Mac. |
| `ARCHITECTURE.md` | Le document de conception, en français. |

## Les cartes de salon

```sh
node cartes/generer.js     # dessine les 29 images dans cartes/rendu/
node poser-cartes.js       # les publie et les épingle
```

Les images ne sont pas versionnées : elles se régénèrent à partir de la configuration, et
les garder dans le dépôt y accumulerait 26 Mo à chaque correction de texte. Le rendu demande
Playwright (`npm install playwright`) ; la publication, elle, ne demande rien.

L'identifiant de chaque carte est retenu dans `etat.json` : au second passage, le message
existant est **modifié** au lieu d'être reposté. On corrige donc un texte sans que le salon
se remplisse de versions successives.

Le générateur refuse de livrer une carte dont le texte déborde du cadre, et dit laquelle
raccourcir. Au-delà de quatre règles, il bascule tout seul sur une mise en page à deux
colonnes — c'est ce qui permet au règlement d'en tenir six.

## L'ordre de déploiement

Les rôles d'abord, puis les catégories, puis les salons — sinon les permissions s'appliquent
à des rôles qui n'existent pas encore. Le script impose cet ordre, il n'y a rien à surveiller.

## Une manipulation manuelle, une seule

Après avoir invité le bot, va dans **Paramètres du serveur → Rôles** et fais glisser le rôle
`Kayzx TV` **tout en haut** de la liste. Un bot ne peut pas gérer un rôle situé au-dessus du
sien, et il ne peut pas se hisser lui-même.
