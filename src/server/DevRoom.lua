--!strict
--[[
	DevRoom — la chambre de test, construite par code.

	Elle n'est plus dimensionnée au hasard : à l'échelle du projet
	(1 stud = 25 cm), elle fait 4 m sur 3,5 m sous 2,5 m de plafond. C'est
	une vraie chambre, et c'est ce qui manquait — le volume précédent était
	deux fois trop grand, donc vide, gris et carcéral quoi qu'on y pose.

	Le mobilier n'est pas ici : il fait partie des objets posés du joueur et
	passe par RoomBuilder. Cette pièce ne fournit que la coquille, le lit et
	la lumière.

	⚠️ Piège Roblox : la face « Front » d'une part pointe vers son -Z LOCAL.
	Tout ce qui doit regarder le joueur est donc orienté explicitement.
]]

local Lighting = game:GetService("Lighting")

local DevRoom = {}

-- 4 m x 3,5 m sous 2,5 m de plafond.
local ROOM = Vector3.new(16, 10, 14)
local WALL = 0.6

local PALETTE = {
	floor = Color3.fromRGB(158, 118, 84),
	skirting = Color3.fromRGB(238, 234, 226),
	wall = Color3.fromRGB(206, 196, 182),
	wallLower = Color3.fromRGB(188, 176, 160),
	ceiling = Color3.fromRGB(240, 238, 234),
	frame = Color3.fromRGB(238, 234, 226),
	night = Color3.fromRGB(46, 62, 104),
	door = Color3.fromRGB(228, 222, 212),
	handle = Color3.fromRGB(186, 158, 96),
	bed = Color3.fromRGB(126, 96, 70),
	fabric = Color3.fromRGB(122, 132, 158),
	sheets = Color3.fromRGB(238, 236, 232),
	rug = Color3.fromRGB(150, 128, 118),
}

local function part(name: string, size: Vector3, cframe: CFrame, color: Color3, parent: Instance): Part
	local instance = Instance.new("Part")
	instance.Name = name
	instance.Size = size
	instance.CFrame = cframe
	instance.Color = color
	instance.Anchored = true
	instance.TopSurface = Enum.SurfaceType.Smooth
	instance.BottomSurface = Enum.SurfaceType.Smooth
	instance.Material = Enum.Material.SmoothPlastic
	instance.Parent = parent
	return instance
end

--- Une paroi complète : le mur, sa plinthe et sa cimaise. Les trois lignes
--- horizontales sont ce qui distingue une pièce d'une boîte — sans elles,
--- un aplat de couleur reste un aplat de couleur.
local function wall(name: string, size: Vector3, cframe: CFrame, room: Model, alongX: boolean)
	part(name, size, cframe, PALETTE.wall, room)

	local length = alongX and size.X or size.Z
	local thickness = 0.12
	local skirtingSize = alongX and Vector3.new(length, 0.55, thickness) or Vector3.new(thickness, 0.55, length)
	local railSize = alongX and Vector3.new(length, 0.18, thickness) or Vector3.new(thickness, 0.18, length)

	-- Le bandeau bas est décalé vers l'intérieur de la pièce.
	local inward = alongX and Vector3.new(0, 0, size.Z / 2 + thickness / 2) or Vector3.new(size.X / 2 + thickness / 2, 0, 0)
	local sign = if cframe.Position.X > 0 or cframe.Position.Z > 0 then -1 else 1

	part(name .. "Skirting", skirtingSize, cframe * CFrame.new(inward * sign) * CFrame.new(0, -ROOM.Y / 2 + 0.28, 0), PALETTE.skirting, room)
	part(name .. "Rail", railSize, cframe * CFrame.new(inward * sign) * CFrame.new(0, -ROOM.Y / 2 + 3.4, 0), PALETTE.skirting, room)
end

