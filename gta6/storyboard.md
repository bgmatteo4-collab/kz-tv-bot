# Démo GTA 6 — storyboard

Test privé de Kayzx TV, jamais publié. Durée : **2 min 19**, 1920×1080, 60 i/s, son des trailers.

Abréviations : **T1** = trailer 1 (`assets/trailers/trailer-1.mp4`, 30 i/s), **T2** = trailer 2,
**EL** = Extended Look. Les timecodes sources viennent du découpage en plans (`assets/plans/`).

## Système visuel

- **Palette mesurée sur le logo VI officiel** : encre de nuit `#1E0032`, indigo `#3B1A7B`,
  violet `#715AC6`, magenta `#B835BA`, rose `#EB6289`, corail `#FC856D`, orange `#FF9A50`,
  ambre `#FFB14D`, crème `#FCE5D1`. Dégradé signature : violet → magenta → rose → orange (comme le « VI »).
- **Fil conducteur** : la *ligne de coucher de soleil*, un trait lumineux horizontal (dégradé
  rose → orange) au centre de l'écran. Chaque acte **commence et finit** sur cette ligne, sur fond
  encre de nuit : c'est ce qui permet de recoller les actes sans couture.
- **Cadre d'analyse** (façon showreel de Leon) : coins en équerre, `GTA VI — ANALYSE`,
  numéro d'acte `01 / 06`, timecode, nom de la technique en bas à gauche.
- **Typographie** : titres Inter Tight 800, mots clés en Instrument Serif italique, légendes et
  annotations en JetBrains Mono.
- **Images** : format cinéma, grain léger, flou de mouvement, plans lents ralentis à 50 % pour l'analyse.

## Bande-son (montage audio)

| Final | Source | Contenu |
|---|---|---|
| 0:00.0 – 0:17.1 | T1 0:00.2 → 0:17.3 | Ouverture du trailer 1 (voix de Lucia, montée musicale) |
| 0:17.1 – 1:04.8 | T1 0:17.3 → 1:05.0 | Chanson du trailer 1, montage Vice City (fondu de sortie 0,8 s) |
| 1:04.8 – 2:05.6 | T2 1:11.24 → 2:12.04 (60,8 s) | Chanson du trailer 2, depuis le temps fort qui suit « Rockstar Games presents » |
| 2:05.6 – 2:19.0 | T2 2:33.3 → 2:46.7 | Fin du trailer 2 : coucher de soleil, logo VI, logo Rockstar |

