# 02 · Synthèse des recherches

Recherches menées en octobre 2026. Les points marqués **⚠ à vérifier** reposent sur des sources secondaires ou contradictoires et doivent être confirmés par un test réel en phase 0 ou 1.

## 1. Moteur et performances

### Streaming
- Chaque bâtiment est un modèle en mode **`Atomic`** : il est chargé et déchargé d'un bloc. Garder chaque modèle **spatialement compact**.
- **`Persistent`** (jamais déchargé) : réservé au strict minimum. **Ne jamais imbriquer un modèle `Persistent` dans un modèle `Atomic`**, ce qui force l'atomique à devenir persistant.
- **Piège** : l'atomicité ne vaut qu'à la première réplication. Une instance ajoutée *après coup* sous un modèle déjà répliqué n'est pas envoyée atomiquement. → Les intérieurs générés à la demande sont des **modèles séparés**, avec leur propre cycle de streaming.
- Source : [Techniques de streaming](https://create.roblox.com/docs/workspace/streaming/techniques), [ModelStreamingMode](https://create.roblox.com/docs/reference/engine/enums/ModelStreamingMode).

### Rendu et instanciation
- Des MeshParts qui partagent **le même mesh et la même texture** sont dessinées en un seul appel au GPU. La couleur ne casse pas ce regroupement. ⚠ à vérifier : informations issues du DevForum, dont certaines anciennes.
- → Privilégier un **kit d'éléments réutilisés** (même encadrement de fenêtre décliné partout) plutôt que des milliers de formes uniques.

### Mémoire mobile
- Les appareils modestes plantent autour d'**~1 Go** d'utilisation (retours de développeurs). ⚠ ordre de grandeur, à mesurer.
- L'émulateur de Studio **ne reflète pas** la mémoire réelle : tester sur un vrai téléphone. Source : [Design for performance](https://create.roblox.com/docs/performance-optimization/design).
- Une grande partie de la mémoire est consommée par le moteur lui-même ; la part du jeu vient surtout des textures, des personnages, de l'interface et de la carte.

### EditableMesh
- Budgets mémoire stricts côté client ; serveur, Studio et plugins sans limite.
- Ne se réplique pas (⚠ selon le DevForum) ; coût de `CreateMeshPartAsync` ≈ 22 ms + 0,27 ms par 1 000 triangles (⚠ DevForum).
- **Conclusion** : ce n'est pas la bonne voie pour fusionner des façades en jeu. Les mesh sont **fabriqués à l'avance** (usine à mesh) et importés comme des assets normaux.

## 2. Rendu réaliste

- Base officielle : **`Lighting.Technology = Future`**, style d'éclairage **Realistic**, **`EnvironmentDiffuseScale = 1`** et **`EnvironmentSpecularScale = 1`**, pour que les matériaux PBR (MaterialVariant, SurfaceAppearance) reflètent leur environnement. Source : [Enhance outdoor environments](https://create.roblox.com/docs/tutorials/3D-art/enhancing-outdoor-environments-with-future-lighting).
- **Les reflets portent l'essentiel du réalisme sur Roblox**, et le choix du ciel influence fortement le rendu de chaque matériau → le ciel est un choix de direction artistique à part entière.
- Faiblesses connues en 2026 (à contourner par la direction artistique) : ombres de basse résolution qui s'estompent près de la caméra ; reflets affichant une version simplifiée de la scène ; bug d'éclairage lié aux textures 4K (février 2026). Sources : DevForum ([ombres](https://devforum.roblox.com/t/higher-resolution-and-improved-shadows/4563863), [reflets](https://devforum.roblox.com/t/ugrent-make-specular-reflections-show-the-scene-on-realistic-lighting-and-not-soft-lighting/4777874), [4K](https://devforum.roblox.com/t/lighting-messed-up-after-new-studio-updates-4k-rendering-update/4336328)).
- **Résolution des textures** : les sources hésitent entre 1024 et 4096 px pour les SurfaceAppearance. ⚠ à vérifier. Par prudence mobile : **1024 px** par défaut, palette de **40 à 60 matériaux partagés** pour toute la ville.
- Anti-modèles « vieux Roblox » à bannir : matériau Plastic, angles vifs, éclairage plat, couleurs saturées, textures répétées uniformément, espaces vides, proportions fausses.
- **Le secret géométrique du réalisme** : de petits **biseaux** sur toutes les arêtes, qui captent la lumière.

## 3. Modèles 3D : pipeline à zéro budget

- **Limite par mesh : ~20 000 triangles** ; recommandation : viser **~10 000**. ⚠ sources non officielles concordantes.
- Formats d'import : FBX, OBJ, glTF/GLB. Préférer le **PNG** pour les textures (bug signalé avec le TGA).
- **Upload automatique et gratuit via Open Cloud** : clé API (permission « assets »), type `Model` accepte `.fbx .gltf .glb .rbxm .rbxmx`, 20 Mo max par fichier, quotas selon la vérification du compte. Source : [Usage guide for assets](https://create.roblox.com/docs/cloud/guides/usage-assets).
- **Poly Haven** : tout en **CC0**, usage commercial autorisé, sans attribution obligatoire (créditer reste apprécié). Ne pas prétendre être l'auteur. Source : [FAQ Poly Haven](https://polyhaven.com/faq). Idem pour **ambientCG** (textures).
- **IA de Studio (Cube 3D, `generate_mesh`)** : présentée par Roblox comme un « point de départ » à retravailler ; aucun test indépendant de qualité trouvé. ⚠ à évaluer dans la salle d'étalonnage. Source : [Roblox Cube](https://corp.roblox.com/newsroom/2025/03/introducing-roblox-cube).
- **Creator Store** : risque réel de **backdoors** (`require` masqués, `getfenv`, code obfuscé, scripts cachés dans des services protégés). Règle : **zéro script importé**, seule la géométrie est conservée. Source : [Removing Backdoors 101](https://devforum.roblox.com/t/removing-backdoors-101/545574).
- **Blender est gratuit et pilotable entièrement par script** (sans interface) : biseaux, dépliage UV, simplification, export. Le propriétaire n'a jamais à l'ouvrir.

### Choix de source par catégorie

| Catégorie | Source |
|---|---|
| Architecture (murs, dalles, escaliers, toits, encadrements, corniches, moulures, garde-corps) | **Code** (profils extrudés, biseaux) |
| Mobilier géométrique (cuisines, placards, armoires, tables, chaises, lits, rayonnages, électroménager) | **Code paramétrique** (tiroirs et portes séparés par construction, dimensions adaptées) |
| Matériaux | **CC0** (ambientCG, Poly Haven) + `generate_material` pour combler |
| Objets organiques (canapés, plantes, lampes, vaisselle, statues, ornements sculptés) | **CC0 Poly Haven** → **IA** → **Creator Store** filtré, dans cet ordre |
| Véhicules | Creator Store / CC0 (géométrie seule) + châssis open source |

Tout asset passe par la **salle d'étalonnage** (scène neutre, éclairages de référence, captures comparatives) avant d'être accepté.

## 4. Urbanisme et architecture

- **Règles haussmanniennes** (sources secondaires, suffisantes pour un jeu) : hauteur liée à la largeur de la rue (rapport ~1:1 à 1:1,5) ; corniche continue ; toit mansardé à ~45° au-dessus ; **2e étage noble** (grand balcon, plafonds 3,2–3,5 m) ; 3e et 4e plus sobres ; **balcon filant au 5e** ; boutiques au rez-de-chaussée ; ~6 niveaux + combles.
- **Recherche académique** : les jeux ont des intérieurs vides ou répétés faute de contrôle sur la topologie des pièces et de garantie d'accessibilité (Lopes et al., 2010). Solution publiée : un **modèle sémantique commun** qui coordonne grammaire de façade et générateur de plans (Tutenel et al., TU Delft, 2011). **Le plan d'étage dicte la façade, pas l'inverse.** Sources : [TU Delft](https://graphics.tudelft.nl/Publications-new/2011/TSLDB11a), [GAME-ON 2010](https://graphics.tudelft.nl/~rafa/myPapers/bidarra.GAMEON10.pdf).

## 5. Véhicules et transports

- **A-Chassis** : châssis de voiture open source et gratuit, standard de fait. Limite : physique côté client, collisions entre voitures parfois étranges. Source : [GitHub A-Chassis](https://github.com/lisphm/A-Chassis).
- **Joueurs dans une rame en mouvement** : pas de solution officielle. Technique éprouvée : déplacer la rame par **contraintes physiques**, éviter d'écrire le CFrame des personnages à chaque image, et transmettre la **position de chaque passager relative à la rame**. → prototype prioritaire. Source : [DevForum, train type Jailbreak](https://devforum.roblox.com/t/jailbreak-train-platform-system/236339).

## 6. Échelle

- Avatar R15 ≈ **5 à 5,5 studs** (mesures communautaires). À la conversion officieuse de 0,28 m/stud, il mesurerait 1,40 m, ce qui rend l'architecture réelle gigantesque.
- **Décision** : ancrer l'échelle sur l'avatar → **1 stud ≈ 0,33 m** ; intérieurs et façades ×1,25. À recalibrer en mesurant un avatar dans Studio (phase 0).

## 7. MCP de Roblox Studio

Serveur intégré à Studio, local (stdio), client Claude Code pris en charge. Outils : `script_read`, `multi_edit`, `script_search`, `script_grep`, `generate_mesh`, `generate_material`, `generate_procedural_model`, `search_asset`, `insert_asset`, `upload_image`, `store_image`, `search_game_tree`, `inspect_instance`, `execute_luau`, `get_studio_state`, `start_stop_play`, `get_console_output`, `screen_capture`, `character_navigation`, `user_keyboard_input`, `user_mouse_input`, `http_get`, `list_roblox_studios`. Source : [Connect to the Roblox Studio MCP server](https://create.roblox.com/docs/studio/mcp).
