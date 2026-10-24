# Journal de production du pack de stream

À chaque reprise : `sh stream-pack/installer.sh`, puis reprendre à la dernière ligne « EN COURS ».

- 23/10 — Brief, plan de la pièce (plan/), planche DA (da/), typo Rubik : validés.
- 23/10 — EN COURS : installation de Blender 5.1 (les .blend de Poly Haven sont au format 5.0) et des assets Poly Haven, premier rendu test.

## 23/10 — retours « canapé, étagères, setup »
- Canapé d'angle face à la TV (dossier à l'ouest, méridienne au nord), table basse devant sans collision, tapis dessous ; bout de canapé avec lampe à poser ; fauteuil et lampadaire recalés.
- Étagères habillées : rangs de livres (hauteurs variées, tranches crème), piles couchées, serre-livres, petites plantes ; blocs décalés à 15 cm du mur acoustique (lames de noyer conservées, 1,75 → 4,25).
- Setup refait : plateau chêne + piètement en T, 3 écrans 27" (pied en V, disque, socle) avec contenus `ecrans/` (OBS, bureau Windows, Discord — `node ecrans/cap.js`), tapis de bureau, clavier à l'échelle, vraie souris, Stream Deck XL, carte son face au streamer, micro sur bras articulé, caméra hybride sur mini-trépied, casque au crochet, PC façade noyer.
- Bugs trouvés : portes du meuble TV qui suivaient un rail non importé (la « palissade ») ; déplacement réel des textures Poly Haven qui soulevait plateau et cadres (affiches et tapis cachés) → relief seulement ; affiches dans de vrais cadres.
- À FAIRE : figer l'animation du modèle de micro (une pièce flotte au-dessus de l'écran central), vérifier étagères/salon/affiches en gros plan, reflets de la baie et lumières, puis visite web 3D proposée au client.

## 23/10 (suite) — tour de cohérence
- Contrôle automatique `blender/controle.py` (`--controle 1`) : objets qui se traversent, qui flottent ou qui sortent des murs.
- Vrais livres (plats, dos, bloc de pages en retrait, titres dorés), gant de l'Infini remplacé (vrai modèle, or + 6 pierres), réacteur Arc sur socle Avengers.
- Meuble TV refait (noyer, façade cannelée chêne, dessus à 50 cm), barre de son ; PS5 47 cm et Xbox 35 cm (un peu au-dessus du réel pour se lire à l'image, à la demande du client).
- Une seule suspension au-dessus de la table basse ; canapé rehaussé (×1,25 en hauteur) ; coussins posés par lancer de rayon sur l'assise, contre le dossier.
- Key light : panneau 35 cm sur trépied au sol, tournée vers le siège ; micro : la tige du bras descend jusque dans l'étrier (plus de jour).
- Ville : la texture brique est dépliée sur les façades (x + y, z), vitres = 1 - joint, une fenêtre sur cinq allumée, quelques bureaux en blanc froid, pas de fenêtres sur les toits.
- Visite web (export glTF allégé) publiée ; le client ne veut plus de nouvel export web (trop coûteux) ni de séries de vues : un gros plan ciblé suffit.

## 24/10 — pièce agrandie, Just Chatting, stinger, emotes, badges, logo
- Pièce agrandie de 5 m : cuisine ouverte noir mat + chêne (évier creusé), coin setup avec vrai mur derrière, décor à lames et néon « KAYZX TV » (Rubik, miel + teal), affiches sur le nouveau mur du fond.
- Chat de l'écran animé comme un live qui démarre ; TV : écran d'accueil (heure, date) puis paysages HDRI (`tv/programme.py`). Boucle drone de 60 s en 8 plans plus lents. Photos du studio : `rendus/deck/`.
- Kit de rendu pour le PC du client : `rendre-boucle.bat` + `RENDU-PC.md` (GPU, images reprenables, assemblage MP4 avec grain).
- Motif de la chaîne : « encre diluée » (`motifs/encre.py`, boucle sans couture). Overlay Just Chatting animé (`overlays/just_chatting.py`) : cadres papier cam + chat, bandeau YouTube / TikTok / X / Discord avec vrais logos.
- Stinger « goutte d'encre » v2, 2,6 s, son marqué, nom en volume (`stingers/goutte_encre.py`, point de transition 950 ms) : validé.
- Emotes : 24 emotes texte en sticker, exportées pour Twitch (`emotes/twitch/112|56|28`). Mascotte goutte abandonnée (le client n'aime pas la goutte).
- Badges d'abonné : KZX dans une petite télé, 1 / 3 / 6 / 12 / 24 mois (`badges/twitch/`, 18-36-72 px).
- Logo Twitch (3 fonds : encre, nuit, teal) et bannière de profil 1200 × 480 (`logo/`).
- EN COURS : alertes « carte papier » (follow, abonnement, raid) avec picto par type et entrée en bande d'encre balayée, WebM transparent + son.
