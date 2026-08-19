--!strict
--[[
	RoomBuilder — fabrique dans le monde les objets que le joueur a posés.

	Le serveur fait autorité sur la disposition de la pièce : c'est lui qui
	crée les parts, jamais le client. Ça coûte un aller-retour réseau à
	chaque pose, et ça garantit que deux joueurs verront la même chose le
	jour où les collaborations arriveront.

	Faute de modèles 3D, chaque objet est une boîte à ses dimensions
	réelles, colorée par la palette de son style. Le jour où les vrais
	modèles existeront, seule la fonction `spawn` changera.
]]

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Catalogue = require(Shared.Config.Catalogue)
local Placement = require(Shared.Config.Placement)

local RoomBuilder = {}

local FOLDER_NAME = "PlacedItems"

local function getFolder(): Folder
	local folder = workspace:FindFirstChild(FOLDER_NAME)
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
		folder.Parent = workspace
	end
	return folder :: Folder
end

local function spawn(entry, item): BasePart
	local size = Placement.GetSize(item)

	local part = Instance.new("Part")
	part.Name = string.format("%s_%d", item.id, entry.uid)
	part.Size = size
	part.CFrame = Placement.ToCFrame(entry.x, entry.y, entry.z, entry.yaw)
	part.Color = Placement.GetColor(item)
	part.Anchored = true
	part.Material = Enum.Material.SmoothPlastic
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth

	-- On ne bloque pas le passage : un joueur coincé derrière son propre
	-- meuble est une frustration gratuite tant qu'on n'a pas de vrais
	-- volumes de collision.
	part.CanCollide = false

	local uid = Instance.new("IntValue")
	uid.Name = "Uid"
	uid.Value = entry.uid
	uid.Parent = part

	-- Les luminaires éclairent vraiment : c'est la moitié de l'intérêt
	-- d'en poser un, et ça se voit immédiatement dans la pièce.
	if item.family == "lighting" and item.category ~= "hub" then
		local light = Instance.new("PointLight")
		light.Brightness = item.quality and (0.8 + item.quality * 1.6) or 1
		light.Range = 18
		light.Color = Placement.GetColor(item)
		light.Parent = part
		part.Material = Enum.Material.Neon
	end

	-- Un écran posé devient un vrai écran : le client y montera une
	-- instance de KZ OS, exactement comme sur le moniteur d'origine.
	if Placement.IsScreen(item) then
		part.Color = Color3.fromRGB(6, 7, 10)
		part.Material = Enum.Material.SmoothPlastic
		CollectionService:AddTag(part, "ComputerScreen")
	end

	part.Parent = getFolder()
	return part
end

--- Reconstruit toute la pièce à partir de l'état. Appelé après chaque
--- changement : c'est plus simple à raisonner qu'une mise à jour
--- incrémentale, et le nombre d'objets restera de l'ordre de la dizaine.
function RoomBuilder.rebuild(placed: { any })
	local folder = getFolder()
	folder:ClearAllChildren()

	for _, entry in ipairs(placed) do
		local item = Catalogue.Get(entry.itemId)
		if item then
			spawn(entry, item)
		end
	end
end

return RoomBuilder
