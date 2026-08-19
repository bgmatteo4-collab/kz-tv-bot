--!strict
--[[
	RoomBuilder — fabrique dans le monde les objets que le joueur a posés.

	Le serveur fait autorité sur la disposition de la pièce : c'est lui qui
	crée les objets, jamais le client. Ça coûte un aller-retour réseau à
	chaque pose, et ça garantit que deux joueurs verront la même chose le
	jour où les collaborations arriveront.

	La forme des objets vient de Shared/Build/ModelBuilder, partagé avec le
	fantôme du mode construction : ce que le joueur voit avant de poser est
	littéralement ce qu'il obtient.
]]

local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Catalogue = require(Shared.Config.Catalogue)
local Placement = require(Shared.Config.Placement)
local ModelBuilder = require(Shared.Build.ModelBuilder)

local RoomBuilder = {}

local FOLDER_NAME = "PlacedItems"

-- Pièces qui émettent la lumière selon la recette du luminaire.
local EMISSIVE_NAMES = { "Ring", "Diffuser", "Tube", "Cell", "Glow" }

local function getFolder(): Folder
	local folder = workspace:FindFirstChild(FOLDER_NAME)
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = FOLDER_NAME
		folder.Parent = workspace
	end
	return folder :: Folder
end

local function findEmissive(model: Model): BasePart?
	for _, name in ipairs(EMISSIVE_NAMES) do
		local found = model:FindFirstChild(name)
		if found and found:IsA("BasePart") then
			return found
		end
	end
	return model.PrimaryPart
end

--- Les luminaires éclairent vraiment la pièce : c'est la moitié de
--- l'intérêt d'en poser un, et ça se voit immédiatement.
local function addLight(model: Model, item)
	local emitter = findEmissive(model)
	if not emitter then
		return
	end

	local light = Instance.new("PointLight")
	light.Brightness = item.quality and (0.8 + item.quality * 1.8) or 1.2
	light.Range = item.category == "led" and 14 or 22
	light.Color = emitter.Color
	light.Parent = emitter
end

local function spawn(entry, item): Model
	local cframe = Placement.ToCFrame(entry.x, entry.y, entry.z, entry.yaw)
	local model = ModelBuilder.build(item, cframe)
	model.Name = string.format("%s_%d", item.id, entry.uid)

	local uid = Instance.new("IntValue")
	uid.Name = "Uid"
	uid.Value = entry.uid
	uid.Parent = model

	if item.family == "lighting" and item.category ~= "hub" then
		addLight(model, item)
	end

	-- Un écran posé devient un vrai écran : le client y montera une
	-- instance de KZ OS, exactement comme sur le moniteur d'origine. Seule
	-- la dalle porte le tag, pas le boîtier.
	if Placement.IsScreen(item) then
		local screen = model:FindFirstChild("Screen")
		if screen and screen:IsA("BasePart") then
			-- La dalle doit redevenir interrogeable, sinon le raycast qui
			-- convertit la position du curseur la traverse.
			screen.CanQuery = true
			CollectionService:AddTag(screen, "ComputerScreen")

			-- L'invite d'interaction suit l'écran : le joueur peut déplacer
			-- son moniteur, il restera utilisable là où il le pose.
			if item.category == "display" then
				local prompt = Instance.new("ProximityPrompt")
				prompt.Name = "UseComputer"
				prompt.ObjectText = "Ordinateur"
				prompt.ActionText = "S'installer"
				prompt.KeyboardKeyCode = Enum.KeyCode.E
				prompt.HoldDuration = 0
				prompt.MaxActivationDistance = 12
				prompt.RequiresLineOfSight = false
				prompt.Parent = screen
			end
		end
	end

	model.Parent = getFolder()
	return model
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
