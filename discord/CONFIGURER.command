#!/bin/bash
# Double-clique sur ce fichier : macOS ouvre le Terminal et le lance.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  cat <<'FIN'

  Node.js n'est pas installé sur ce Mac.

  Va sur https://nodejs.org, prends la version « LTS », installe-la,
  puis double-clique à nouveau sur ce fichier.

FIN
  read -r -p "  Appuie sur Entrée pour fermer. "
  exit 1
fi

if [ ! -d node_modules ]; then
  echo ""
  echo "  Première utilisation : installation des composants. Une minute environ."
  echo ""
  if ! npm install --no-audit --no-fund; then
    echo ""
    echo "  L'installation a échoué. Vérifie ta connexion internet et recommence."
    read -r -p "  Appuie sur Entrée pour fermer. "
    exit 1
  fi
fi

node configurer.js
echo ""
read -r -p "  Appuie sur Entrée pour fermer. "
