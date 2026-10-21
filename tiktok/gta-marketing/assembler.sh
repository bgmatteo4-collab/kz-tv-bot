#!/bin/sh
# Colle la bande-son sur la vidéo rendue : out/video.mp4 + out/bande.wav → out/<nom>.mp4
#   ./assembler.sh [nom]      (par défaut : tiktok-gta6-marketing)
set -e
cd "$(dirname "$0")"
NOM=${1:-tiktok-gta6-marketing}
NODE_PATH=${NODE_PATH:-/opt/node-tools/node_modules} node render.js --sons 1
python3 son.py
ffmpeg -y -v error -i out/video.mp4 -i out/bande.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "out/$NOM.mp4"
echo "out/$NOM.mp4"
