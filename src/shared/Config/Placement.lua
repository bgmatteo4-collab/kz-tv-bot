--!strict
--[[
	Placement — les règles communes au mode construction.

	Le client et le serveur partagent ce module : le client s'en sert pour
	afficher le fantôme, le serveur pour valider ce qu'on lui envoie. Une
	seule source de vérité, sinon le jour où un joueur bidouille son client
	on ne saurait plus quoi refuser.

	Tant qu'aucun modèle 3D n'existe, un objet est représenté par une boîte
	à ses dimensions réelles, colorée par la palette de son style. C'est
	moche et c'est jouable, ce qui est exactement ce qu'on veut à ce stade.
]]

local Styles = require(script.Parent.Styles)

local Placement = {}

--- Pas de la grille, en studs. Un pas d'un stud garde de la précision sans
--- laisser poser un meuble de travers.
Placement.GridSize = 1

--- Pas de rotation, en degrés.
Placement.RotationStep = 15

--- Distance maximale de pose depuis le joueur.
Placement.MaxReach = 40

--- Hauteur d'accrochage par défaut d'un objet mural.
Placement.WallHeight = 7

-- Hauteur d'un objet selon sa catégorie, faute de modèles 3D. Ces valeurs
-- servent uniquement au volume de collision et au rendu provisoire.
local HEIGHT_BY_CATEGORY: { [string]: number } = {
	desk = 3.6,
	chair = 3.6,
	storage = 3.2,
	guest = 2.8,
	audience = 4.5,

	camera = 1.2,
	microphone = 2.2,
	computer = 5,
	streamdeck = 0.6,
	capture = 0.5,
	audio = 0.7,
	backdrop = 8,

	key = 6,
	fill = 5.5,
	rim = 6,
	hub = 0.6,
	led = 0.4,

	acoustic = 0.4,
	wall = 0.2,
	object = 3,

	strip = 0.4,
	extension = 0.3,
	ups = 1.6,
	circuit = 0.4,
}

--- Les écrans gardent un rapport 16:9, sinon l'interface projetée dessus
--- se retrouve étirée et illisible.
local SCREEN_CATEGORIES = { display = true, decoscreen = true }

function Placement.GetSize(item: any): Vector3
	local footprint = item.footprint or Vector2.new(2, 2)

	if SCREEN_CATEGORIES[item.category] then
		return Vector3.new(footprint.X, footprint.X * 9 / 16, 0.35)
	end

	local height = HEIGHT_BY_CATEGORY[item.category] or 2
	return Vector3.new(footprint.X, height, footprint.Y)
end

function Placement.GetColor(item: any): Color3
	local style = item.style and Styles.Get(item.style)
	if style and style.palette[1] then
		return style.palette[1]
	end
	return Color3.fromRGB(120, 120, 130)
end

function Placement.IsScreen(item: any): boolean
	return SCREEN_CATEGORIES[item.category] == true
end

function Placement.SnapToGrid(position: Vector3): Vector3
	local grid = Placement.GridSize
	return Vector3.new(
		math.round(position.X / grid) * grid,
		position.Y,
		math.round(position.Z / grid) * grid
	)
end

function Placement.SnapAngle(degrees: number): number
	local step = Placement.RotationStep
	return (math.round(degrees / step) * step) % 360
end

--- Reconstruit le repère d'un objet posé à partir de ce qui est
--- sauvegardé : une position et un cap. Pas de CFrame complète — inutile
--- pour du mobilier, et bien plus léger à stocker.
function Placement.ToCFrame(x: number, y: number, z: number, yaw: number): CFrame
	return CFrame.new(x, y, z) * CFrame.Angles(0, math.rad(yaw), 0)
end

--- La surface visée convient-elle à cet objet ? Un objet mural veut une
--- paroi verticale, tout le reste veut un dessus à peu près horizontal.
function Placement.AcceptsSurface(item: any, normal: Vector3): boolean
	if item.surface == "wall" then
		return math.abs(normal.Y) < 0.5
	end
	return normal.Y > 0.5
end

return Placement
