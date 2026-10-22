# Voix off

Voix **Tom** de Piper (`fr_FR-tom-medium`) : synthèse gratuite et hors ligne, générée ici
phrase par phrase. Le texte fait foi dans `js/partition.js` (champ `dit`) : changer une phrase
là, puis relancer les commandes ci-dessous.

    pip install piper-tts onnx
    python3 generer-voix.py    # medias/voix/<id>.wav + l'instant de chaque mot (mots.json)
    python3 caler-voix.py      # mesure chaque phrase → medias/voix.json
    node render.js             # le film se recale seul (titres, caméra, photos, bruitages)
    ./assembler.sh             # voix + nappe + bruitages → out/tiktok-gta6-marketing.mp4

- **Accroche** (a1…a6) : chaque phrase est accélérée (×0,80 au plus) pour tenir dans son
  créneau, sur lequel sont calés la caméra et les bruitages de l'accroche.
- **Le reste** : débit `RYTHME` (×0,92, Tom est un peu lent au naturel) ; le film suit.
- **Titres** : chaque mot sort à l'instant où Tom le prononce (alignement des phonèmes de
  Piper), plus au prorata des lettres.
- **Prononciation** : les noms anglais sont réécrits pour la synthèse seulement (tableau
  `PRONONCE` de `generer-voix.py` : Vice City, Heat, New York, street-artistes…). Les points de
  suspension au milieu d'une phrase deviennent une virgule, sinon Piper colle les mots.
- **Niveau** : chaque phrase est mise au niveau de la voix d'origine de l'accroche, sur lequel
  le mixage de `son.py` est réglé.

Une autre voix (ElevenLabs, ta propre voix…) passe par le même chemin : déposer
`medias/voix/<id>.mp3` ou `.wav` (un fichier par phrase), supprimer `medias/voix/mots.json`,
puis `caler-voix.py`.
