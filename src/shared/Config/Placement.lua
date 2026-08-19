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

--- Pas de la grille, en studs. À l'échelle du projet, un stud fait 25 cm :
--- un pas d'un stud empêcherait de poser proprement une souris ou un
--- clavier sur un bureau.
Placement.GridSize = 0.5

--- Pas de rotation, en degrés.
Placement.RotationStep = 15

--- Distance maximale de pose depuis le joueur.
Placement.MaxReach = 24

--- Hauteur d'accrochage par défaut d'un objet mural.
Placement.WallHeight = 5

--- Les catégories d'objets qui portent une interface projetée.
local SCREEN_CATEGORIES = { display = true, decoscreen = true }

--- L'encombrement réel d'un objet.
---
--- ÉCHELLE DU PROJET : 1 stud = 25 cm, un personnage Roblox mesurant à peu
--- près 5 studs. Toutes les dimensions du catalogue en découlent — une
--- webcam fait 0,4 stud, pas 1. La seule entorse assumée concerne les
--- écrans, agrandis d'environ 40 % par rapport au réel : une dalle de
--- 24 pouces à l'échelle exacte rendrait l'interface projetée dessus
--- inutilisable.
function Placement.GetSize(item: any): Vector3
	local footprint = item.footprint or Vector2.new(1, 1)
	local height = item.height or 1
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
