#!/bin/sh
# Remet en place tout l'outillage 3D du pack dans une nouvelle session (rien de tout ça n'est dans le dépôt) :
# Blender 5.1 en ligne de commande, et les assets Poly Haven (CC0) listés dans assets.txt.
#   sh stream-pack/installer.sh
set -e
ICI=$(cd "$(dirname "$0")" && pwd)
OUTILS=/home/user/outils
VERSION=5.1.2
if [ ! -x "$OUTILS/blender/blender" ]; then
  mkdir -p "$OUTILS" && cd "$OUTILS"
  curl -sSL -o blender.tar.xz "https://download.blender.org/release/Blender5.1/blender-$VERSION-linux-x64.tar.xz"
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
python3 "$ICI/blender/telecharger_modeles.py"
# Affiches officielles (TMDB) : Avengers: Endgame, Retour vers le futur, Rick et Morty.
mkdir -p "$ICI/assets/affiches"
for ligne in endgame:bR8ISy1O9XQxqiy0fQFw2BX72RQ retour-vers-le-futur:vN5B5WgYscRGcQpVhHl6p9DDTP0 rick-et-morty:owhkU6KRqdXoUQpjV8uyZGPtX58; do
  nom=${ligne%%:*}; id=${ligne#*:}
  [ -s "$ICI/assets/affiches/$nom.jpg" ] || curl -sS -o "$ICI/assets/affiches/$nom.jpg" "https://image.tmdb.org/t/p/original/$id.jpg"
done
# Programme de la TV (paysages en travelling, depuis les HDRI) et captures des écrans du setup.
[ -s "$ICI/assets/tv/programme.mp4" ] || "$OUTILS/blender/blender" -b -P "$ICI/tv/programme.py"
(cd "$ICI/ecrans" && NODE_PATH=${NODE_PATH:-/opt/node-tools/node_modules} node cap.js && NODE_PATH=${NODE_PATH:-/opt/node-tools/node_modules} node chat.js) || echo "captures d'écrans : Playwright absent, on garde les PNG du dépôt"
echo "outillage prêt"
