# KZ Stream Simulator

Un simulateur de streaming pour Roblox, avec de la vraie gestion : on monte son
setup physiquement, on compose ses émissions, et on fait grandir une entreprise
de contenu — de la chambre chez ses parents jusqu'au plateau de télévision.

La conception complète est dans **[docs/GDD.md](docs/GDD.md)**.

---

## Lancer le projet

### Le plus simple : aucune installation

Télécharge **`KZStreamSimulator.rbxlx`** à la racine du dépôt et double-clique
dessus. Roblox Studio s'ouvre avec le projet complet, appuie sur **Play**.

Le guide détaillé, avec les captures d'étapes et les erreurs fréquentes, est
dans **[docs/INSTALLATION.md](docs/INSTALLATION.md)**.

### Pour travailler en continu : Rojo

Rojo synchronise le code avec Studio en direct, sans perdre le décor que tu as
construit. C'est indispensable à terme, mais ça peut attendre le premier test.

#### 1. Installer Rojo

Via [Aftman](https://github.com/LPGhatguy/aftman) (recommandé) ou directement :

```sh
cargo install rojo
# ou : télécharger le binaire depuis https://github.com/rojo-rbx/rojo/releases
```

Installe aussi le **plugin Rojo** dans Roblox Studio (menu Plugins → Manage
Plugins, ou depuis le site de Rojo).

#### 2. Synchroniser

```sh
git clone <ce-dépôt>
cd kz-tv-bot
rojo serve
```

Dans Studio : ouvre un place vide, onglet Rojo, **Connect**. Le code apparaît
dans `ReplicatedStorage.Shared`, `ServerScriptService.Server` et
`StarterPlayer.StarterPlayerScripts.Client`.

#### 3. Jouer

Appuie sur **Play**. Le serveur construit une chambre de test en primitives
(`DevRoom`), l'ordinateur démarre tout seul, et KZ OS s'affiche sur la dalle du
moniteur. Approche-toi de l'écran pour l'allumer, clique dessus pour manipuler
les fenêtres.

> Le décor est volontairement moche : il est généré par code pour que tout soit
> jouable sans le moindre asset. Quand tu construiras la vraie chambre dans
> Studio, pose simplement le tag `ComputerScreen` sur la dalle de ton moniteur
> et retire l'appel à `DevRoom.build()` dans `src/server/init.server.lua`.

---

## Organisation du code

```
src/
├── shared/              répliqué : tout ce que le client et le serveur partagent
│   ├── Lib/             briques génériques (Signal, Trove, Create)
│   ├── OS/              KZ OS : thème, fenêtres, barre des tâches, apps
│   │   └── Apps/        une app = un module, déclaré dans AppRegistry
│   ├── Config/          catalogues de données (matériel...)
│   ├── Content/         contenu écrit (mails...)
│   └── Net.lua          les deux tuyaux client/serveur
├── server/              autorité : état, règles, validation
│   └── Services/
└── client/              affichage et entrées
    └── Computer/        projection de l'OS sur une dalle 3D
```

## Règles à respecter en contribuant

1. **Le serveur fait autorité.** Le client envoie des intentions, jamais des
   résultats.
2. **Aucune couleur, marge ou durée d'animation en dur** ailleurs que dans
   `src/shared/OS/Theme.lua`.
3. **Le contenu est une donnée.** Un nouveau matériel = une entrée dans
   `Config/Devices.lua`. Un nouveau mail = une entrée dans `Content/Emails.lua`.
   Pas de logique à écrire.
4. **Zéro HUD flottant.** Toute information doit vivre sur un écran, un objet ou
   l'avatar.

## Vérifier le code sans Studio

Le dépôt n'a pas de dépendance, mais la syntaxe se contrôle avec le compilateur
Luau officiel :

```sh
find src -name '*.lua' -exec luau-compile --binary {} \; > /dev/null
```

`selene.toml` est prêt si tu veux ajouter [Selene](https://kampfkarren.github.io/selene/)
pour le linting.
