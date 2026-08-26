--!strict
--[[
	Palette — toutes les couleurs du projet.

	Cahier des charges §9.4 : deux palettes, une seule bibliothèque. Le local
	est clair, naturel et neuf ; le plateau est une boîte noire. Le contraste
	entre les deux est délibéré.

	Aucune couleur n'est écrite ailleurs que dans ce fichier.
]]

local Palette = {}

-- Le local : clair, naturel, neuf.
Palette.BlancPlatre = Color3.fromRGB(238, 238, 234)
Palette.CheneClair = Color3.fromRGB(198, 166, 120)
Palette.AluBrosse = Color3.fromRGB(176, 179, 183)
Palette.VerreClair = Color3.fromRGB(222, 232, 236)
Palette.GrisPerle = Color3.fromRGB(168, 170, 172)
Palette.TissuEcru = Color3.fromRGB(214, 205, 189)

-- Le plateau : la boîte noire.
Palette.NoirTechnique = Color3.fromRGB(24, 25, 27)
Palette.Anthracite = Color3.fromRGB(46, 48, 52)
Palette.AluNoirMat = Color3.fromRGB(34, 35, 38)
Palette.Plexiglas = Color3.fromRGB(196, 206, 212)

-- Commun.
Palette.BetonLisse = Color3.fromRGB(150, 149, 145)
Palette.CaoutchoucNoir = Color3.fromRGB(30, 30, 32)

-- Écrans et dalles LED.
Palette.LedRepos = Color3.fromRGB(58, 96, 140)
Palette.EcranEteint = Color3.fromRGB(18, 20, 24)

-- Températures de lumière. Une couleur de source reste une couleur : elle n'a
-- pas plus le droit d'être écrite ailleurs qu'une couleur de matériau.
Palette.LumiereChaude = Color3.fromRGB(255, 236, 210)
Palette.LumiereNeutre = Color3.fromRGB(246, 248, 252)
Palette.LumiereFroide = Color3.fromRGB(214, 228, 255)

-- Identité Kay Prod : provisoire, en attente de la charte de marque (§9.6).
-- Marquée comme telle pour qu'elle ne s'installe pas par oubli.
Palette.AccentProvisoire = Color3.fromRGB(228, 84, 48)

return Palette
