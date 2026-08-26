# Notes de version — Le Local by Kay Prod

Journal de ce qui a été **livré**. Une entrée n'apparaît ici qu'une fois la
version terminée au sens du §18 du [cahier des charges](CDC.md).

Numérotation : `v0.x` en développement, `v1.0` à la première sortie publique,
puis `MAJEUR.MINEUR.CORRECTIF`.

---

## Non publié — conception

Le projet est en phase de conception. Aucun code n'a été écrit.

**Fait**
- Remise à zéro du dépôt : le projet précédent, sans rapport, a été retiré.
- Analyse de la vision et arbitrage des grandes directions.
- **Trente décisions structurantes** tranchées, datées et consignées (CDC §4).
- Cahier des charges complet : 23 sections, du programme des espaces aux
  budgets de performance.
- Charte d'échelle posée et vérifiée (1 m = 3 studs).
- Plan du local validé : 12 espaces, 671 m² utiles, de plain-pied.
- Feuille de route en sept versions, ordonnée par le risque à retirer d'abord.
- Cycle cahier des charges / backlog / notes de version en place.

**Corrigé pendant la conception**
- Le plan ne tenait pas dans son enveloppe (29 m² pour tous les murs au lieu de
  la centaine nécessaire). Emprise portée à 96 × 72 studs.
- Le montage du plateau était décrit comme une manutention depuis la réserve,
  ce que la décision « objets instantanés » a rendu caduc. Section réécrite.

---

## v0.1 — preuve de direction artistique

> **Livrée, en attente de validation en moteur.** Au sens du §18 du cahier des
> charges, une version n'est terminée qu'une fois testée. Le code est écrit,
> compilé et construit ; il n'a pas encore tourné dans Studio. La v0.2 ne
> démarre pas avant que les mesures soient faites.

Cette version ne contient **aucune mécanique de jeu** : ni placement, ni
sauvegarde, ni production. C'est délibéré. Elle répond à une seule question —
le réalisme poussé tient-il dans les budgets de performance du §14 ?

**Le décor**
- Plateau bâti aux cotes réelles : 12 × 10 m dans œuvre, 6 m sous plafond.
- Régie attenante de 6 × 5 m, avec sa vitre sur le plateau depuis derrière les
  caméras.
- Grill technique à 4,80 m : cinq poutres transversales, trois longitudinales.
- Fond de scène habillé, décollé du mur comme un vrai panneau sur ossature.
- Portes de service à deux vantaux et porte de régie, ouvertes en position de
  travail.
- **Un sas d'entrée en palette claire**, ajouté au périmètre : sans lui, une
  version entièrement noire ne permettrait pas de valider le contraste
  clair/boîte noire, qui est la décision artistique centrale (§9.4). Le joueur
  apparaît dedans et entre dans le studio par la porte de service.

**La charte, appliquée et vérifiable**
- Échelle unique : 1 m = 3 studs, dans un seul fichier. Aucune cote n'est écrite
  en studs ailleurs.
- Bibliothèque de douze matériaux exactement, plafond vérifié au démarrage —
  la construction échoue si on le dépasse.
- Toutes les couleurs dans un seul fichier, températures de lumière comprises.
- Plan de feu en trois points plus lavage de fond ; trois sources à ombre sur un
  budget de douze, vérifié à la construction.

**L'instrumentation**
- Panneau de diagnostic (`F3`) : images par seconde, plancher observé après
  trois secondes de chargement, hauteur mesurée de l'avatar avec son écart à la
  valeur attendue, position en mètres.
- Bascule première / troisième personne (`V`).
- Le serveur avertit si l'éclairage n'est pas en `Future` ou si le chargement
  par flux est désactivé.

**L'outillage**
- Rojo, StyLua et Selene épinglés par Aftman. Aucun binaire versionné.
- Intégration continue : syntaxe Luau, contrôle de format, construction du
  place. Le place jouable est produit par la CI, jamais committé.

**Corrigé pendant le développement, par auto-audit**
- `CFrame.lookAt` dégénérait sur les plafonniers de régie, qui visent droit vers
  le bas : la direction était parallèle au vecteur haut par défaut, produisant
  une orientation invalide. Vecteur haut basculé dans ce cas.
- La grille du grill n'était pas centrée : elle démarrait à une maille pleine du
  mur au lieu d'une demi-maille, laissant deux retombées inégales.
- Le plancher d'images par seconde retenait les premières images du chargement,
  ce qui l'aurait figé sur une valeur fausse pour toute la session.
- Les couleurs d'ambiance du fichier Rojo étaient écrites en octets alors que le
  format attend des flottants de 0 à 1.

**Corrigé au premier lancement réel**
- **Le sas d'entrée n'avait aucune source de lumière.** L'ambiance générale est
  réglée sur noir absolu, comme il se doit pour un studio : toute pièce fermée
  sans lampe est donc parfaitement aveugle. C'était justement la pièce où le
  joueur apparaît. Plan de feu ajouté.
- L'ambiance générale passe de noir absolu à une valeur très basse : plus rien
  ne peut être un trou noir, et la boîte noire reste noire.
- La construction est désormais protégée. Une erreur ne peut plus se traduire
  par un écran noir muet : le joueur atterrit sur une dalle de secours éclairée,
  la console affiche la cause, et le panneau `F3` affiche `DÉCOR ÉCHEC` avec le
  message. Un défaut invisible est pire qu'un défaut bruyant.

**Ce qui n'est pas dans cette version, et pourquoi**
Le mobilier de la configuration talk-show — canapés, table basse, caméras —
demande de vrais modèles 3D. Plutôt que de poser des cubes en attendant, ils
sont absents et inscrits en dette (backlog T3). Le §17.1 interdit le placeholder
dans une version livrée ; la boîte, elle, est finie.

**Prochaine étape**
Ouvrir la v0.1 dans Studio et faire les cinq mesures listées dans
[INSTALLATION.md](INSTALLATION.md). Elles décident si la v0.2 démarre ou si la
charte doit être révisée.
