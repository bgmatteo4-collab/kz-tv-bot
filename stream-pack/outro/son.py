"""Le son de l'outro : la même nappe que l'intro, mais une quarte plus bas — on descend, on ne lance pas.
    python3 son.py   → outro.wav
"""
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from nappe import nappe   # noqa: E402

nappe(os.path.join(ICI, 'outro.wav'), duree=30.0, base=55.0, signaux=6, graine=8)
