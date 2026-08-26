--!strict
--[[
	Equipement — l'implantation du plateau et de la régie, en MÈTRES.

	Données pures, comme `Config/Plateau`. Déplacer une caméra ou élargir les
	gradins se fait ici, sans toucher au code qui les bâtit.

	Repère : plateau centré sur l'origine, sol fini à Y = 0.
	Le décor est au sud (Z négatif), les caméras et le public au nord.
]]

return {
	--- L'estrade sur laquelle vit le décor. Un plateau sans praticable est un
	--- gymnase : c'est lui qui donne l'assise et la ligne de sol.
	praticable = {
		largeur = 9,
		-- Le praticable s'arrête devant le mur LED, il ne monte pas dessus :
		-- le mur repose au sol, derrière, comme dans un vrai studio.
		profondeur = 5,
		hauteur = 0.4,
		centreZ = -2.95,
		marche = 0.2, -- hauteur d'une marche ; deux marches pour monter
	},

	--- Traitement acoustique des murs latéraux : des panneaux, pas un aplat.
	acoustique = {
		largeur = 1.2,
		hauteur = 2.4,
		allege = 0.3,
		jeu = 0.1, -- l'espace entre deux panneaux, qui se voit
		epaisseur = 0.08,
	},

	--- Les caméras : une frontale, deux latérales. Hauteur d'objectif à 1,45 m,
	--- soit la hauteur d'œil d'une personne assise — c'est ce qui donne un
	--- cadrage juste et non une contre-plongée.
	cameras = {
		{ nom = "Frontale", x = 0, z = 2.6, hauteurObjectif = 1.45 },
		{ nom = "LateraleGauche", x = -4.6, z = 1.4, hauteurObjectif = 1.45 },
		{ nom = "LateraleDroite", x = 4.6, z = 1.4, hauteurObjectif = 1.45 },
	},

	--- Le public : trois rangs sur gradins, face au décor.
	gradins = {
		rangs = 3,
		placesParRang = 5,
		largeur = 7,
		-- Décalés vers l'ouest : centrés, ils condamneraient la porte de la
		-- régie, qui est à l'est du mur nord.
		centreX = -1.6,
		profondeurRang = 0.9,
		hauteurRang = 0.45,
		premierZ = 3.1,
	},

	--- La régie : pupitre en L et mur de moniteurs.
	regie = {
		pupitreProfondeur = 0.8,
		pupitreHauteur = 0.74,
		moniteursColonnes = 3,
		moniteursRangs = 3,
		moniteurLargeur = 0.62,
		moniteurHauteur = 0.36,
		moniteurJeu = 0.05,
	},

	--- Le mobilier de plateau réellement modélisable. Canapés et fauteuils
	--- attendent de vrais modèles (backlog T3) et ne sont pas approximés.
	mobilier = {
		pupitreLargeur = 2.4,
		pupitreProfondeur = 0.7,
		pupitreHauteur = 1.05, -- pupitre debout, pas bureau assis
		tabouretCote = 0.42,
		tabouretHauteur = 0.72,
	},
}
