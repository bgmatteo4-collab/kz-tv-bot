--!strict
--[[
	Plateau — les cotes du plateau et de sa régie, en MÈTRES.

	Cahier des charges §5.2 et §9.1 : toute dimension vient du réel. Ce fichier
	est de la donnée pure, sans une ligne de logique. Modifier une cote ici
	suffit à modifier la construction.

	Repère : le plateau est centré sur l'origine, sol à Y = 0.
	         X va de -8 à +8, Z va de -6 à +6.
	         La régie est accolée au nord, de Z = +6 à Z = +11.
]]

return {
	plateau = {
		largeur = 16, -- axe X
		profondeur = 12, -- axe Z
		hauteur = 7, -- sous plafond, non négociable (CDC §5.2)
	},

	regie = {
		largeur = 7,
		profondeur = 5,
		hauteur = 3,
	},

	epaisseurMur = 0.2,
	epaisseurDalle = 0.2,

	--- Le grill technique : la grille de poutres qui porte les projecteurs.
	grill = {
		hauteur = 5.5,
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
		-- 1,20 m et non 0,90 : l'avatar Roblox est proportionnellement bien
		-- plus large qu'un humain. Une porte de bureau standard deviendrait un
		-- goulot d'étranglement (backlog V2).
		largeur = 1.2,
		hauteur = 2.1,
		centreX = 2.6,
	},

	--- Porte de service, à l'ouest : par où passe le matériel.
	porteService = {
		largeur = 2,
		hauteur = 2.5,
		centreZ = 0,
	},

	--- Le mur LED : le fond de la configuration talk-show, contre le mur sud.
	fond = {
		largeur = 10,
		hauteur = 3.5,
		retrait = 0.25, -- décollé du mur, monté sur ossature comme un vrai
		allege = 0.5, -- posé sur un socle bas, pas à même le sol
		panneau = 0.5, -- un module LED fait 50 cm de côté
		joint = 0.012, -- l'interstice entre deux dalles, qui se voit toujours
	},
}
