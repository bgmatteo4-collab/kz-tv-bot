"""Overlay Just Chatting animé : fond d'encre diluée (très lent, boucle de 30 s sans couture), cadres papier de la cam
et du chat, étiquette KAYZX TV, bandeau du bas où YouTube et le Discord alternent (fondu toutes les 7,5 s).
    python3 just_chatting.py [--apercu 1]  → just-chatting.mp4 (1920 × 1080, 30 i/s)
Dans OBS : ce MP4 en Source média (Boucle cochée), puis la cam à 88, 196 en 1280 × 720 et le chat à 1420, 270 en 392 × 650."""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ICI, '..', 'motifs'))
from encre import Encre   # noqa: E402

FPS, DUREE, W, H = 30, 30.0, 1920, 1080
apercu = '--apercu' in sys.argv
calque = lambda f: np.asarray(Image.open(os.path.join(ICI, f)).convert('RGBA'), dtype=np.float32) / 255
fixe, infos = calque('jc-fixe.png'), [calque('jc-r1.png'), calque('jc-r2.png')]


def poser(fond, c, force=1.0):
    a = c[..., 3:] * force
    return fond * (1 - a) + c[..., :3] * a


def bandeau(t):
    """Quatre créneaux de 7,5 s (YouTube, Discord, YouTube, Discord) ; fondu enchaîné de 0,6 s."""
    creneau, dans = int(t // 7.5), t % 7.5
    actuel, suivant = infos[creneau % 2], infos[(creneau + 1) % 2]
    k = np.clip((dans - 6.9) / 0.6, 0, 1)
    return actuel, suivant, k


encre = Encre(W, H)
sortie = os.path.join(ICI, 'just-chatting-apercu.png' if apercu else 'just-chatting.mp4')
if apercu:
    img = poser(poser(encre.image(4.0, DUREE), fixe), infos[0])
    Image.fromarray((img * 255).astype(np.uint8)).save(sortie)
    sys.exit(0)
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                       '-i', '-', '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', sortie], stdin=subprocess.PIPE)
for f in range(int(DUREE * FPS)):
    t = f / FPS
    img = poser(encre.image(t, DUREE, k_grain=f), fixe)
    a, b, k = bandeau(t)
    img = poser(poser(img, a, 1 - k), b, k)
    ff.stdin.write((img * 255 + 0.5).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
print('vidéo :', sortie)
