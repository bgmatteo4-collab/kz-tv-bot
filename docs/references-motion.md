# Références motion design

Références fournies par Kayzx TV pour tous ses projets de motion design.
Avant de concevoir une animation, relire ce fichier en entier : c'est le
niveau visé, pas une inspiration lointaine.

## Les vidéos de référence

| Référence | Ce qu'elle montre | À reprendre |
|---|---|---|
| [Leon Abboud — showreel](https://x.com/leonabboud/status/2103576084499358051) | Showreel de 15 s, orange, noir et crème, une scène par technique | Cadre fixe (coins en équerre, « SCENE 03/07 », timecode, nom de la technique), titre qui se dévoile par masque, mot répété en contour, chiffres qui défilent, graphique qui monte, sphère de particules, carte d'interface avec curseur, logo final |
| [Clément — agenda](https://x.com/cleeeeeeeeement/status/2108222854948917514) | Une fausse interface (Google Agenda) qui se remplit toute seule | Vraie interface crédible, compteurs qui montent par-dessus, dézoom final qui montre l'accumulation |
| [THISMA — BlueVisa](https://x.com/thismacapital/status/2104173625079451934) | Vidéo de lancement de site, même prompt sur deux modèles | Titres mot par mot, mot clé souligné en couleur, objets d'interface (carte d'embarquement, cartes qui se cochent, progression 4/6), carte du monde, logo + URL |
| [prompt-motion.com](https://prompt-motion.com) | Galerie de vidéos de motion faites par IA, avec leur prompt | Techniques : HTML/CSS/JS, Remotion, Three.js, Manim, Blender ; tout est du code, rendu image par image |
| [Gaurav — Fastlane](https://x.com/gauravsbuilding/status/2104370091672711402) | Vidéo de lancement produite en 12 h de travail continu (le plafond actuel) | Barre de recherche en verre avec trait lumineux rouge, tunnel de vignettes vidéo en perspective, téléphones en éventail 3D, calendrier incliné rempli de vignettes, chiffres géants en points LED (« 36.2M views »), circuit dessiné en ligne (TREND → LEARN → POST), logo chromé, sol réfléchissant rouge |
| [Gal Shir — Framer](https://x.com/galshirart/status/1975920588372771249) | Identité animée de Framer | Logo construit sur une grille de construction, extrusion 3D en verre et en métal, verre irisé, lettres qui s'espacent puis se resserrent, nuancier animé, mockups produits (casquette) |
| [Viktor Oddy — Figma motion](https://x.com/viktoroddy/status/2070831152248901804) | Tutoriel de 13 min : sites animés à 10 k$ dans Figma | Héros plein écran avec photo + titre géant, masques de texte sur image, cartes verticales qui se déploient, trajets animés sur carte, effets (bloom, distorsion, aberration chromatique) |
| [Viktor Oddy — ressources](https://x.com/viktoroddy/status/2099152986102796467) | Liste de galeries de design | Voir la liste ci-dessous |
| [Vox — 10 effets de défilement](https://x.com/voxyz_ai/status/2108324058739745228) | Les 10 noms des animations au défilement, avec une démo de chacune | Le vocabulaire commun pour décrire un mouvement (voir « Le vocabulaire du mouvement ») |

### Les galeries à consulter

1. [motionsites.ai](http://motionsites.ai) — 600+ sites 3D, 500+ fonds animés, sections animées, chacun avec son prompt.
2. [navbar.gallery](http://navbar.gallery) — barres de navigation.
3. [footer.design](http://footer.design) — pieds de page.
4. [cta.gallery](http://cta.gallery) — boutons d'appel à l'action.
5. [404s.design](http://404s.design) — pages 404.
6. [unsection.com](http://unsection.com) — sections de site complètes.
7. [bentogrids.com](http://bentogrids.com) — grilles « bento ».
8. [60fps.design](http://60fps.design) — micro-animations qui font « cher ».

## Ce qui rend ces vidéos professionnelles

- **Un système, pas une suite d'effets** : une seule famille de courbes, une grille, deux ou trois polices, une palette tenue du début à la fin.
- **Un fil conducteur visuel** qui traverse les scènes (un point, une forme, un trait lumineux) et des transitions qui naissent du mouvement de la scène précédente.
- **De la vraie matière** : verre, chrome, lumière, profondeur, reflets, grain, flou de mouvement.
- **Des interfaces crédibles** plutôt que des formes abstraites : barres de recherche, calendriers, téléphones, tableaux de bord.
- **Des chiffres qui bougent** : compteurs, grands nombres, jauges.
- **Le temps de respirer** : les meilleures pièces tiennent un plan assez longtemps pour qu'on le lise.

## Le vocabulaire du mouvement

Les 10 effets de défilement des sites web, traduits pour la vidéo : nos projets avancent
avec le temps (`render(t)`) et le trajet de la caméra, pas avec la molette. Nommer l'effet
voulu avec ces mots évite les malentendus.

| Effet | Sur un site | En motion design |
|---|---|---|
| Déclenché (*scroll-triggered*) | L'élément joue une fois en entrant dans l'écran | Entrée d'un élément à son moment : fondu, montée, masque |
| Lié (*scroll-linked*) | L'animation suit le défilement, et repart en arrière si on remonte | L'animation suit une progression (temps, trajet caméra) : jauge, rotation, compteur |
| Parallaxe | Premier plan et fond à des vitesses différentes | Couches décalées selon le mouvement de caméra (habillage 2D, 3D, fond) : la profondeur |
| Collant (*sticky*) | Un élément reste fixé pendant que le reste défile | Cadre fixe : rubrique, logo, timecode, bandeau |
| Épinglé (*pin*) | La section se fige, son contenu change étape par étape, puis elle repart | Plan tenu pendant que la scène se remplit (la régie, la check-list qui se coche) |
| Aimanté (*scroll snap*) | S'arrête toujours sur un panneau entier | Mouvement qui se pose net sur une composition, avec un léger dépassement |
| Horizontal | On descend, le contenu part vers la gauche | Travelling latéral, carrousel de cartes, bandeau qui défile |
| En cascade (*stagger*) | Un groupe de cartes entre l'une après l'autre | Écrans, cartes ou éclats qui arrivent avec un décalage régulier |
| Révélation du texte | Le paragraphe s'allume mot par mot | Titre ou citation qui s'allume mot par mot, au rythme de la lecture |
| Barre de progression | Une ligne grandit pour montrer où on en est | Chargement, compte à rebours ; dans une boucle, elle ne doit pas trahir le retour à zéro |

Règles de méthode reprises du même auteur :

- D'abord un tableau scène → effet → pourquoi, en listant aussi les scènes où rien ne colle :
  on n'ajoute pas un effet pour en avoir un. On valide avant de construire.
- N'animer que `transform` et `opacity` dans l'habillage HTML : c'est fluide en direct (source
  navigateur OBS) et rapide à rendre.
- Écrire d'abord un DESIGN.md (couleurs, tailles de texte, espacements, arrondis) et tout faire
  suivre : c'est le « système » de la section précédente, mis par écrit.

## Comment on produit (leçons de l'intro Kayzx TV)

- Composition en HTML/CSS/JS (Canvas, SVG ; Three.js possible) où chaque image est une fonction pure du temps `render(t)`.
- Rendu image par image avec Chromium (Playwright) : capture `Page.captureScreenshot` en PNG avec `optimizeForSpeed` (4× plus rapide que `page.screenshot`), plusieurs navigateurs en parallèle.
- Flou de mouvement : 4 sous-images par image, obturateur à 180°, moyennées par ffmpeg (`tmix`).
- Envoi dans la conversation limité à 30 Mo : réencoder en deux passes (≈ 6,3 Mb/s pour 35 s en 1080p60).
- Livrable attendu : un MP4, pas de README.

## Préférences de Kayzx TV

- Tout en français.
- Palette de la chaîne : forest teal, honey gold, mist gray.
- Animations spectaculaires, niveau studio ; prendre le temps plutôt que livrer vite.
