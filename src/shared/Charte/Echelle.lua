--!strict
--[[
	Echelle — la règle fondatrice du projet.

	Cahier des charges §9.1 : **1 mètre = 3 studs**, sans exception.

	Aucune dimension du jeu n'est choisie à l'œil. Tout objet déclare sa cote
	réelle en mètres, et la conversion se fait ici. Un seul endroit à corriger
	si la mesure de l'avatar en moteur nous oblige à réviser le rapport.
]]

local Echelle = {}

--- Le rapport fondateur. Ne jamais l'écrire ailleurs.
Echelle.STUDS_PAR_METRE = 3.5

--- Hauteur d'avatar mesurée en moteur le 26/08 (backlog V1, résolu).
--- 6,12 studs ÷ 3,5 = 1,749 m, soit la taille moyenne d'un adulte.
---
--- L'hypothèse initiale de 5,2 studs était fausse de 18 %. À l'ancienne
--- échelle, une porte n'était que 3 % plus haute que le personnage : tout le
--- bâtiment aurait paru écrasé sans qu'on sache pourquoi.
---
--- Réserve : la taille d'un avatar Roblox varie d'un joueur à l'autre. La
--- charte se cale sur un avatar adulte standard, pas sur les extrêmes.
Echelle.AVATAR_ATTENDU_STUDS = 6.12

--- Mètres vers studs.
function Echelle.m(metres: number): number
	return metres * Echelle.STUDS_PAR_METRE
end

--- Studs vers mètres. Utile pour afficher une mesure prise en moteur.
function Echelle.enMetres(studs: number): number
	return studs / Echelle.STUDS_PAR_METRE
end

--- Une taille de part, déclarée en mètres (largeur, hauteur, profondeur).
function Echelle.taille(largeur: number, hauteur: number, profondeur: number): Vector3
	return Vector3.new(Echelle.m(largeur), Echelle.m(hauteur), Echelle.m(profondeur))
end

--- Un vecteur entier déclaré en mètres : taille ou position.
function Echelle.v(metres: Vector3): Vector3
	return metres * Echelle.STUDS_PAR_METRE
end

--- Une position, déclarée en mètres.
function Echelle.position(x: number, y: number, z: number): Vector3
	return Vector3.new(Echelle.m(x), Echelle.m(y), Echelle.m(z))
end

return Echelle
