--!strict
--[[
	Plateau — les cotes du plateau et de sa régie, en MÈTRES.

	Cahier des charges §5.2 et §9.1 : toute dimension vient du réel. Ce fichier
	est de la donnée pure, sans une ligne de logique. Modifier une cote ici
	suffit à modifier la construction.

	Repère : le plateau est centré sur l'origine, sol à Y = 0.
	         X va de -6 à +6, Z va de -5 à +5.
	         La régie est accolée au nord, de Z = +5 à Z = +10.
]]

return {
	plateau = {
		largeur = 12, -- axe X
		profondeur = 10, -- axe Z
		hauteur = 6, -- sous plafond, non négociable (CDC §5.2)
	},

	regie = {
		largeur = 6,
		profondeur = 5,
		hauteur = 3,
	},

	epaisseurMur = 0.2,
	epaisseurDalle = 0.2,

	--- Le grill technique : la grille de poutres qui porte les projecteurs.
	grill = {
		hauteur = 4.8,
		section = 0.3,
		pas = 2, -- une poutre transversale tous les 2 m
	},

	--- La vitre de la régie, qui donne sur le plateau depuis derrière les caméras.
	vitre = {
		largeur = 3,
		hauteur = 1.2,
		allege = 1.1, -- hauteur du bas de la vitre
		centreX = -0.75,
	},

	--- Porte de communication entre la régie et le plateau.
	porteRegie = {
		largeur = 0.9,
		hauteur = 2.1,
		centreX = 2.2,
	},

	--- Porte de service, à l'ouest : par où passe le matériel.
	porteService = {
		largeur = 2,
		hauteur = 2.5,
		centreZ = 0,
	},

	--- Le fond habillé de la configuration talk-show, contre le mur sud.
	fond = {
		largeur = 8,
		hauteur = 3.2,
		retrait = 0.15, -- décollé du mur, comme un vrai panneau monté sur ossature
	},
}
