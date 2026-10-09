# Démo GTA 6 — mode d'emploi des équipes

Référence du contenu : `gta6/storyboard.md`. Niveau visé : `docs/references-motion.md`.
Exemple complet qui utilise toutes les briques : `acte-0/index.html` (6 s, à lire en premier).
Chaque `acte-N/index.html` existe déjà sous forme de squelette qui respecte le contrat : on le remplit.

## Le contrat (à respecter à la lettre)

| Acte | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Durée (s) | 17,1 | 26,9 | 20,8 | 39,2 | 21,6 | 13,4 |
| Début global | 0:00.0 | 0:17.1 | 0:44.0 | 1:04.8 | 1:44.0 | 2:05.6 |

- Une page `acte-N/index.html` (1920×1080) qui appelle `demarrer({ acte: N, preparer, render })`
  (`lib/acte.js`) ; celui-ci expose `window.__render(t)` (async), `__ready`, `__duration`.
- **Raccord** : à `t = 0` et `t = durée`, l'image est EXACTEMENT `dessinerRaccord()` : fond `#1E0032`
  + ligne de référence `LIGNE` (centrée, y = 540). Rien d'autre : le cadre et l'habillage s'effacent
  seuls aux deux bouts. Vérification : `render.js --acte N --verifier` doit afficher `PSNR inf` deux fois.
- Chaque image est une **fonction pure de t** : pas de `Math.random`, `Date.now`, `requestAnimationFrame`,
  `THREE.Clock`, ni d'état accumulé d'une image à l'autre. Hasard : `hash`, `h2`, `noise1` (core.js).
- Une équipe ne touche qu'à son dossier `acte-N/`. Un besoin dans `lib/` → le signaler (4 équipes en dépendent).

## Commandes (depuis la racine du dépôt)

```sh
export NODE_PATH=$(npm root -g)                           # Playwright est installé globalement
node gta6/demo/render.js --serveur                        # aperçu : http://127.0.0.1:8060/demo/acte-N/index.html?dev
node gta6/demo/render.js --acte N --stills 1.5,4,9        # PNG dans gta6/out/stills/acte-N/
node gta6/demo/render.js --acte N --verifier              # contrôle des raccords t = 0 et t = durée
node gta6/demo/render.js --acte N --blur 1 --workers 1    # brouillon rapide → gta6/out/acte-N.mp4
node gta6/demo/render.js --acte N                         # rendu final (flou de mouvement ×4, grain)
node gta6/demo/render.js --acte N --from 4 --to 9         # un passage → gta6/out/acte-N_4-9.mp4
node gta6/demo/assembler.js                               # film complet + copie < 30 Mo (actes manquants = raccord fixe)
node gta6/demo/extraire.js [--seul t1-03]                 # (ré)extraction des plans en JPEG
```

Aperçu : `?dev` (barre de lecture, Espace, ←/→ 1 s, Maj+←/→ 1 image), `?t=12.5` (image fixe), `?loop`.

## Les briques (`lib/`, modules ES)

**core.js** — `W, H, FPS (60), ACTES, clamp, lerp, prog, bump, tw(t, t0, d, E.x), fenetre(t, t0, t1, a, b)`,
courbes `E.out` (arrivée, par défaut), `E.inOut` (déplacement), `E.in` (sortie), `E.outBack`, `E.spring` ;
`hash, h2, noise1, mulberry` ; `rgb, mix, rgba` ; `split(el, 'words'|'letters')` + `slideWords()` (titres
dévoilés par masque), `rise()`, `scramble()`, `typeOn()`, `compteur()` ; `setText`, `setStyle` (n'écrivent que
si ça change) ; `timecode(tGlobal)` ; `chargerImage(url)`.

**tokens.css** — palette en variables (`--encre --indigo --violet --magenta --rose --corail --orange --ambre
--creme`, `--degrade-vi`, `--degrade-ligne`, `--degrade-ciel`), polices (`--sans` Inter Tight, `--serif`
Instrument Serif, `--mono` JetBrains Mono), classes `.titre`, `.titre em`, `.mono`, `.legende`,
`.degrade-texte`, `.abs`, `.fill`, `.scene/.on`.

