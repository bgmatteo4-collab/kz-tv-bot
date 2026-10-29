"""L'intro de lancement : une boucle de 30 s sans couture, à 60 images par seconde.
Motif d'encre très lent, titre en volume (« LE LIVE VA DÉMARRER / INSTALLE-TOI ») et six cartes d'info
qui se succèdent en bas. La mécanique est dans motifs/ecran.py, partagée avec l'outro.
    python3 attente.py [--part i/n] [--apercu T]
Dans OBS : Source média, Boucle cochée, en fond de la scène « Démarrage ».
"""
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from ecran import Ecran, MIEL, OMBRE_MIEL, OMBRE_PAPIER, PAPIER   # noqa: E402

ecran = Ecran(
    titre=[('LE LIVE VA DÉMARRER', 80, PAPIER, OMBRE_PAPIER, 388),
           ('INSTALLE-TOI', 150, MIEL, OMBRE_MIEL, 542)],
    cartes=[os.path.join(ICI, f'carte-{k}.png') for k in range(1, 7)],
    graine=7,
)

if __name__ == '__main__':
    ecran.rendre(sys.argv, ICI, 'attente.mp4')
