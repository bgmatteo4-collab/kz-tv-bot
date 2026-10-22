# Écrire un chapitre

Le film est découpé en chapitres, un fichier chacun dans `js/chapitres/<id>.js`. Le chapitre
modèle est **`js/chapitres/pubs.js`** (coup n° 1) : le lire en entier avant d'écrire un chapitre,
et en reprendre le niveau de finition, la structure et les conventions.

## Ce qui est déjà fait ailleurs (ne pas le refaire)

- **La caméra** (`js/camera.js`) : une seule prise pour tout le film. Le vol vers la vue du
  chapitre part à la fin de la tenue du chapitre précédent et se pose 0,32 s après le début de
  la première phrase ; ensuite la caméra avance très doucement jusqu'au vol suivant.
- **Les 7 épingles** (`js/epingles.js`) : dessinées par `main.js` ; l'épingle du coup en cours
  est cerise et lance une onde. Leur position écran : `ecranEpingle(X.P, EPINGLES.find(e => e.chap === 'xxx'))`.
- **Le voile** : `main.js` assombrit la carte selon `voile(t)` du chapitre (0 → 1).
- **L'onglet « Dossier »** et ses 7 points de progression, **la légende** (coordonnées en direct
  hors des fenêtres déclarées par les chapitres), **le grain**, **le souffle de chaque vol**.
- **Le minutage** (`js/partition.js`) : `T.chap.<id>` donne `precedent`, `debut`, `fin`, `tenue`,
  `suivant` ; `T.mot('c3', 'million')` donne l'instant où un mot est prononcé (au prorata des
  lettres de la phrase) ; `T.quand('c3', 0.5)` le milieu d'une phrase. **Ne jamais écrire
  d'instant en dur** : tout se cale sur ces repères, pour que le film se recale seul quand la
  voix définitive remplacera l'estimation.

## L'interface d'un chapitre

```js
export default function creer(T, K) {   // T : minutage, K : caméra (K.camera(t), K.boucle…)
  return {
    id: 'enseigne',
    blocs: [...],          // titres (voir plus bas)
    preparer() {},         // crée les cartes photo : carte('medias/xxx.jpg') (cachées par défaut)
    dessiner(t, X) {},     // appelé à chaque image ; ne rien dessiner hors de sa fenêtre
    voile: (t) => 0..1,    // assombrit la carte sous les photos
    alerte: (t) => 0..1,   // facultatif : la carte vire au cerise sombre (relance)
    legendes: [{ de, a, html, haut? }],   // pastille : lieu + crédit des photos
    sons(add) {},          // add(t, type, gain, { duree })
    sous: (t) => 1 | 3,    // facultatif : flou de mouvement (3 sous-images) sur un passage rapide
  };
}
```

`X` contient : `t`, `T`, `K`, `cam` (caméra courante), `P` (projection : `P.ll(lon, lat)` →
`[x, y, f]` à l'écran, `f` = facteur de perspective), `ctx` (canvas de la carte, sous les
photos), `dessus` (canvas au-dessus des photos, effacé à chaque image : anneaux, traits,
compteurs, étiquettes) et `horsTitres(y)` (0 dans la zone des titres, 1 ailleurs).

Outils disponibles :
- `js/photos.js` : `carte(src)`, `placer(c, {x, y, w, h, r, s, a, z, kb, kx, ky, rayon})`,
  `trajectoire(t, {t0, t1, depuis, cible, …})`, `animer(c, t, opts)`.
- `js/carte.js` : `texte(ctx, s, x, y, opts)`, `etiquetteLieu(...)`, `epingle(...)`,
  `trajet(a, b, cambrure)`, `dessinerTrajet(ctx, P, tr, p, opts)`, `LIEUX`.
- `js/outils.js` : `E` (courbes : `sortie`, `traversee`, `entree`, `doux`), `ressort(d, k, c)`,
  `prog(t, t0, d)`, `tw(t, t0, d)`, `lerp`, `clamp`, `C` (palette), `rgba(hex, a)`.
- Styles propres au chapitre : les injecter depuis `preparer()` dans un `<style>` dont toutes
  les classes commencent par `.ch-<id>`. Ne pas modifier `style.css`.

## Règles de mise en scène (DESIGN.md en détail)

1. **Titres** : deux lignes par bloc, en général (14 à 20 caractères par ligne), pour garder le
   bas de l'écran aux photos. Un mot = `[texte, instant, genre]` ; un seul `'accent'` (pavé
   cerise) par bloc ; le numéro du coup en `'num'` (« 02 », « 03 »…), en tête du premier bloc.
   Chaque mot apparaît **quand la voix le dit** (`T.mot`). Les blocs d'un même chapitre se
   relaient : `titres.js` fait sortir un bloc 0,3 s avant l'entrée du suivant.
   Exemple : `{ sortie: c.tenue + 0.2, lignes: [[['03', m('Trois'), 'num'], ['L’enseigne', m('enseigne')]], [['à', m('Près')], ['1 M$.', m('million'), 'accent']]] }`.
2. **Photos** : elles sortent de l'épingle du coup (ressort), vivent (poussée lente dans le
   cadre), puis **rentrent dans l'épingle à la fin de la tenue** (`c.tenue`) — la caméra repart
   juste après. Zone des photos : de y ≈ 560 à y ≈ 1400 (sous les titres, au-dessus de la
   légende/de l'interface TikTok). Rien d'important à droite de x = 900 sous y = 840 (boutons).
3. **Une idée de mouvement par chapitre**, liée au sujet (le travelling des bornes « en pleine
   rue », la plongée dans le QR code). Pas d'effet gratuit, pas de particules, pas de glitch,
   pas de dégradé violet. Le cerise sert aux accents, le beurre au texte, le marine au fond.
4. **Un gros plan final** quand la voix finit sur un détail (comme le QR code) : c'est à ça que
   sert la tenue (`apres` dans partition.js).
5. **Crédits** : chaque photo affichée doit être créditée dans la légende du chapitre
   (`legendes`). Les crédits sont dans `medias/SOURCES.txt` et `medias/SOURCES-collecte2.txt`.
6. **Faits** : n'afficher que des faits sourcés (voir la fiche du chapitre). Pas de chiffre
   inventé, pas de nom d'artiste deviné.
7. **Sons** : quelques bruitages précis, calés sur les gestes (sortie d'une photo `clic`,
   arrivée `ping`, défilement `glisse`, compteur `tic` répétés, révélation `scintille`,
   gros moment `impact` à 0,5 max). Types disponibles : clic, notif, tic, donnees, ping,
   rubrique, verrou, glisse, frappe, scintille, souffle, montee, whoosh, impact, grondement,
   dissolution, rembobinage. Toujours sous la voix : gains entre 0,25 et 0,55.

## Tester

```sh
cd tiktok/gta-marketing
export NODE_PATH=/opt/node-tools/node_modules
node render.js --stills 26.0,27.5,29.0 --query seulement=enseigne --dossier out/stills-enseigne
python3 planche.py out/planche-enseigne.jpg 300 5 out/stills-enseigne/*.png
```

`--query seulement=<id>` ne charge que ce chapitre (et l'accroche) : la caméra, les épingles et
le minutage restent ceux du film entier. Regarder les images (outil Read) à chaque itération,
au moins une image toutes les 0,4 s sur tout le chapitre, plus les deux transitions (arrivée
de la caméra, retour des photos dans l'épingle). Une image fixe en pleine taille pour vérifier
la netteté et la lisibilité du texte sur téléphone.