**raccord.js** — `dessinerRaccord(ctx)`, `dessinerFond(ctx)`, `dessinerLigne(ctx, etat)`, `ligne({...})`,
`interpoler(a, b, p)`, `LIGNE` (référence : x 960, y 540, longueur 1240, épaisseur 2, intensité 1, halo 1,
angle 0, portion `de` 0 → `a` 1). Animer la ligne = partir de `LIGNE`, la transformer, y revenir exactement.

**footage.js** — `await plan(id, { vitesse, decalage, fondu })` puis `await p.dessiner(ctx, tl, boite)`
(`tl` = secondes depuis le début du plan ; `boite` : `x y w h cadrage('cover'|'contain') focale zoom decale
rayon opacite filtre masque`). `p.duree` = durée de lecture. `photo(url)` pour les captures (même
`dessiner`), `kenBurns(tl, d, a, b)`. Identifiants des plans : `clips.json` (champ `contenu` : ce qu'on voit
et les bornes utiles, ex. la plage de `t1-09` commence 1,3 s après le début).

**cadre.js** — `creerCadre(stage, { acte, techniques: [[t, 'Lumière · soleil rasant'], …], compteurs })`
puis `cadre.maj(t, { clair })`. Timecode global calculé tout seul.

**habillage.js** — `creerHabillage(stage, { duree, vignette, bandes })` puis `hab.maj(t, {...})` ;
`BANDES_239` (bandes 2,39:1), `presence(t, duree, bord)`.

**trois.js** — `THREE` (r160, local), `creerScene3D(stage, { z, fov, distance })` → `{ scene, camera,
rendre(), visible(b) }`, `texturePlan(planOuPhoto, w, h)` → `await tex.maj(tl)` pour une texture vidéo.

Médias : `/assets/captures/screenshots/Places/<Région>/…jpg`, `/assets/captures/screenshots/People/<Nom>/…`,
`/assets/logo/…` (chemins absolus : le serveur est enraciné sur `gta6/`).

## Mesures (machine 4 processeurs, page acte-0)

| Contenu de l'image | `__render` | capture PNG |
|---|---|---|
| raccord seul | 3 ms | 130 ms |
| plan plein cadre + texte | 7 ms | 150 – 270 ms |
| plan + carte Three.js texturée + texte | 40 ms | 340 ms |

Rendu de 3 s d'acte-0 avec flou ×4 et 3 navigateurs : 68 s, soit ≈ 0,4 s par image finale.
Ordre de grandeur pour un acte de 30 s : 12 min en final, 3 min avec `--blur 1`.
WebGL : WebGL 2 par SwiftShader (processeur), vérifié. Repli si une scène 3D est trop lourde : CSS 3D
(`perspective` + `rotateY` sur un `<div>` qui contient un `<canvas>` de footage).

## Pièges

- **Toujours `await`** `p.dessiner()`, `tex.maj()`, etc. dans `render(t)` : sinon l'image est capturée vide.
- **Pas de grain dans la page** : `render.js` l'ajoute avec ffmpeg (`--grain 6`). Celui de l'aperçu ne compte pas.
- Le trailer 2 est extrait **sans ses bandes noires** (1920×864, 2,22:1) : en `cover` il est rogné sur les côtés.
- Ralenti 50 % : par défaut, les images intermédiaires sont un **fondu** entre deux images source. Parfait sur
  les plans lents ; sur un mouvement rapide, les images se dédoublent → `fondu: false` (saccade légère).
- Les plans ont 0,3 s de marge de chaque côté : `tl` peut aller de −0,3 à `duree + 0,3` ; au-delà, image figée.
- Plusieurs équipes rendent sur la même machine : `--workers 1` pour les brouillons.
- Les pages chargent les polices et les plans dans `preparer()` ; tout ce qui est lourd (construction du DOM,
  géométries 3D, découpe de texte) se fait là, jamais dans `render(t)`.
- `gta6/assets/` et `gta6/out/` ne sont jamais commités (déjà dans `.gitignore`).
