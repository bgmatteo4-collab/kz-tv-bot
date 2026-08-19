--!strict
--[[
	DevRoom — la chambre de test, construite par code.

	Je ne peux pas modéliser dans Studio, donc le jeu se monte tout seul un
	décor en primitives. Ce n'est pas la vraie chambre du jeu final, mais
	elle doit rester assez crédible pour qu'on juge l'ambiance : une pièce
	de nuit, éclairée par une lampe chaude et surtout par l'écran.

	Quand tu construiras le vrai décor dans Studio, pose le tag
	"ComputerScreen" sur la dalle de ton moniteur et supprime l'appel à
	DevRoom.build() dans init.server.lua.

	⚠️ Piège Roblox : la face "Front" d'une part pointe vers son -Z LOCAL.
	Un moniteur construit sans rotation affiche donc son écran vers
	l'arrière. Tout le mobilier orienté vers le joueur est ici tourné de
	180°, et les décalages se font le long de l'axe local.
]]

local CollectionService = game:GetService("CollectionService")
local Lighting = game:GetService("Lighting")

local DevRoom = {}

local ROOM = Vector3.new(26, 13, 22)
local WALL = 1

local PALETTE = {
	floor = Color3.fromRGB(92, 68, 52),
	rug = Color3.fromRGB(58, 62, 78),
	wall = Color3.fromRGB(96, 94, 104),
	ceiling = Color3.fromRGB(64, 62, 70),
	desk = Color3.fromRGB(46, 40, 38),
	bezel = Color3.fromRGB(22, 22, 26),
	screen = Color3.fromRGB(6, 7, 10),
	fabric = Color3.fromRGB(78, 84, 108),
	sheets = Color3.fromRGB(196, 198, 206),
	night = Color3.fromRGB(28, 38, 66),
	poster = Color3.fromRGB(150, 76, 96),
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

local function buildShell(room: Model)
	local halfX, halfZ = ROOM.X / 2, ROOM.Z / 2

	local floor = part("Floor", Vector3.new(ROOM.X, WALL, ROOM.Z), CFrame.new(0, -WALL / 2, 0), PALETTE.floor, room)
	floor.Material = Enum.Material.WoodPlanks

	part("Ceiling", Vector3.new(ROOM.X, WALL, ROOM.Z), CFrame.new(0, ROOM.Y, 0), PALETTE.ceiling, room)

	part("WallBack", Vector3.new(ROOM.X, ROOM.Y, WALL), CFrame.new(0, ROOM.Y / 2, -halfZ), PALETTE.wall, room)
	part("WallFront", Vector3.new(ROOM.X, ROOM.Y, WALL), CFrame.new(0, ROOM.Y / 2, halfZ), PALETTE.wall, room)
	part("WallLeft", Vector3.new(WALL, ROOM.Y, ROOM.Z), CFrame.new(-halfX, ROOM.Y / 2, 0), PALETTE.wall, room)
	part("WallRight", Vector3.new(WALL, ROOM.Y, ROOM.Z), CFrame.new(halfX, ROOM.Y / 2, 0), PALETTE.wall, room)

	-- Une fenêtre de nuit sur le mur de gauche : elle donne un point de
	-- lumière froide qui contraste avec la lampe, et elle évite l'effet
	-- "boîte fermée".
	local window = part("Window", Vector3.new(0.4, 4.5, 6), CFrame.new(-halfX + 0.4, 7, 2), PALETTE.night, room)
	window.Material = Enum.Material.Neon

	local poster = part("Poster", Vector3.new(0.2, 4, 3), CFrame.new(halfX - 0.6, 7.5, -2), PALETTE.poster, room)
	poster.Material = Enum.Material.SmoothPlastic

	local rug = part("Rug", Vector3.new(12, 0.15, 8), CFrame.new(0, 0.08, -1), PALETTE.rug, room)
	rug.Material = Enum.Material.Fabric
end

local function buildBed(room: Model)
	local halfX, halfZ = ROOM.X / 2, ROOM.Z / 2
	local base = CFrame.new(halfX - 4, 1.2, halfZ - 6)

	part("BedFrame", Vector3.new(6, 1.6, 9), base, PALETTE.desk, room)

	local mattress = part("Mattress", Vector3.new(5.6, 0.8, 8.6), base * CFrame.new(0, 1.2, 0), PALETTE.fabric, room)
	mattress.Material = Enum.Material.Fabric

	local pillow = part("Pillow", Vector3.new(4.4, 0.7, 1.8), base * CFrame.new(0, 1.9, -3.1), PALETTE.sheets, room)
	pillow.Material = Enum.Material.Fabric

	-- Dormir fait passer au lendemain matin : l'énergie remonte, et les
	-- colis commandés la veille arrivent avec le facteur.
	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "Sleep"
	prompt.ObjectText = "Lit"
	prompt.ActionText = "Dormir"
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.HoldDuration = 0.6
	prompt.MaxActivationDistance = 10
	prompt.RequiresLineOfSight = false
	prompt.Parent = mattress
end

--- Le poste de travail. Renvoie la dalle de l'écran, sur laquelle le client
--- viendra monter KZ OS.
local function buildDesk(room: Model): Part
	local halfZ = ROOM.Z / 2

	-- Le meuble est tourné de 180° : sa face Front regarde donc le joueur,
	-- qui arrive depuis les Z positifs.
	local deskCFrame = CFrame.new(0, 3.4, -halfZ + 4) * CFrame.Angles(0, math.pi, 0)

	part("DeskTop", Vector3.new(11, 0.4, 4.5), deskCFrame, PALETTE.desk, room)
	part("DeskLegL", Vector3.new(0.5, 3.4, 4), deskCFrame * CFrame.new(-5, -1.9, 0), PALETTE.desk, room)
	part("DeskLegR", Vector3.new(0.5, 3.4, 4), deskCFrame * CFrame.new(5, -1.9, 0), PALETTE.desk, room)

	-- La chaise, côté joueur : donc décalée le long du +Z local du bureau.
	local chairCFrame = deskCFrame * CFrame.new(0, -1.2, 4)
	part("ChairSeat", Vector3.new(3, 0.4, 3), chairCFrame, PALETTE.bezel, room)
	part("ChairBack", Vector3.new(3, 3.4, 0.4), chairCFrame * CFrame.new(0, 1.7, 1.4), PALETTE.bezel, room)
	part("ChairPole", Vector3.new(0.5, 2.2, 0.5), chairCFrame * CFrame.new(0, -1.3, 0), PALETTE.bezel, room)

	-- Le moniteur hérite de l'orientation du bureau, donc sa face Front
	-- regarde le joueur. C'est indispensable : la SurfaceGui se pose sur
	-- Front, et un moniteur non tourné afficherait l'écran vers le mur.
	local monitorCFrame = deskCFrame * CFrame.new(0, 2.9, -0.9)

	part("MonitorBezel", Vector3.new(9, 5.4, 0.4), monitorCFrame, PALETTE.bezel, room)
	part("MonitorNeck", Vector3.new(1.2, 2.4, 0.6), deskCFrame * CFrame.new(0, 1.1, -0.9), PALETTE.bezel, room)
	part("MonitorFoot", Vector3.new(3.4, 0.3, 1.6), deskCFrame * CFrame.new(0, 0.35, -0.9), PALETTE.bezel, room)

	-- La dalle avance le long du -Z local, c'est-à-dire vers le joueur.
	local screen = part(
		"Screen",
		Vector3.new(8.4, 4.725, 0.15),
		monitorCFrame * CFrame.new(0, 0, -0.3),
		PALETTE.screen,
		room
	)
	screen.CanCollide = false

	-- L'écran éclaire la pièce. C'est ce qui vend l'idée d'un vrai moniteur
	-- allumé, bien plus qu'une texture lumineuse.
	local glow = Instance.new("PointLight")
	glow.Name = "ScreenGlow"
	glow.Brightness = 1.6
	glow.Range = 22
	glow.Color = Color3.fromRGB(150, 180, 255)
	glow.Parent = screen

	local keyboard = part("Keyboard", Vector3.new(5, 0.25, 1.8), deskCFrame * CFrame.new(0, 0.32, 1.4), PALETTE.bezel, room)
	keyboard.CanCollide = false

	-- Une lampe de bureau chaude, pour ne pas être uniquement en lumière
	-- bleue d'écran.
	local lamp = part("Lamp", Vector3.new(0.8, 2.6, 0.8), deskCFrame * CFrame.new(-4.2, 1.5, 0), PALETTE.bezel, room)
	local lampLight = Instance.new("PointLight")
	lampLight.Brightness = 1.4
	lampLight.Range = 16
	lampLight.Color = Color3.fromRGB(255, 196, 130)
	lampLight.Parent = lamp

	return screen
end

--- L'invite d'interaction. Sans elle, le joueur n'a aucun moyen de deviner
--- qu'il peut utiliser l'ordinateur — c'était le reproche principal du
--- premier test.
local function addPrompt(screen: Part)
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

function DevRoom.build()
	local existing = workspace:FindFirstChild("DevRoom")
	if existing then
		-- La pièce est peut-être déjà dans le place (construite à la main
		-- dans Studio). On se contente alors de garantir que la dalle porte
		-- bien son tag, sinon le client ne la trouverait jamais.
		local screen = existing:FindFirstChild("Screen")
		if screen and not CollectionService:HasTag(screen, "ComputerScreen") then
			CollectionService:AddTag(screen, "ComputerScreen")
		end
		return existing
	end

	-- Si on synchronise dans un place "Baseplate" de Studio, son sol et son
	-- point d'apparition entrent en conflit avec les nôtres. On les retire,
	-- mais uniquement s'ils portent exactement les noms par défaut — on ne
	-- veut surtout pas manger du décor construit à la main.
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
	buildBed(room)

	local screen = buildDesk(room)
	CollectionService:AddTag(screen, "ComputerScreen")
	addPrompt(screen)

	-- Le joueur apparaît au milieu de la pièce, face au bureau : il voit
	-- l'écran allumé dès la première seconde.
	local spawnLocation = Instance.new("SpawnLocation")
	spawnLocation.Name = "PlayerSpawn"
	spawnLocation.Size = Vector3.new(5, 0.4, 5)
	spawnLocation.CFrame = CFrame.new(0, 0.2, ROOM.Z / 2 - 7)
	spawnLocation.Anchored = true
	spawnLocation.Transparency = 1
	spawnLocation.CanCollide = false
	spawnLocation.Neutral = true
	spawnLocation.Parent = room

	-- Nuit, lumière ambiante faible : l'écran et la lampe doivent dominer.
	Lighting.Ambient = Color3.fromRGB(34, 34, 44)
	Lighting.OutdoorAmbient = Color3.fromRGB(30, 34, 50)
	Lighting.Brightness = 0.8
	Lighting.ClockTime = 22
	Lighting.EnvironmentDiffuseScale = 0.3
	Lighting.GlobalShadows = true

	return room
end

return DevRoom
