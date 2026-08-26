--!strict
--[[
	Mur — un mur percé d'ouvertures.

	Une porte ou une fenêtre n'est pas un trou : c'est un mur découpé en
	segments pleins, en allèges et en linteaux. Ce module fait cette découpe
	pour que les ouvertures soient déclarées par leurs cotes réelles plutôt
	que positionnées à la main.

	Toutes les valeurs sont en mètres.
]]

local Batir = require(script.Parent.Batir)

local Mur = {}

--- Une ouverture, repérée le long de l'axe du mur.
export type Ouverture = {
	nom: string,
	de: number,
	a: number,
	bas: number, -- allège : 0 pour une porte
	haut: number,
}

export type Params = {
	nom: string,
	parent: Instance,
	materiau: string,
	axe: "X" | "Z",
	fixe: number, -- la coordonnée constante : Z si le mur court selon X
	de: number,
	a: number,
	hauteur: number,
	epaisseur: number,
	ouvertures: { Ouverture }?,
}

local function segment(
	params: Params,
	index: number,
	de: number,
	a: number,
	bas: number,
	haut: number
)
	local longueur = a - de
	local hauteurSegment = haut - bas
	if longueur <= 0 or hauteurSegment <= 0 then
		return
	end

	local milieu = (de + a) / 2
	local milieuVertical = (bas + haut) / 2

	local taille: Vector3, position: Vector3
	if params.axe == "X" then
		taille = Vector3.new(longueur, hauteurSegment, params.epaisseur)
		position = Vector3.new(milieu, milieuVertical, params.fixe)
	else
		taille = Vector3.new(params.epaisseur, hauteurSegment, longueur)
		position = Vector3.new(params.fixe, milieuVertical, milieu)
	end

	Batir.bloc({
		nom = `{params.nom}_{index}`,
		parent = params.parent,
		materiau = params.materiau,
		tailleM = taille,
		positionM = position,
	})
end

--- Construit le mur et renvoie le nombre de segments produits.
function Mur.construire(params: Params): number
	local ouvertures = table.clone(params.ouvertures or {})
	table.sort(ouvertures, function(gauche, droite)
		return gauche.de < droite.de
	end)

	local index = 0
	local curseur = params.de

	for _, ouverture in ouvertures do
		if ouverture.de < curseur then
			error(`Mur "{params.nom}" : l'ouverture "{ouverture.nom}" en chevauche une autre`, 2)
		end

		if ouverture.de > curseur then
			index += 1
			segment(params, index, curseur, ouverture.de, 0, params.hauteur)
		end

		-- L'allège, sous la fenêtre. Une porte n'en a pas.
		index += 1
		segment(params, index, ouverture.de, ouverture.a, 0, ouverture.bas)

		-- Le linteau, au-dessus de l'ouverture.
		index += 1
		segment(params, index, ouverture.de, ouverture.a, ouverture.haut, params.hauteur)

		curseur = ouverture.a
	end

	if curseur < params.a then
		index += 1
		segment(params, index, curseur, params.a, 0, params.hauteur)
	end

	return index
end

return Mur
