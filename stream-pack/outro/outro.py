"""L'outro de fin de live : une boucle de 30 s sans couture, à 60 images par seconde.
Même langage que l'intro (motif d'encre, titre en volume, cartes d'info), mais on dit au revoir et on
donne rendez-vous. La mécanique est dans motifs/ecran.py.
    python3 outro.py [--part i/n] [--apercu T]
Dans OBS : Source média, Boucle cochée, sur la scène de fin de live.
"""
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from ecran import Ecran, MIEL, OMBRE_MIEL, OMBRE_PAPIER, PAPIER   # noqa: E402

ecran = Ecran(
    titre=[("MERCI D'ÊTRE PASSÉ", 80, PAPIER, OMBRE_PAPIER, 388),
           ('À BIENTÔT', 168, MIEL, OMBRE_MIEL, 548)],
    cartes=[os.path.join(ICI, f'carte-{k}.png') for k in range(1, 7)],
    graine=11,   # une autre encre que l'intro : les deux écrans ne doivent pas se confondre
)

if __name__ == '__main__':
    ecran.rendre(sys.argv, ICI, 'outro.mp4')
