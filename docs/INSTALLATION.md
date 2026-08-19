# Installer et lancer KZ Stream Simulator

Deux méthodes. Commence par la première : elle ne demande **aucune
installation**.

---

# Méthode 1 — Le fichier prêt à l'emploi (recommandée pour tester)

## Ce qu'il te faut

Roblox Studio. C'est tout.

## Étape 1 — Récupérer le fichier

Sur la page GitHub du dépôt, branche `claude/salut-2e2a43`, clique sur le
fichier **`KZStreamSimulator.rbxlx`**, puis sur le bouton **Download raw file**
(l'icône de flèche vers le bas, en haut à droite de l'aperçu).

GitHub va peut-être afficher « This file is too large to display » ou un mur de
XML : c'est normal, c'est un fichier de place Roblox. Ne le copie-colle pas,
télécharge-le.

## Étape 2 — L'ouvrir

Double-clique sur le fichier téléchargé. Roblox Studio s'ouvre avec le projet
complet dedans.

Si le double-clic ne fonctionne pas : ouvre Studio, puis **Fichier → Ouvrir
depuis le fichier** et sélectionne `KZStreamSimulator.rbxlx`.

## Étape 3 — Jouer

Appuie sur **Play** (le bouton ▶ en haut).

Tu apparais dans une chambre grise en primitives. **Marche vers le bureau.** À
environ 14 studs, l'écran s'allume et le BIOS démarre.

## Comment vérifier que tout est bien là

Dans le panneau **Explorer** à droite, tu dois voir :

```
ReplicatedStorage
  └── Shared            (Config, Content, Lib, OS, Net)
ServerScriptService
  └── Server            (Services, DevRoom)
StarterPlayer
  └── StarterPlayerScripts
        └── Client      (Computer)
```

Si l'un des trois manque, le fichier a été mal téléchargé : recommence
l'étape 1.

## Pour recevoir mes mises à jour

Retélécharge le fichier et rouvre-le. Attention : **tu perds ce que tu as
construit dans Studio.** Tant qu'on est en phase de test c'est sans importance,
mais dès que tu commenceras à construire le vrai décor, passe à la méthode 2.

---

# Méthode 2 — Rojo (pour travailler pour de vrai)

Rojo synchronise le dossier de code avec Studio **en direct** : je pousse une
modification, tu fais `git pull`, et Studio se met à jour tout seul sans que tu
perdes ton décor. C'est indispensable à terme, mais ça peut attendre.

## Étape 1 — Télécharger Rojo

Va sur <https://github.com/rojo-rbx/rojo/releases>.

Dans la section **Assets** de la version la plus récente, télécharge :

- **`rojo-<version>-win64.zip`** si tu es sur Windows
- `rojo-<version>-macos.zip` si tu es sur Mac

Dézippe l'archive. Elle contient un seul fichier : `rojo.exe`.

## Étape 2 — Le mettre au bon endroit

Place `rojo.exe` **directement dans le dossier du projet**, à côté de
`default.project.json` :

```
kz-tv-bot\
├── rojo.exe              ← ici
├── default.project.json
├── KZStreamSimulator.rbxlx
├── README.md
├── docs\
├── src\
└── tools\
```

> ⚠️ Ne le mets **pas** dans `AppData\Local\Roblox`. Ce dossier sert aux
> plugins de Studio, pas aux programmes. Rojo s'occupe tout seul d'y installer
> son plugin à l'étape 4.

## Étape 3 — Ouvrir une console dans ce dossier

Dans l'explorateur Windows, ouvre le dossier du projet. Clique dans la **barre
d'adresse** en haut (là où s'affiche le chemin), efface ce qu'il y a, tape :

```
powershell
```

et appuie sur Entrée. Une fenêtre bleue s'ouvre, déjà positionnée dans le bon
dossier.

Pour vérifier que tu es au bon endroit, tape :

```powershell
dir
```

Tu dois voir `rojo.exe` et `default.project.json` dans la liste. Si ce n'est pas
le cas, tu n'es pas dans le bon dossier.

## Étape 4 — Installer le plugin Studio

```powershell
.\rojo.exe plugin install
```

Le `.\` au début est **obligatoire** sous PowerShell.

Si Windows affiche « Windows a protégé votre ordinateur » : clique sur
**Informations complémentaires**, puis **Exécuter quand même**. C'est le
comportement normal pour un programme téléchargé sur GitHub.

**Ferme Roblox Studio et rouvre-le** après cette commande, sinon le plugin
n'apparaîtra pas.

## Étape 5 — Démarrer la synchronisation

```powershell
.\rojo.exe serve
```

Tu dois voir un message du type `Rojo server listening on port 34872`.
**Laisse cette fenêtre ouverte** : si tu la fermes, la synchronisation s'arrête.

## Étape 6 — Connecter Studio

Dans Studio :

1. Ouvre un place vide (un Baseplate fait l'affaire).
2. Onglet **Plugins** dans le ruban du haut.
3. Clique sur l'icône **Rojo**.
4. Dans le panneau qui s'ouvre, clique sur **Connect**.

Le code apparaît immédiatement dans l'Explorer. Appuie sur **Play**.

---

# Problèmes fréquents

| Symptôme | Cause et solution |
|---|---|
| `rojo n'est pas reconnu` | Il manque le `.\` devant, ou tu n'es pas dans le bon dossier. Fais `dir` pour vérifier que `rojo.exe` est bien listé. |
| L'onglet Rojo n'apparaît pas dans Studio | Studio était ouvert pendant `plugin install`. Ferme-le complètement et rouvre-le. |
| Studio dit « Could not connect » | La fenêtre PowerShell avec `rojo serve` a été fermée. Relance-la. |
| Le code n'apparaît pas après Connect | `rojo serve` a été lancé depuis un autre dossier que celui contenant `default.project.json`. |
| L'écran du jeu reste noir | Tu es trop loin. Avance vers le bureau. La dalle s'allume à environ 14 studs. |
| Rien ne réagit au clic sur l'écran | Clique une fois dans le vide pour libérer le curseur, puis vise l'écran. |
| Une erreur rouge au lancement | Ouvre la console avec **F9**, copie le message et envoie-le-moi. |

---

# Pour les curieux : d'où vient le fichier `.rbxlx` ?

Il est généré par `tools/build_place.py`, qui lit `src/` et fabrique le XML du
place en appliquant les mêmes conventions de nommage que Rojo. Les deux méthodes
produisent donc exactement la même arborescence.

Pour le régénérer soi-même (nécessite Python 3) :

```sh
python3 tools/build_place.py
```