local function buildShell(room: Model)
	local halfX, halfZ, halfY = ROOM.X / 2, ROOM.Z / 2, ROOM.Y / 2

	local floor = part("Floor", Vector3.new(ROOM.X, WALL, ROOM.Z), CFrame.new(0, -WALL / 2, 0), PALETTE.floor, room)
	floor.Material = Enum.Material.WoodPlanks

	part("Ceiling", Vector3.new(ROOM.X, WALL, ROOM.Z), CFrame.new(0, ROOM.Y + WALL / 2, 0), PALETTE.ceiling, room)

	wall("WallBack", Vector3.new(ROOM.X, ROOM.Y, WALL), CFrame.new(0, halfY, -halfZ - WALL / 2), room, true)
	wall("WallFront", Vector3.new(ROOM.X, ROOM.Y, WALL), CFrame.new(0, halfY, halfZ + WALL / 2), room, true)
	wall("WallLeft", Vector3.new(WALL, ROOM.Y, ROOM.Z), CFrame.new(-halfX - WALL / 2, halfY, 0), room, false)
	wall("WallRight", Vector3.new(WALL, ROOM.Y, ROOM.Z), CFrame.new(halfX + WALL / 2, halfY, 0), room, false)
end

--- La fenêtre. Elle donne la seule lumière froide de la pièce et évite
--- l'effet boîte fermée, qui était le vrai défaut du décor précédent.
local function buildWindow(room: Model)
	local halfX = ROOM.X / 2
	local center = CFrame.new(-halfX - 0.1, 5.4, 1)

	local glass = part("WindowGlass", Vector3.new(0.25, 4.2, 5.2), center, PALETTE.night, room)
	glass.Material = Enum.Material.Neon

	-- Encadrement et croisillons.
	part("WindowFrameTop", Vector3.new(0.4, 0.4, 5.9), center * CFrame.new(0, 2.3, 0), PALETTE.frame, room)
	part("WindowFrameBottom", Vector3.new(0.4, 0.5, 5.9), center * CFrame.new(0, -2.35, 0), PALETTE.frame, room)
	part("WindowFrameLeft", Vector3.new(0.4, 5, 0.4), center * CFrame.new(0, 0, -2.75), PALETTE.frame, room)
	part("WindowFrameRight", Vector3.new(0.4, 5, 0.4), center * CFrame.new(0, 0, 2.75), PALETTE.frame, room)
	part("WindowMullion", Vector3.new(0.3, 4.2, 0.22), center * CFrame.new(0.05, 0, 0), PALETTE.frame, room)
	part("WindowSill", Vector3.new(1.1, 0.28, 6.2), center * CFrame.new(0.4, -2.6, 0), PALETTE.frame, room)

	local moonlight = Instance.new("PointLight")
	moonlight.Brightness = 1.1
	moonlight.Range = 26
	moonlight.Color = Color3.fromRGB(150, 180, 240)
	moonlight.Parent = glass
end

local function buildDoor(room: Model)
	local halfZ = ROOM.Z / 2
	local center = CFrame.new(5, 3.6, halfZ + 0.05)

	part("DoorFrameLeft", Vector3.new(0.35, 7.6, 0.5), center * CFrame.new(-1.9, 0.2, 0), PALETTE.frame, room)
	part("DoorFrameRight", Vector3.new(0.35, 7.6, 0.5), center * CFrame.new(1.9, 0.2, 0), PALETTE.frame, room)
	part("DoorFrameTop", Vector3.new(4.15, 0.35, 0.5), center * CFrame.new(0, 3.85, 0), PALETTE.frame, room)
	part("Door", Vector3.new(3.5, 7.2, 0.25), center, PALETTE.door, room)
	part("DoorHandle", Vector3.new(0.5, 0.16, 0.16), center * CFrame.new(1.3, 0, -0.2), PALETTE.handle, room)
end

