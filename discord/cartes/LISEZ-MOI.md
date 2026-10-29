# Cartes de salon — gabarits

Les encarts que le bot poste en tête de chaque salon Discord : une image, pas du texte,
pour que la direction artistique Kayzx TV s'applique vraiment.

## Rendre les cartes

```sh
node capturer.js
```

Chaque carte de `cartes.html` est capturée en PNG. Le rendu passe par un navigateur sans
interface (Playwright) : on garde les vraies polices, le motif d'encre et les dégradés,
ce qu'un dessin sur canvas ne permettrait pas aussi simplement.

## Les règles de dessin

- **Format 16/9, 1600 × 900.** Discord plafonne la hauteur d'affichage d'une image à
  environ 350 px : une carte en portrait est réduite au point d'être illisible sans clic.
  En paysage, elle occupe toute la largeur du message.
- **Un univers = une couleur de bandeau.** Le motif d'encre du pack est posé en `soft-light`
  par-dessus l'aplat de la catégorie : une seule image source, quatre teintes.

  | Univers | Couleur |
  |---|---|
  | Communauté | forest teal `#1E5B57` |
  | Matchs | honey gold `#E0A93B` |
  | Staff | corail `#B9533F` |
  | Gaming | chêne `#8A5A36` |

- **Sur bandeau miel, le titre passe en nuit** (`#0F1519`) : du papier sur du doré ne
  passerait pas le contraste.
- **Les accents du corps restent teal partout.** C'est le bandeau qui porte la couleur de
  l'univers, jamais le texte sur papier.
- **Trois règles par carte au maximum.** Au-delà, le texte doit rétrécir et la carte
  devient illisible au téléphone.

## Ce qui n'est pas dans l'image

Le texte d'une image n'est ni cliquable, ni cherchable, ni lisible par un lecteur d'écran.
Les mentions de salon y sont donc décoratives : les vrais liens passent par la rangée de
boutons que le bot pose sous la carte, chaque carte part avec son texte alternatif, et
`/salon` renvoie la version texte en message éphémère.
