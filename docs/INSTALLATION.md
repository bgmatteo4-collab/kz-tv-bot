# Installer et lancer Le Local

## Le plus simple : télécharger le place construit

Chaque poussée produit un fichier de place jouable. Onglet **Actions** du dépôt
→ dernière exécution réussie → section **Artifacts** → `LeLocal-place`.

Décompresse, double-clique sur `LeLocal.rbxlx`, appuie sur **Play**.

Le place n'est jamais versionné à la main : un fichier binaire committé diverge
du code en quelques jours, et personne ne s'en aperçoit avant que ce soit grave.

## Pour développer : Rojo

Rojo synchronise le code avec Studio en direct, sans écraser ce que tu
construis à la main dans l'éditeur.

### 1. Installer les outils

Les versions sont épinglées dans `aftman.toml`. Installe
[Aftman](https://github.com/LPGhatguy/aftman), puis :

```sh
aftman install
```

Aucun binaire n'est versionné dans le dépôt — Aftman s'en charge.

Installe aussi le **plugin Rojo** dans Roblox Studio (Plugins → Manage Plugins).

### 2. Synchroniser

```sh
rojo serve
```

Dans Studio : ouvre un place vide, onglet Rojo, **Connect**. Le code apparaît
dans `ReplicatedStorage.Partage`, `ServerScriptService.Serveur` et
`StarterPlayer.StarterPlayerScripts.Client`.

### 3. Jouer

Appuie sur **Play**. Le serveur bâtit le plateau, sa régie et le sas d'entrée à
partir des cotes réelles. Tu apparais dans le sas, face à la porte de service.

| Touche | Effet |
|---|---|
| **V** | Bascule première / troisième personne |
| **F3** | Affiche ou masque le panneau de diagnostic |

## Ce que la v0.1 doit te faire vérifier

Cette version ne contient aucune mécanique de jeu. Elle sert à répondre à cinq
questions chiffrées, listées dans [BACKLOG.md](BACKLOG.md) sous « À vérifier
dans le moteur ». Le panneau **F3** affiche les mesures.

1. **La hauteur de l'avatar.** Le panneau la donne en studs et en mètres, avec
   l'écart par rapport aux 5,20 studs attendus. Si l'écart dépasse 0,15 stud, la
   ligne affiche `À RÉVISER` : c'est le rapport `1 m = 3 studs` de toute la
   charte qui doit changer, dans `src/shared/Charte/Echelle.lua` et nulle part
   ailleurs.
2. **Les images par seconde.** Le plancher observé est retenu après trois
   secondes de chargement. L'objectif est 60, le plancher acceptable 30.
3. **La largeur des portes.** Passe la porte de service et celle de la régie.
   Si l'avatar accroche, c'est la cote qui doit bouger, pas l'échelle.
4. **La hauteur sous plafond.** Six mètres sur le plateau, trois dans la régie
   et le sas. En vue première personne, la régie doit sembler basse et le
   plateau immense.
5. **Le contraste.** Entre dans le plateau depuis le sas. Le basculement du
   clair vers la boîte noire est la décision artistique centrale du projet
   (cahier des charges §9.4). S'il ne se produit pas, c'est la charte qui est en
   cause, pas le décor.

## Vérifier le code sans Studio

```sh
find src -name '*.lua' -exec luau-compile --binary {} \; > /dev/null   # syntaxe
stylua --check src                                                     # format
rojo build --output LeLocal.rbxlx                                      # construction
```

Ces trois contrôles tournent aussi en intégration continue à chaque poussée.

**Selene** (linting) est configuré dans `selene.toml` mais n'est pas encore
branché à la CI : la génération de sa bibliothèque standard Roblox échoue
actuellement. En local, si elle aboutit chez toi :

```sh
selene generate-roblox-std && selene src
```

## Problèmes courants

**L'écran est noir en entrant sur le plateau.** C'est voulu, en partie : le
plateau est une boîte noire. Si rien n'est éclairé du tout, vérifie la sortie
console — le serveur avertit si `Lighting.Technology` ne vaut pas `Future`.

**Tu traverses les murs.** Studio a peut-être conservé un ancien décor. Ferme
sans enregistrer et rouvre un place vide.

**Rien n'apparaît.** Vérifie que Rojo est connecté et que la sortie affiche la
ligne `[Le Local] v0.1 bâtie en …`.