local function buildBed(room: Model)
	local halfX, halfZ = ROOM.X / 2, ROOM.Z / 2
	-- Contre le mur de droite, tête vers le fond.
	local base = CFrame.new(halfX - 2.2, 0.9, halfZ - 5.2)

	part("BedFrame", Vector3.new(3.6, 1.4, 7.6), base, PALETTE.bed, room)

	local mattress = part("Mattress", Vector3.new(3.3, 0.9, 7.2), base * CFrame.new(0, 1.1, 0), PALETTE.fabric, room)
	mattress.Material = Enum.Material.Fabric

	local duvet = part("Duvet", Vector3.new(3.4, 0.35, 4.6), base * CFrame.new(0, 1.6, 1.2), PALETTE.sheets, room)
	duvet.Material = Enum.Material.Fabric

	local pillow = part("Pillow", Vector3.new(2.6, 0.5, 1.2), base * CFrame.new(0, 1.75, -2.9), PALETTE.sheets, room)
	pillow.Material = Enum.Material.Fabric

	-- Dormir fait passer au lendemain matin : l'énergie remonte, et les
	-- colis commandés la veille arrivent avec le facteur.
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "Sleep"
	prompt.ObjectText = "Lit"
	prompt.ActionText = "Dormir"
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.HoldDuration = 0.6
	prompt.MaxActivationDistance = 8
	prompt.RequiresLineOfSight = false
	prompt.Parent = mattress
end

local function buildLighting(room: Model)
	-- Un plafonnier faible et chaud. La pièce doit rester sombre pour que
	-- l'écran et les LED que le joueur posera dominent vraiment.
	local shade = part("CeilingLamp", Vector3.new(1.6, 0.5, 1.6), CFrame.new(0, ROOM.Y - 0.9, 0),
		Color3.fromRGB(250, 232, 200), room)
	shade.Material = Enum.Material.Neon

	part("CeilingCord", Vector3.new(0.12, 0.9, 0.12), CFrame.new(0, ROOM.Y - 0.3, 0), Color3.fromRGB(60, 56, 52), room)

	local bulb = Instance.new("PointLight")
	bulb.Brightness = 0.85
	bulb.Range = 24
	bulb.Color = Color3.fromRGB(255, 224, 178)
	bulb.Parent = shade

	local rug = part("Rug", Vector3.new(7, 0.1, 5), CFrame.new(-1, 0.05, -2), PALETTE.rug, room)
	rug.Material = Enum.Material.Fabric

	Lighting.Ambient = Color3.fromRGB(46, 44, 52)
	Lighting.OutdoorAmbient = Color3.fromRGB(38, 44, 64)
	Lighting.Brightness = 1
	Lighting.ClockTime = 21.5
	Lighting.EnvironmentDiffuseScale = 0.35
	Lighting.GlobalShadows = true
	Lighting.FogEnd = 400
end

function DevRoom.build()
	local existing = workspace:FindFirstChild("DevRoom")
	if existing then
		-- La pièce est peut-être déjà dans le place, construite à la main
		-- dans Studio. On ne la touche pas : le mobilier, lui, est posé par
		-- RoomBuilder à partir de l'état du joueur.
		return existing
	end

	-- Le sol et le point d'apparition d'un place « Baseplate » entreraient
	-- en conflit avec les nôtres. On ne retire que ce qui porte exactement
	-- les noms par défaut de Studio.
	local baseplate = workspace:FindFirstChild("Baseplate")
	if baseplate and baseplate:IsA("BasePart") then
		baseplate:Destroy()
	end

	local defaultSpawn = workspace:FindFirstChild("SpawnLocation")
	if defaultSpawn and defaultSpawn:IsA("SpawnLocation") then
		defaultSpawn:Destroy()
	end

	local room = Instance.new("Model")
	room.Name = "DevRoom"
	room.Parent = workspace

	buildShell(room)
	buildWindow(room)
	buildDoor(room)
	buildBed(room)
	buildLighting(room)

	-- Le joueur apparaît près de la porte, face au bureau : il voit l'écran
	-- allumé dès la première seconde.
	local spawnLocation = Instance.new("SpawnLocation")
	spawnLocation.Name = "PlayerSpawn"
	spawnLocation.Size = Vector3.new(4, 0.4, 4)
	spawnLocation.CFrame = CFrame.new(2, 0.2, 4)
	spawnLocation.Anchored = true
	spawnLocation.Transparency = 1
	spawnLocation.CanCollide = false
	spawnLocation.Neutral = true
	spawnLocation.Parent = room

	return room
end

return DevRoom
