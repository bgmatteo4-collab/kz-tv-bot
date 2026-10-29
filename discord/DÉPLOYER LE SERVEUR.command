#!/bin/bash
# Double-clique sur ce fichier : macOS ouvre le Terminal et le lance.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js n'est pas installé. Prends la version « LTS » sur https://nodejs.org"
  echo ""
  read -r -p "  Appuie sur Entrée pour fermer. "
  exit 1
fi

if [ ! -f .env ]; then
  echo ""
  echo "  Pas encore configuré."
  echo "  Double-clique d'abord sur « CONFIGURER.command »."
  echo ""
  read -r -p "  Appuie sur Entrée pour fermer. "
  exit 1
fi

[ -d node_modules ] || npm install --no-audit --no-fund

echo ""
echo "  Étape 1 sur 2 : vérification. Rien ne sera modifié."
echo ""
node deployer.js --verifier || { read -r -p "  Appuie sur Entrée pour fermer. "; exit 1; }

echo ""
read -r -p "  Appliquer ces changements sur le serveur ? (o/N) " reponse
case "$reponse" in
  o|O|oui|OUI) ;;
  *) echo ""; echo "  Annulé. Rien n'a été modifié."; echo ""
     read -r -p "  Appuie sur Entrée pour fermer. "; exit 0 ;;
esac

echo ""
node deployer.js
echo ""
read -r -p "  Appuie sur Entrée pour fermer. "
