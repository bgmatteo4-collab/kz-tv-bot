# Kayzx Live — le panel et les overlays

Un petit programme qui tourne sur ton PC. Tu pilotes depuis ton téléphone,
l'affichage se fait dans OBS. Pas de compte à créer, pas de serveur à louer.

## Démarrer

1. Double-clique sur `demarrer.bat` (Windows) ou lance `node serveur.js`.
2. Une page s'ouvre sur `http://localhost:8420` : c'est le tableau de bord.
3. Si Windows demande l'accès réseau pour Node.js, **accepte pour les réseaux privés**,
   sinon ton téléphone ne pourra pas joindre le PC.

## Le panel sur ton téléphone

Sur la page d'accueil, un QR code. Scanne-le avec ton téléphone, **connecté au même Wi-Fi
que le PC**. Ajoute la page à l'écran d'accueil : tu l'auras comme une appli.

L'adresse contient une clé. Ne la partage pas : qui l'a peut afficher ce qu'il veut à l'écran.
Si tu veux la changer, supprime `config.json` et relance.

## Dans OBS

Ajoute une **Source navigateur**, 1920 × 1080, avec :

- scène Just Chatting : `http://localhost:8420/overlay?chat=1`
- autres scènes : `http://localhost:8420/overlay`

Place-la **au-dessus** de ta vidéo d'habillage, en position 0, 0.

Sur la scène Just Chatting, le chat et les cartes restent dans la boîte de chat
de l'overlay (1420, 270, 392 × 650) : rien n'en dépasse. Sur les autres scènes,
les cartes s'empilent en haut à droite et il n'y a pas de chat.

## Ce que le panel sait faire

| Section | Ce que ça affiche |
|---|---|
| Chat | Montrer ou cacher le chat, le mettre en haut ou en bas, changer la taille et la hauteur |
| Message à l'écran | Un texte dans une carte papier, avec quatre messages tout prêts |
| Sondage | Un vrai sondage Twitch, ou un vote où le chat tape 1, 2, 3… |
| Prédiction | Une prédiction Twitch, avec les points misés et le résultat |
| Objectif | Une barre qui avance toute seule avec les follows et les abonnements |
| Minuteur | Un compte à rebours, avec pause et + 1 min |
| Compteur | Morts, victoires, ce que tu veux, avec − et + |
| Mini-jeux | Devine le nombre, le plus rapide, le pendu, tirage au sort |
| Mettre en avant | Un message du chat affiché en grand sur la cam, 12 s |
| Ambiance | Une jauge qui monte quand le chat s'emballe |

Les mini-jeux se jouent **dans le chat** : les viewers tapent un nombre, un mot ou une lettre.

## Twitch (facultatif)

Le chat marche **sans rien configurer** : il est lu en anonyme.

Les **vrais sondages, les prédictions et les follows en direct** demandent une autorisation.
Une seule fois :

1. Va sur `dev.twitch.tv/console/apps`, connecte-toi avec ton compte Twitch (pas de nouveau compte).
2. **Enregistrer une application**. Nom : ce que tu veux. 
   URL de redirection OAuth : `http://localhost:8420/retour`. Catégorie : Application Chat Bot.
3. Copie le **Client ID** et colle-le dans `config.json`, à la ligne `"clientId"`.
4. Relance le programme, puis sur la page d'accueil clique sur **Connecter mon compte Twitch**.

Le jeton reste dans `config.json`, sur ton PC. Ce fichier n'est jamais envoyé nulle part
et n'est pas suivi par Git. Ne le partage pas : il donne accès à ton compte.

Les jetons Twitch expirent au bout de quelques heures. Quand le voyant TWITCH du panel
passe au gris, reclique sur **Connecter mon compte Twitch**.

## Essayer sans être en live

`node serveur.js --demo` fait tourner un faux chat : des messages arrivent tout seuls,
les viewers votent aux sondages et jouent aux mini-jeux. De quoi tout régler tranquillement.

## Changer les réglages

Tout est dans `config.json`, créé au premier lancement :

- `chaine` : le nom de ta chaîne Twitch
- `clientId` et `token` : pour l'API Twitch (facultatif)
- `cle` : la clé du panel
- `bots` : les comptes dont les messages ne s'affichent pas dans l'overlay
