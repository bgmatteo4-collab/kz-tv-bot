# Faire tourner le bot en permanence

Le bot doit rester allumé : c'est lui qui répond aux commandes, ouvre les tickets, crée les
vocaux et tient les journaux. Ces notes décrivent l'installation sur **bot-hosting.net**,
offre gratuite.

---

## Ce qu'il faut savoir avant

L'offre gratuite donne **256 Mo de mémoire, 25 % d'un processeur et 512 Mo de disque**, pour
un seul déploiement. C'est assez : le bot est léger, et ses caches sont volontairement bornés
pour tenir dans cette enveloppe.

Elle impose surtout un **renouvellement manuel tous les 4 jours**. Passé ce délai il reste
trois jours de grâce, puis le serveur est supprimé — une sauvegarde est conservée un jour.
C'est le point faible de cette solution : un oubli d'une semaine et tout est perdu côté
hébergeur. D'où la copie de secours décrite plus bas.

Aucune carte bancaire. On se connecte avec son compte **Discord ou GitHub**, dont l'adresse
mail doit être vérifiée.

---

## Installation

### 1. Le compte et le déploiement

Sur **bot-hosting.net**, se connecter avec Discord, puis créer un déploiement avec le
moteur **Node.js**.

### 2. Le code

Onglet **Settings → GitHub**, relier le dépôt :

```
bgmatteo4-collab/kz-tv-bot
```

sur la branche de travail. Le panneau clone le dépôt à chaque démarrage, donc une
modification poussée sur GitHub arrive sur le bot au redémarrage suivant.

> Ne jamais téléverser `node_modules` : la commande de démarrage installe les dépendances.

### 3. La commande de démarrage

Onglet **Settings → Startup**, champ **Start command** :

```sh
cd discord && npm install --omit=dev && node bot/index.js
```

Le `cd discord` est indispensable : le dépôt contient aussi le jeu Roblox, et le bot vit
dans son propre dossier.

### 4. Le token

Onglet **Environment**, ajouter une variable marquée **secret** :

| Nom | Valeur |
|---|---|
| `DISCORD_TOKEN` | le token du bot |

C'est le bon endroit : le panneau le masque, et il ne traîne dans aucun fichier du dépôt.
L'identifiant du serveur, lui, est déjà dans `serveur.config.js` — rien à ajouter.

### 5. Les intents

Sur le portail Discord, onglet **Bot**, les trois interrupteurs doivent être allumés :
**Server Members**, **Message Content**, **Presence**. Sans eux le bot démarre mais reste à
moitié muet.

### 6. Démarrer

Bouton de démarrage, puis onglet **Console**. On doit lire :

```
  Kayzx Bot est en ligne.
  Menus posés, sondages surveillés, sauvegarde en place.
```

---

## Le renouvellement, tous les 4 jours

Page **Billing** du panneau → bouton vert **Renew free plan** → attendre la vérification →
**Renew for 4 days**.

Il n'existe pas de commande ni d'interface pour automatiser ce geste : il faut le faire à la
main. Mets-toi un rappel récurrent, c'est la seule parade.

---

## Si l'hébergeur perd les fichiers

L'hébergeur ne garantit pas que les fichiers écrits en cours de route survivent à un
redémarrage, et le serveur gratuit est supprimé après la période de grâce. Or
`bot/donnees.json` contient l'historique des sanctions, les notes du staff, l'expérience et
le calendrier.

Le bot s'en protège tout seul : **toutes les six heures, il envoie une copie de ses données
dans le salon des traces**, en pièce jointe d'un message unique qu'il modifie au lieu d'en
empiler. Au démarrage, s'il ne trouve aucune donnée en local, il va rechercher cette pièce
jointe et repart de là.

Discord sert donc de disque de secours. Une seule consigne : **ne pas supprimer ce message**
dans le salon des traces. Il est reconnaissable, son titre est « Sauvegarde des données ».

---

## Mettre à jour le bot

1. Pousser les modifications sur GitHub.
2. Redémarrer le déploiement depuis le panneau.

Si les commandes ont changé de nom ou d'options, relancer une fois, depuis une machine qui a
le token :

```sh
node bot/enregistrer-commandes.js
```

---

## Si ça ne démarre pas

| Dans la console | Ce que c'est |
|---|---|
| `DISCORD_TOKEN absent` | La variable d'environnement n'est pas posée, ou mal orthographiée. |
| `etat.json est introuvable` | Le `cd discord` manque dans la commande de démarrage. |
| `Used disallowed intents` | Les trois interrupteurs d'intents ne sont pas tous allumés. |
| Redémarrages en boucle | Mémoire dépassée. Vérifier qu'aucune autre application ne partage le déploiement. |
