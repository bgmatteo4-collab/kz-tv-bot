---
name: direction-artistique
description: À utiliser dès qu'on écrit ou modifie du visuel dans TOUCHLINE — CSS, composants, couleurs, typographie, animation, libellés d'interface. Impose la direction artistique du produit et interdit l'improvisation graphique. Se déclenche pour : styles, tokens, nouveau module d'overlay, panneau de régie, icône, transition, texte affiché à l'écran.
---

# Direction artistique — application

`docs/DESIGN_SYSTEM.md` fait autorité. Le lire avant de styler quoi que ce soit.

## Règle de base

**Aucune valeur visuelle en dur.** Pas un hex, pas un `px` de rayon, pas une durée
d'animation écrite directement dans un composant. Tout passe par les tokens de
`partage/design/`.

Si une valeur manque, on ne l'invente pas dans le composant : on l'ajoute au design system,
on explique pourquoi, et on l'utilise ensuite. Une exception tolérée devient dix en trois
semaines, et le produit perd sa cohérence.

## Les points qui sautent le plus vite

- **Une seule lame ambre par module.** L'accent `--signal` ne colorie pas du texte. Un
  module avec trois éléments ambre est raté.
- **Rayon 3px partout**, y compris les boutons. Pas d'exception esthétique.
- **Rien n'apparaît en fondu.** Tout se déplie depuis sa lame. Le fondu est le réflexe par
  défaut, et c'est précisément celui qu'on refuse ici.
- **Pas de texte sans bloc opaque derrière.** Pas d'ombre portée pour rattraper.
- **Espacement en multiples de 4.** Échelle typo : 11 / 13 / 15 / 18 / 24 / 32 / 44 / 64 /
  88, rien entre deux. Le 88 est réservé au score du bandeau haut.
- **Pas d'emoji.** Icônes vectorielles, trait 1.5px, jeu unique.
- **Un score qui change monte**, il n'apparaît pas. Réservé aux valeurs rares : jamais le
  chrono, qui s'animerait soixante fois par minute.
- **Le cadre ne porte pas de lame et ne s'anime jamais.** Il est le sol. Seule la scène
  centrale entre et sort.
- **La scène n'est jamais vide.** Il n'y a pas de vidéo derrière pour rattraper un trou.

## Densité selon la surface

- **Le cadre** : respire. Il est permanent, et un cadre chargé fatigue au bout de deux
  heures de direct. En cas de doute, retirer.
- **La scène** : dense. C'est elle qu'on regarde, et elle ne dure qu'un moment.
- **Régie** : dense. Elle occupe un écran entier, tout doit être atteignable sans défilement
  et sans lecture. Un contrôle fréquent est gros et toujours au même endroit.

## Écriture

Les mots sont du matériau de design, pas de la décoration.

- Français, sentence case, verbes à l'infinitif ou à l'impératif.
- Un bouton dit ce qu'il fait : « Afficher le score », pas « Score ON ».
- Le mot reste le même dans tout le parcours : « Diffuser » produit « Diffusé ».
- Une erreur dit ce qui s'est passé et quoi faire. Elle ne s'excuse pas, elle n'est jamais
  vague.
- Un écran vide propose une action.

## Autocritique avant de livrer

Regarder le résultat et retirer un élément. Si le module reste compréhensible sans lui,
il ne devait pas y être.

Puis vérifier trois choses, dans cet ordre :

1. **La hiérarchie tient sans béquille.** Il n'y a pas de vidéo derrière pour occuper
   l'œil : si le regard ne sait pas où aller, c'est la composition qui est en cause.
2. **Rien n'entre dans la scène quand la webcam l'occupe.** C'est la seule surface que
   nous ne maîtrisons pas.
3. **Ça tient deux heures.** Regarder le module fixement une minute. S'il agace, il
   agacera cent fois plus en direct.
