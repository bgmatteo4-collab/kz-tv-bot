--!strict
--[[
	DevRoom — la chambre de test, construite par code.

	Je ne peux pas modéliser dans Studio, donc le jeu se monte tout seul un
	décor en primitives : quatre murs, un bureau, un moniteur. C'est moche
	et c'est le but — ça permet de jouer et de tester toute la logique dès
	maintenant, sans attendre le moindre asset.

	Quand tu construiras la vraie chambre dans Studio, il suffira de poser
	le tag "ComputerScreen" sur la dalle de ton moniteur et de supprimer
	l'appel à DevRoom.build().
]]

local CollectionService = game:GetService("CollectionService")

local DevRoom = {}

local ROOM_SIZE = Vector3.new(28, 14, 24)
local WALL_THICKNESS = 1

local PALETTE = {
	floor = Color3.fromRGB(78, 66, 58),
	wall = Color3.fromRGB(126, 122, 118),
	desk = Color3.fromRGB(52, 44, 40),
	frame = Color3.fromRGB(28, 28, 32),
}

local function part(name: string, size: Vector3, cframe: CFrame, color: Color3, parent: Instance)
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

function DevRoom.build()
	if workspace:FindFirstChild("DevRoom") then
		return workspace.DevRoom
	end

	-- Si on synchronise dans un place "Baseplate" de Studio, son sol et son
	-- point d'apparition entrent en conflit avec les nôtres : le joueur
	-- apparaît une fois sur deux à côté de la chambre. On les retire, mais
	-- uniquement s'ils portent exactement les noms par défaut de Studio —
	-- on ne veut surtout pas manger du décor construit à la main.
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

	local halfX, halfZ = ROOM_SIZE.X / 2, ROOM_SIZE.Z / 2

	part("Floor", Vector3.new(ROOM_SIZE.X, WALL_THICKNESS, ROOM_SIZE.Z), CFrame.new(0, 0, 0), PALETTE.floor, room)

	-- Mur du fond : c'est celui qu'on voit derrière le joueur à la caméra,
	-- donc c'est là que le fond vert ira se poser.
	part(
		"WallBack",
		Vector3.new(ROOM_SIZE.X, ROOM_SIZE.Y, WALL_THICKNESS),
		CFrame.new(0, ROOM_SIZE.Y / 2, -halfZ),
		PALETTE.wall,
		room
	)
	part(
		"WallLeft",
		Vector3.new(WALL_THICKNESS, ROOM_SIZE.Y, ROOM_SIZE.Z),
		CFrame.new(-halfX, ROOM_SIZE.Y / 2, 0),
		PALETTE.wall,
		room
	)
	part(
		"WallRight",
		Vector3.new(WALL_THICKNESS, ROOM_SIZE.Y, ROOM_SIZE.Z),
		CFrame.new(halfX, ROOM_SIZE.Y / 2, 0),
		PALETTE.wall,
		room
	)

	-- Le bureau, face au mur du fond.
	local deskTop = CFrame.new(0, 3.5, -halfZ + 5)
	part("Desk", Vector3.new(10, 0.4, 4), deskTop, PALETTE.desk, room)
	part("DeskLegL", Vector3.new(0.4, 3.5, 3.6), deskTop * CFrame.new(-4.6, -1.95, 0), PALETTE.desk, room)
	part("DeskLegR", Vector3.new(0.4, 3.5, 3.6), deskTop * CFrame.new(4.6, -1.95, 0), PALETTE.desk, room)

	-- Le moniteur. La dalle est une part distincte du cadre : c'est elle qui
	-- portera la SurfaceGui, et son ratio doit coller à la résolution
	-- logique de l'OS (16:9) sinon l'interface se retrouve étirée.
	local screenCFrame = deskTop * CFrame.new(0, 2.6, -0.6)

	part("MonitorFrame", Vector3.new(8.4, 4.9, 0.3), screenCFrame, PALETTE.frame, room)
	part("MonitorStand", Vector3.new(1.2, 2.2, 0.6), deskTop * CFrame.new(0, 1.1, -0.6), PALETTE.frame, room)

	local screen = part(
		"Screen",
		Vector3.new(8, 4.5, 0.1),
		screenCFrame * CFrame.new(0, 0, 0.16),
		Color3.new(0, 0, 0),
		room
	)
	screen.Material = Enum.Material.Glass
	screen.CanCollide = false

	-- Le client cherche ce tag pour savoir où monter KZ OS.
	CollectionService:AddTag(screen, "ComputerScreen")

	-- Un point de repère pour s'asseoir devant l'écran.
	local seat = Instance.new("Part")
	seat.Name = "DeskAnchor"
	seat.Size = Vector3.new(2, 0.2, 2)
	seat.CFrame = deskTop * CFrame.new(0, -3, 4.5)
	seat.Anchored = true
	seat.Transparency = 1
	seat.CanCollide = false
	seat.Parent = room

	local spawnPad = part("SpawnPad", Vector3.new(6, 0.2, 6), CFrame.new(0, 0.6, halfZ - 6), PALETTE.floor, room)
	spawnPad.Transparency = 1
	spawnPad.CanCollide = false

	local spawnLocation = Instance.new("SpawnLocation")
	spawnLocation.Size = Vector3.new(6, 0.2, 6)
	spawnLocation.CFrame = CFrame.new(0, 0.7, halfZ - 6)
	spawnLocation.Anchored = true
	spawnLocation.Transparency = 1
	spawnLocation.CanCollide = false
	spawnLocation.Neutral = true
	spawnLocation.Parent = room

	-- Une lumière chaude et faible : on est dans une chambre, la nuit, et
	-- l'écran doit être la source lumineuse dominante.
	local lighting = game:GetService("Lighting")
	lighting.Ambient = Color3.fromRGB(38, 38, 46)
	lighting.OutdoorAmbient = Color3.fromRGB(48, 48, 58)
	lighting.Brightness = 1.2
	lighting.ClockTime = 21

	return room
end

return DevRoom
