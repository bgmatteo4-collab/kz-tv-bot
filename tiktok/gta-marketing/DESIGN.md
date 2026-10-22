# TikTok Kayzx — « Rockstar transforme Miami en Vice City »

Première vidéo de la série « Dossier » (Nº01). Format 1080 × 1920, 60 i/s, ≈ 72 s au final.
Le film entier est monté ; seule l'accroche a sa voix définitive, la suite est calée sur des
durées estimées en attendant les fichiers décrits dans `VOIX.md`.

## Fabrication

    python3 preparer-medias.py        # photos de medias/ → panneaux prêts (hors dépôt)
    node render.js --stills 1,5,9     # images fixes de contrôle (out/stills/)
    node render.js                    # vidéo muette (out/video.mp4), flou de mouvement adaptatif
    ./assembler.sh                    # bande-son (son.py) + collage → out/tiktok-gta6-marketing.mp4

Playwright vient de `/opt/node-tools/node_modules` (`NODE_PATH`). `medias/` (photos sous droits,
voix ElevenLabs) et `out/` ne vont pas dans le dépôt public.

## Palette (identité Kayzx)

| Rôle | Couleur |
|---|---|
| Fond, mer de la carte | deep navy `#0B1B3A` |
| Terres | `#142D5C` |
| Texte, traits de carte | soft butter `#F6E7A8` |
| Pavé du mot clé, onglet, trajet | cherry red `#D2122E` |
| Cerise sur fond marine (lueurs, épingles) | `#F23A55` |

Vice City (rose, néon) n'apparaît que dans les photos réelles, jamais dans l'habillage.

## Typographie

- Titres : Archivo 900, largeur 68 %, capitales, interligne 0,9. Chaque ligne est mise à la
  largeur de la colonne (866 px, taille plafonnée à 216 px) : des blocs pleins, façon couverture.
- Un seul mot clé par titre, dans un pavé cerise (texte beurre). Jamais deux pavés à la fois.
- Étiquettes de carte : Archivo 800 condensé pour les noms de jeu (LOS SANTOS, VICE CITY),
  JetBrains Mono pour les sous-titres, coordonnées et échelle.
- Les mots arrivent un par un, chacun sort de son masque avec un ressort (raideur 210,
  amortissement 24), calés sur la voix.

## Habillage

- Onglet « DOSSIER · GTA VI · Nº01 » accroché au bord gauche, comme un intercalaire de classeur.
  Il glisse du bord au début et reste. Pas de point rouge « REC », pas de rubrique en haut à gauche.
- Pastille de légende (marine translucide, flou d'arrière-plan) : lieu et crédit de la photo,
  puis coordonnées et échelle en direct pendant la carte.
- Grain léger (fusion « incrustation », 26 %) et vignettage.

## Zones sûres TikTok

Rien d'important au-dessus de 240 px, sous 1360 px, ni à droite de 900 px sous 840 px
(colonne des boutons). Les repères de carte s'effacent en entrant dans la zone des titres.

## Mouvement

- La caméra ne coupe jamais : la carte est le fil conducteur, la photo devient l'épingle,
  l'épingle fait surgir les photos suivantes.
- Carte : Mercator puis vraie perspective (inclinaison 0 → 54°), vols « zoom fluide » (van Wijk)
  entre les vues, la caméra suit la tête du trajet.
- Courbes : une seule famille (`E.sortie`, `E.traversee`, `E.doux`) et des ressorts.
- Flou de mouvement : 3 sous-images sur les passages rapides seulement (`__sous`).

## Son

Voix off ElevenLabs (voix « Sterling »), devant. Nappe grave (la / mi) et bruitages synthétisés
(rembobinage vers Los Santos, épingles, montée pendant le trajet, impact sur « Vice City »),
compressés par la voix. Sortie à −14 LUFS, crêtes à −1 dBTP. La musique tendance s'ajoute dans
l'appli TikTok, très bas sous la voix.
