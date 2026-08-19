#!/usr/bin/env python3
"""
Construit un fichier de place Roblox (.rbxlx) directement depuis src/,
sans Rojo.

Un .rbxlx n'est que du XML : on peut donc fabriquer le place à la main et
donner un fichier prêt à double-cliquer. C'est ce qui permet de tester le
jeu sans installer le moindre outil.

Les conventions de nommage sont celles de Rojo, pour que les deux méthodes
produisent exactement la même arborescence :

    foo.lua           -> ModuleScript "foo"
    foo.server.lua    -> Script "foo"
    foo.client.lua    -> LocalScript "foo"
    dossier/init.lua  -> le dossier devient un ModuleScript
    dossier/          -> Folder

Usage :
    python3 tools/build_place.py [sortie.rbxlx]
"""

from __future__ import annotations

import sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

# Où chaque dossier source atterrit dans l'arborescence du jeu.
# (chemin source, chaîne de services, nom de l'instance produite)
MAPPINGS = [
    (SRC / "shared", ["ReplicatedStorage"], "Shared"),
    (SRC / "server", ["ServerScriptService"], "Server"),
    (SRC / "client", ["StarterPlayer", "StarterPlayerScripts"], "Client"),
]

# Les services créés à la racine du place. Roblox complète tout seul ceux
# qui manquent à l'ouverture, on ne déclare donc que ce dont on a besoin.
SERVICES = ["Workspace", "Lighting", "ReplicatedStorage", "ServerScriptService", "StarterPlayer"]

CLASS_BY_SUFFIX = {
    ".server.lua": "Script",
    ".client.lua": "LocalScript",
    ".lua": "ModuleScript",
}


class Referent:
    """Compteur de référents. Chaque Item du fichier doit avoir le sien."""

    def __init__(self) -> None:
        self._next = 0

    def take(self) -> str:
        value = f"RBX{self._next}"
        self._next += 1
        return value


def classify(filename: str) -> tuple[str, str] | None:
    """Renvoie (classe d'instance, nom sans suffixe) pour un fichier Lua."""
    for suffix, class_name in CLASS_BY_SUFFIX.items():
        if filename.endswith(suffix):
            return class_name, filename[: -len(suffix)]
    return None


def source_property(code: str) -> str:
    # La source part en CDATA pour éviter d'échapper tout le Lua. Le seul
    # motif interdit est "]]>" ; on le coupe en deux sections si jamais il
    # apparaît un jour dans le code.
    code = code.replace("]]>", "]]]]><![CDATA[>")
    return f"<ProtectedString name=\"Source\"><![CDATA[{code}]]></ProtectedString>"


def build_item(class_name: str, name: str, referent: Referent, source: str | None = None,
               children: list[str] | None = None) -> str:
    parts = [f'<Item class="{class_name}" referent="{referent.take()}">', "<Properties>",
             f'<string name="Name">{escape(name)}</string>']

    if source is not None:
        parts.append(source_property(source))

    parts.append("</Properties>")

    if children:
        parts.extend(children)

    parts.append("</Item>")
    return "".join(parts)


def build_directory(path: Path, name: str, referent: Referent) -> str:
    """Transforme un dossier source en Item, en appliquant les règles Rojo."""
    init_class, init_source = None, None

    for init_name, class_name in (
        ("init.server.lua", "Script"),
        ("init.client.lua", "LocalScript"),
        ("init.lua", "ModuleScript"),
    ):
        candidate = path / init_name
        if candidate.exists():
            init_class = class_name
            init_source = candidate.read_text(encoding="utf-8")
            break

    children: list[str] = []

    for entry in sorted(path.iterdir(), key=lambda p: (p.is_file(), p.name)):
        if entry.is_dir():
            children.append(build_directory(entry, entry.name, referent))
            continue

        if not entry.name.endswith(".lua") or entry.name.startswith("init."):
            continue

        classified = classify(entry.name)
        if classified is None:
            continue

        class_name, child_name = classified
        children.append(
            build_item(class_name, child_name, referent, entry.read_text(encoding="utf-8"))
        )

    if init_class:
        return build_item(init_class, name, referent, init_source, children)

    return build_item("Folder", name, referent, None, children)


def build_place() -> str:
    referent = Referent()

    # On regroupe les contenus par service, puisque deux mappings peuvent
    # viser le même service.
    by_service: dict[str, list[str]] = {service: [] for service in SERVICES}

    for source_path, service_chain, instance_name in MAPPINGS:
        if not source_path.exists():
            raise SystemExit(f"Dossier source introuvable : {source_path}")

        item = build_directory(source_path, instance_name, referent)

        # Les services intermédiaires (StarterPlayerScripts) sont créés ici.
        for intermediate in reversed(service_chain[1:]):
            item = build_item(intermediate, intermediate, referent, None, [item])

        by_service.setdefault(service_chain[0], []).append(item)

    # Dossier d'accueil des vrais modèles 3D. Il doit exister dans le place
    # pour qu'on puisse y déposer des modèles depuis Studio ; le code s'en
    # sert automatiquement dès qu'un modèle y porte l'identifiant d'un objet.
    items_folder = build_item("Folder", "Items", referent)
    assets_folder = build_item("Folder", "Assets", referent, None, [items_folder])
    by_service.setdefault("ReplicatedStorage", []).append(assets_folder)

    body = []
    for service in SERVICES:
        body.append(build_item(service, service, referent, None, by_service.get(service)))

    header = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n'
    )

    return header + "\n".join(body) + "\n</roblox>\n"


def main() -> None:
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "KZStreamSimulator.rbxlx"
    output.write_text(build_place(), encoding="utf-8")

    size_kb = output.stat().st_size / 1024
    print(f"Place construit : {output.name} ({size_kb:.0f} Ko)")


if __name__ == "__main__":
    main()
