# Kayzx Live

Tu pilotes ton stream depuis ton téléphone, l'affichage se fait dans OBS.
Rien à payer, aucun compte à créer, rien qui sorte de ton PC.

## La toute première fois

**1. Installe Node.js** (c'est le moteur, gratuit, deux minutes)

Va sur **nodejs.org/fr**, clique sur le gros bouton vert **LTS**, et installe en
cliquant Suivant partout. Si tu lances `demarrer.bat` sans l'avoir, il te le dira
et ouvrira la page tout seul.

**2. Lance `demarrer.bat`**

Une fenêtre noire s'ouvre (laisse-la), et ton navigateur affiche la page d'accueil
avec trois étapes numérotées. Tout est expliqué là, avec des boutons pour copier
les adresses. Laisse les deux ouverts pendant le live.

C'est tout. Les étapes ci-dessous sont celles de cette page, si tu préfères les lire ici.

## Étape 1 — ton panel sur le téléphone

Sur la page d'accueil il y a un QR code. Vise-le avec l'appareil photo de ton
téléphone, touche le lien, puis dans le menu du navigateur choisis
**« Sur l'écran d'accueil »** : tu l'auras comme une appli.

Ton téléphone doit être sur le **même Wi-Fi** que le PC. Si Windows demande
l'autorisation réseau pour Node.js, accepte pour les réseaux privés.

L'adresse contient une clé. Ne la partage pas : qui l'a peut afficher ce qu'il
veut sur ton stream.

## Étape 2 — deux sources dans OBS

Sur chaque scène : **+** sous Sources, puis **Source navigateur**.
Largeur **1920**, hauteur **1080**, et dans « URL » :

- scène Just Chatting : `http://localhost:8420/overlay?chat=1`
- autres scènes : `http://localhost:8420/overlay`

Mets la source **tout en haut** de la liste, en position 0, 0.

Sur la scène Just Chatting, le chat se pose dans la boîte de ton habillage et
n'en dépasse jamais. Sur les autres, les cartes s'empilent en haut à droite.

## Étape 3 — Twitch

**Le chat marche tout seul**, sans rien configurer.

Les **sondages, prédictions et follows** demandent une autorisation Twitch.
La page d'accueil explique les huit clics, une seule fois. Après ça, un bouton
« Connecter mon compte Twitch » suffit.

Les autorisations Twitch expirent au bout de quelques heures : si le voyant
TWITCH du panel passe au gris pendant un long live, reclique sur ce bouton.

## Essayer sans être en live

Lance **`demarrer-demo.bat`** : un faux chat se met à parler, les viewers votent
aux sondages et jouent aux mini-jeux. De quoi tout régler tranquillement.

## Ce que tu peux afficher

| Section du panel | À l'écran |
|---|---|
| Chat | Montrer, cacher, déplacer en haut ou en bas, changer la taille |
| Message | Un texte dans une carte papier, avec quatre messages tout prêts |
| Sondage | Un vrai sondage Twitch, ou un vote où le chat tape 1, 2, 3… |
| Prédiction | Une prédiction Twitch, avec les points misés et le résultat |
| Objectif | Une barre qui avance toute seule avec les follows et les abonnements |
| Minuteur | Un compte à rebours, avec pause et + 1 min |
| Compteur | Morts, victoires, ce que tu veux |
| Mini-jeux | Devine le nombre, le plus rapide, le pendu, tirage au sort |
| Mettre en avant | Un message du chat en grand sur la cam, 12 s |
| Ambiance | Une jauge qui monte quand le chat s'emballe |

Les mini-jeux se jouent **dans le chat** : les viewers tapent un nombre, un mot
ou une lettre, et l'écran suit tout seul.

## Si ça ne marche pas

**La fenêtre noire se ferme tout de suite** → Node.js n'est pas installé. Reprends le point 1.

**Le téléphone n'affiche rien** → il n'est pas sur le même Wi-Fi, ou Windows bloque.
Cherche « Pare-feu Windows », autorise Node.js sur les réseaux privés.

**OBS affiche une page blanche** → la fenêtre noire s'est fermée. Relance `demarrer.bat`,
puis dans OBS, clic droit sur la source → Actualiser.

**Le chat reste vide** → vérifie le nom de ta chaîne dans `config.json`, ligne `"chaine"`.

**Le panel dit « Clé incorrecte »** → rescanne le QR code sur le PC, la clé a changé.
