# Voix off — à générer dans ElevenLabs

Même voix que l'accroche (« Sterling »), mêmes réglages, **une phrase par fichier**, nommé
exactement comme ci-dessous. Coller le texte tel quel : les sigles et les nombres sont déjà
écrits comme ils doivent être prononcés.

| Fichier | Texte |
|---|---|
| `p1.mp3` | Sept coups de génie. Le dernier est le plus fou. |
| `c1.mp3` | Un : les pubs des fausses marques du jeu, en pleine rue. Pas de nom, juste Vice City et un QR code. |
| `c2.mp3` | Deux : un dirigeable Vice City dans le ciel de Floride. |
| `c3.mp3` | Trois : cette enseigne, sur le toit de l'arène du Heat, visible depuis les avions. Près d'un million de dollars. |
| `r1.mp3` | Mais la ville n'est pas ravie : un élu dit qu'on fait passer Miami pour la capitale du meurtre. |
| `r2.mp3` | Alors, sur l'espace public, jamais le mot G.T.A. |
| `c4.mp3` | Quatre : les voitures du jeu, en vrai, avec des plaques de Leonida. |
| `c5.mp3` | Cinq : chaises longues, parasols, et des avions-banderoles pour un club qui n'existe pas. |
| `c6.mp3` | Six : dix fresques de vrais street-artistes, et le musée offert aux habitants jusqu'en deux mille vingt-huit. |
| `m1.mp3` | Et ça déborde : New York, Los Angeles… jusqu'aux portes de Paris. |
| `c7.mp3` | Sept : le dix-huit novembre, le Miami Heat jouera sous le nom de Vice City. La veille de la sortie du jeu. |
| `o1.mp3` | G.T.A. six sort le dix-neuf novembre. |
| `o2.mp3` | Et toi, quelle ville Rockstar devrait transformer ensuite ? |

Le texte fait foi dans `js/partition.js` : si une phrase change, la changer là aussi.

## Ensuite

    # déposer les 13 fichiers dans medias/voix/
    python3 caler-voix.py      # mesure chaque phrase → medias/voix.json
    node render.js             # le film se recale seul (titres, caméra, photos, bruitages)
    ./assembler.sh             # voix + nappe + bruitages → out/tiktok-gta6-marketing.mp4
