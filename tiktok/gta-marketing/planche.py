#!/usr/bin/env python3
"""Planche-contact : python3 planche.py sortie.jpg largeur_vignette colonnes image1 image2 …
Chaque vignette porte le nom de son fichier (pratique pour relire une série d'images fixes)."""
import sys
from PIL import Image, ImageDraw
out, lc, cols, imgs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
ims=[]
for f in imgs:
    i=Image.open(f).convert('RGB'); i=i.resize((lc, round(i.height*lc/i.width)))
    d=ImageDraw.Draw(i); d.rectangle((0,0,150,18),fill=(0,0,0)); d.text((4,3),f.split('/')[-1],fill=(255,255,255)); ims.append(i)
hc=max(i.height for i in ims); rows=(len(ims)+cols-1)//cols
P=Image.new('RGB',(cols*lc+(cols+1)*6,rows*hc+(rows+1)*6),(90,90,90))
for k,i in enumerate(ims): P.paste(i,(6+(k%cols)*(lc+6),6+(k//cols)*(hc+6)))
P.save(out,quality=85)