Raccords audio (dans `demo/assembler.js`, tableau `BANDE_SON`) : T1 d'un seul tenant de 0:00.2 à 1:05.0
avec fondu de sortie 0,8 s ; entrée de la chanson du T2 avec un fondu de 20 ms (on garde l'attaque),
sortie 0,12 s ; fin du T2 avec fondu d'entrée 0,25 s et de sortie 0,4 s.

**Début de la chanson du trailer 2 (analyse d'énergie, piste `assets/audio/trailer-2.wav`)** :
niveau lissé sur 0,5 s et flux spectral (fenêtres de 64 ms, pas de 10 ms) entre 1:04 et 1:20.
- Avant 1:06 : dialogue seul, niveau ≈ −24 dB sous le maximum.
- 1:07.0 : premier impact (niveau −3,6 dB), puis musique continue dès 1:08.0 (≈ −3 à −5 dB).
- Attaques régulières à 1:08.93, 1:09.62, 1:09.85, 1:10.31, 1:10.78… : période 0,46 s, soit
  **≈ 130 BPM** (autocorrélation du flux sur 1:10 – 1:20).
- Le carton « Rockstar Games presents » (plan #23, 1:09.67 – 1:11.23) passe sur la musique déjà
  lancée ; la coupe suivante (1:11.23 – 1:11.27) tombe sur un temps de la grille (1:11.24).
- Point retenu : **1:11.24** (71,24 s), sur la coupe et sur le temps fort. Si l'on veut l'impact
  d'ouverture plutôt que la reprise après le carton, l'autre candidat est 1:07.0.

## Les six actes

### Acte 1 — Carte postale (0:00.0 – 0:17.1)
- 0:00 – 0:04 : noir encre de nuit, la ligne de coucher de soleil s'allume au centre.
- 0:04 – 0:10 : la carte postale « Visit Leonida » (`logo/visit-leonida.svg`) arrive en 3D et se
  retourne ; sa photo est un plan vivant : T1 #3 (0:02.7 – 0:05.0, autoroute au coucher du soleil).
- 0:10 – 0:14 : trois autres cartes s'éventaillent : T1 #9 (plage aérienne, 0:11.3 – 0:17.3),
  T2 #3 (Leonida Keys, 0:06.1 – 0:08.1), une capture officielle de `Places/Vice City`.
- 0:14 – 0:17.1 : les cartes se rangent, la ligne se transforme en logo : le calque
  « Grand Theft Auto » glisse, le « VI » tombe en place avec un reflet chromé.

### Acte 2 — Bienvenue à Leonida (0:17.1 – 0:44.0)
La ligne devient une **route stylisée** (pas une carte officielle) qui relie six repères.
Survol lent ; chaque région s'allume avec son nom et un cadre flottant (≈ 4 s chacune) :
1. **Vice City** — T1 #25 (vue aérienne de nuit, 0:31.0 – 0:32.6), T1 #26 (Ocean Drive, 0:32.6 – 0:34.1)
2. **Leonida Keys** — T1 #28 (pont, 0:35.7 – 0:37.4)
3. **Grassrivers** — T1 #14 (marais à l'aube, 0:19.2 – 0:20.7), T1 #15 (flamants, 0:20.7 – 0:21.7)
4. **Port Gellhorn** — captures officielles `Places/Port Gellhorn` (effet Ken Burns)
5. **Ambrosia** — captures officielles `Places/Ambrosia`
6. **Mount Kalaga National Park** — captures officielles `Places/Mount Kalaga National Park`
Fin : dézoom, les six régions visibles ensemble, retour à la ligne.

### Acte 3 — Lucia et Jason (0:44.0 – 1:04.8)
- La ligne coupe l'écran en deux : Lucia à gauche, Jason à droite.
- Fiches façon dossier de police (portraits `People/Lucia Caminos`, `People/Jason Duval`), nom en
  grand, description officielle courte (site rockstargames.com/VI).
- Plans du duo dans des panneaux : T1 #7 (Lucia en prison, 0:09.6 – 0:10.9), T1 #50 (Jason au
  volant, 1:01.7 – 1:02.5), T1 #51 (Lucia passagère, 1:02.5 – 1:03.6), T1 #58 (braquage, 1:08.7 – 1:10.3).
- Final : plan lent T1 #61 (motel, 1:12.8 – 1:16.5) en plein écran, sous-titre « Bonnie & Clyde ».

### Acte 4 — Le bijou technique (1:04.8 – 1:44.0)
Six plans lents, ralentis à 50 %, ≈ 6 s chacun, dans le cadre d'analyse (`ANALYSE 01 / 06`…).
Annotations par lignes de repère et loupe ; uniquement des **observations visibles** :
1. **Lumière** — T2 #97 (Vice City au coucher du soleil, 2:33.3 – 2:36.5) : soleil rasant, rayons.
2. **Eau** — T1 #17 (bateau, 0:23.3 – 0:24.8) : sillage, écume, reflets.
3. **Foule** — T1 #16 (plage bondée, 0:21.7 – 0:23.3) : des centaines de passants, tous différents.
4. **Visages** — T2 #21 (Lucia, 1:03.1 – 1:06.2) : peau, cheveux, regard.
5. **Faune** — T1 #15 (flamants, 0:20.7 – 0:21.7) : nuée, plumes, reflets.
6. **Vrai gameplay** — EL 8:24 – 8:40 (conduite en ville, minicarte visible) : « ce n'est pas une cinématique ».

### Acte 5 — GTA 6 dans la vraie vie (1:44.0 – 2:05.6)
- Pont entre le jeu et le réel : l'enseigne VICE du jeu (T1 #30, 0:39.8 – 0:41.3) se transforme en
  enseigne « Welcome to Vice City » recréée en motion design sur le toit du Kaseya Center (allumée le 1er octobre 2026).
- Le Miami Heat devient Vice City : « A Night in Vice City », **18 novembre 2026 contre les Bucks**,
  maillot et parquet spéciaux (parquet recréé en graphisme, aux couleurs de la palette).
- Miami Beach : campagne Rockstar sur les équipements de plage du **15 octobre au 31 décembre 2026**.
- Téléphones 3D qui diffusent les plans « réseaux sociaux » du trailer 1 (T1 #31 à #35).
- Sources : ESPN, Sports Illustrated, Sole Retriever, Techloy (voir la conversation).

### Acte 6 — Compte à rebours (2:05.6 – 2:19.0)
- 2:05.6 – 2:10 : chiffres géants en points LED : **19 . 11 . 2026**, puis « PS5 · Xbox Series X|S ».
- 2:10 – 2:19 : l'animation officielle du logo VI (T2 #98, 2:36.5 – 2:44.7) dans le cadre, la
  ligne de coucher de soleil se referme dessous ; petite signature « Kayzx TV » au dernier temps.
