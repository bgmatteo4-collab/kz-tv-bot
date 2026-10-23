#!/bin/sh
# Remet en place tout l'outillage 3D du pack dans une nouvelle session (rien de tout ça n'est dans le dépôt) :
# Blender 4.2 LTS en ligne de commande, et les assets Poly Haven (CC0) listés dans assets.txt.
#   sh stream-pack/installer.sh
set -e
ICI=$(cd "$(dirname "$0")" && pwd)
OUTILS=/home/user/outils
VERSION=4.2.23
if [ ! -x "$OUTILS/blender/blender" ]; then
  mkdir -p "$OUTILS" && cd "$OUTILS"
  curl -sSL -o blender.tar.xz "https://download.blender.org/release/Blender4.2/blender-$VERSION-linux-x64.tar.xz"
  tar -xf blender.tar.xz && rm blender.tar.xz && mv "blender-$VERSION-linux-x64" blender
fi
"$OUTILS/blender/blender" --version | head -1
# Assets : « type id résolution » par ligne (models / textures / hdris).
mkdir -p "$ICI/assets"
grep -v '^#' "$ICI/assets.txt" | while read type id res; do
  [ -z "$id" ] && continue
  [ -e "$ICI/assets/$id.ok" ] && continue
  python3 "$ICI/blender/telecharger_asset.py" "$type" "$id" "$res" "$ICI/assets" && touch "$ICI/assets/$id.ok"
done
echo "outillage prêt"
