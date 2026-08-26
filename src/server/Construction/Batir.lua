--!strict
--[[
	Batir — la primitive de construction.

	Tout ce qui est bâti passe par ici : une part ancrée, dimensionnée en
	mètres, et dont le matériau vient obligatoirement de la bibliothèque.

	Aucun autre module ne crée de `Part` directement. C'est ce qui garantit
	qu'aucune dimension n'est choisie à l'œil et qu'aucun matériau n'échappe au
	plafond de douze.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local Echelle = require(Partage.Charte.Echelle)
local Materiaux = require(Partage.Charte.Materiaux)

local Batir = {}

export type Bloc = {
	nom: string,
	parent: Instance,
	materiau: string,
	tailleM: Vector3, -- en mètres
	positionM: Vector3, -- en mètres, centre du bloc
	collision: boolean?,
	cframe: CFrame?, -- oriente le bloc ; remplace positionM si fourni
}

--- Un bloc ancré, dimensionné en mètres, matériau imposé.
function Batir.bloc(params: Bloc): Part
	local part = Instance.new("Part")
	part.Name = params.nom
	part.Anchored = true
	part.CanCollide = if params.collision == nil then true else params.collision
	part.CastShadow = true
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Size = Echelle.v(params.tailleM)

	Materiaux.appliquer(part, params.materiau)

	if params.cframe then
		part.CFrame = params.cframe
	else
		part.Position = Echelle.v(params.positionM)
	end

	part.Parent = params.parent
	return part
end

--- Un dossier nommé, pour garder l'arbre lisible dans l'explorateur.
function Batir.dossier(nom: string, parent: Instance): Folder
	local dossier = Instance.new("Folder")
	dossier.Name = nom
	dossier.Parent = parent
	return dossier
end

return Batir
