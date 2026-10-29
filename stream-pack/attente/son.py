"""Le son de l'intro de lancement : la nappe du pack, 30 s en boucle.
    python3 son.py   → attente.wav
"""
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from nappe import nappe   # noqa: E402

nappe(os.path.join(ICI, 'attente.wav'), duree=30.0, base=73.42, signaux=6, graine=3)
