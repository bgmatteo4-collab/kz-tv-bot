#!/usr/bin/env python3
"""Exécute la construction du décor hors de Roblox et en mesure les cotes.

Le décor est bâti par du code : il peut donc être bâti et vérifié sans ouvrir
Studio. Ce script assemble le simulateur, les modules du jeu et le banc de
mesure en un seul fichier Luau, puis l'exécute.

L'interpréteur Luau autonome n'a ni `io` ni `load` : les modules sont donc
enveloppés dans des fonctions plutôt que chargés dynamiquement.

Usage : python3 tests/lancer.py [chemin/vers/luau]
"""

import pathlib
import subprocess
import sys

RACINE = pathlib.Path(__file__).resolve().parent.parent
TESTS = RACINE / "tests"

MODULES = [
    "src/shared/Charte/Echelle.lua",
    "src/shared/Charte/Palette.lua",
    "src/shared/Charte/Materiaux.lua",
    "src/shared/Config/Dev.lua",
    "src/shared/Config/Plateau.lua",
    "src/shared/Config/Equipement.lua",
    "src/server/Construction/Batir.lua",
    "src/server/Construction/Mur.lua",
    "src/server/Construction/Coque.lua",
    "src/server/Construction/Grill.lua",
    "src/server/Construction/Eclairage.lua",
    "src/server/Construction/Scenographie.lua",
    "src/server/Construction/Materiel.lua",
    "src/server/Construction/Mobilier.lua",
]


def indenter(code: str) -> str:
    return "\n".join(("\t" + ligne) if ligne.strip() else ligne for ligne in code.splitlines())


def assembler() -> pathlib.Path:
    simulateur = (TESTS / "Simulateur.lua").read_text(encoding="utf-8")
    simulateur = simulateur.replace("return Simulateur", "-- (assemblé)")

    mesurer = (TESTS / "Mesurer.lua").read_text(encoding="utf-8")

    morceaux = [
        "--!nocheck\n-- Fichier assemblé par tests/lancer.py. Ne pas modifier à la main.\n\n",
        simulateur,
        "\n\nModules = {}\n\n",
    ]

    for chemin in MODULES:
        code = (RACINE / chemin).read_text(encoding="utf-8")
        morceaux.append(f'Modules["{chemin}"] = function(script)\n{indenter(code)}\nend\n\n')

    morceaux.append(mesurer)

    paquet = TESTS / "paquet.lua"
    paquet.write_text("".join(morceaux), encoding="utf-8")
    return paquet


def main() -> int:
    luau = sys.argv[1] if len(sys.argv) > 1 else "luau"
    paquet = assembler()
    return subprocess.run([luau, paquet.name], cwd=TESTS).returncode


if __name__ == "__main__":
    raise SystemExit(main())
