# Dossier Nº02 — Josman : système visuel

Format 1080 × 1920, 60 i/s, ≈ 70 s. Même fabrication que le Nº01 (`render.js`, une image =
`render(t)`), mais un parti pris plus posé : un plan tenu, un seul changement à la fois.

    node render.js --stills 1,4,9 --dossier out/stills   # images de contrôle
    node render.js --out out/accroche.mp4                # vidéo (par segments, reprenable)

## Palette (la série Dossier, passée à la nuit et à l'or)
| Rôle | Couleur |
|---|---|
| Fond | nuit `#07090E` |
| Texte | champagne `#EFE3C2` |
| Mot qui compte, devise, disques | or `#C9A55C` (le lustre de *DOM PERIGNON CRYING*) |
| Surtitres, crédits | brume `#8D96A3` |
| Onglet et numéros de la série | cerise `#D2122E` |

## Typographie
- Titres : Archivo 800, largeur 78 %, capitales, 112 px. Le mot qui compte : Instrument Serif italique, or, 132 px.
- Surtitres et crédits : JetBrains Mono, capitales, espacées.
- Une ligne entière monte de son masque (0,75 s, `E.sortie`), sans rebond mot par mot.

## Matière et lumière
- Une douche de lumière chaude venue du haut, un faisceau : la vitrine du luxe.
- Les objets (pochettes, billet) sont de vrais objets : ombre portée, reflet sur un sol brillant.
- Pas de grain ni d'effet gratuit. Le flou de mouvement ne sert que sur les déplacements.
- Le contraste du sujet passe par la lumière : la vitrine s'éteint, un lampadaire froid s'allume.

## Zones sûres TikTok
Rien d'important au-dessus de 240 px, sous 1400 px, ni à droite de 900 px sous 840 px.
