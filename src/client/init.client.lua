--!strict
--[[
	Point d'entrée client de KZ Stream Simulator.

	Il fait trois choses : il tient l'état répliqué, il monte KZ OS sur
	chaque dalle taguée "ComputerScreen", et il gère le fait de s'asseoir
	devant un ordinateur (verrouillage caméra + curseur libre).

	Aucun HUD n'est créé ici, et c'est délibéré : on s'est interdit toute
	interface flottante. Chaque information du jeu vit sur un écran, un
	objet ou l'avatar.
]]

local CollectionService = game:GetService("CollectionService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net)
local Signal = require(Shared.Lib.Signal)
local KZOS = require(Shared.OS)

local player = Players.LocalPlayer
local stateEvent = Net.stateEvent()
local requestEvent = Net.requestEvent()

local ScreenSurface = require(script.Computer.ScreenSurface)
local PlacementMode = require(script.Build.PlacementMode)

-- ── L'état répliqué et le pont donné aux apps ─────────────────────────────

-- Les actions locales ne partent pas au serveur : elles pilotent le client
-- (ouvrir le mode construction, par exemple). Les apps de l'OS s'en servent
-- exactement comme de `request`, sans avoir à savoir où ça atterrit.
local localHandlers: { [string]: (any) -> () } = {}

local api = {
	state = {},
	stateChanged = Signal.new(),
	request = function(route: string, payload: any?)
		requestEvent:FireServer(route, payload)
	end,
	localAction = function(name: string, payload: any?)
		local handler = localHandlers[name]
		if handler then
			handler(payload)
		else
			warn(string.format("[KZ] action locale inconnue : %s", name))
		end
	end,
}

stateEvent.OnClientEvent:Connect(function(newState)
	api.state = newState
	api.stateChanged:Fire(newState)
end)

-- ── Les postes de travail ─────────────────────────────────────────────────

local stations: { [BasePart]: any } = {}

local SIT_DISTANCE = 14

local function createStation(screenPart: BasePart)
	if stations[screenPart] then
		return
	end

	local surface = ScreenSurface.new(screenPart)

	local station = {
		part = screenPart,
		surface = surface,
		os = nil,
		focused = false,
	}
	stations[screenPart] = station

	-- L'OS ne démarre pas tout de suite. Il lui faut deux choses : l'état du
	-- joueur (sans lui on ne connaît ni sa machine ni la durée de son boot)
	-- et un joueur assez proche pour voir l'écran — sinon la séquence de
	-- démarrage se jouerait dans le vide pendant qu'il traverse la pièce.
	function station.ensureStarted()
		if station.os or station.failed or not api.state.day then
			return
		end

		-- Un écran noir est indiscernable d'un écran cassé. Si l'OS refuse
		-- de démarrer, on affiche l'erreur sur la dalle : le joueur voit
		-- immédiatement qu'il s'agit d'un bug, et le message est lisible
		-- sans ouvrir la console.
		local ok, result = pcall(function()
			return KZOS.new(surface.root, {
				getPointer = function()
					return surface:GetPointer()
				end,
			}, api)
		end)

		if ok then
			station.os = result
			return
		end

		station.failed = true
		warn("[KZ] KZ OS n'a pas démarré : " .. tostring(result))

		local message = Instance.new("TextLabel")
		message.Name = "BootError"
		message.Size = UDim2.fromScale(1, 1)
		message.BackgroundColor3 = Color3.fromRGB(12, 8, 10)
		message.BorderSizePixel = 0
		message.Text = "KZ OS n'a pas pu démarrer\n\n" .. tostring(result)
		message.TextColor3 = Color3.fromRGB(255, 120, 120)
		message.TextSize = 20
		message.TextWrapped = true
		message.Font = Enum.Font.Code
		message.Parent = surface.root
	end

	return station
end

local function removeStation(screenPart: BasePart)
	local station = stations[screenPart]
	if not station then
		return
	end

	if station.os then
		station.os:Destroy()
	end
	station.surface:Destroy()
	stations[screenPart] = nil
end

for _, screenPart in ipairs(CollectionService:GetTagged("ComputerScreen")) do
	if screenPart:IsA("BasePart") then
		createStation(screenPart)
	end
end

CollectionService:GetInstanceAddedSignal("ComputerScreen"):Connect(function(instance)
	if instance:IsA("BasePart") then
		createStation(instance)
	end
end)

CollectionService:GetInstanceRemovedSignal("ComputerScreen"):Connect(function(instance)
	if instance:IsA("BasePart") then
		removeStation(instance)
	end
end)

-- ── S'installer devant l'ordinateur ──────────────────────────────────────

-- Une interface de 1280x720 vue de biais à trois mètres est illisible et
-- impossible à cliquer. S'installer verrouille donc la caméra en face de la
-- dalle : c'est le geste central du jeu, il doit être net.

local focusedStation: any = nil
local placement: any = nil
local savedCameraType: Enum.CameraType? = nil
local savedWalkSpeed: number? = nil
local focusEnteredAt = 0

-- Distance de caméra calculée pour que la dalle remplisse le cadre sans
-- déborder, avec une marge.
local FOCUS_PADDING = 1.25

local function getHumanoid(): Humanoid?
	local character = player.Character
	return character and character:FindFirstChildOfClass("Humanoid") or nil
end

local function exitFocus()
	if not focusedStation then
		return
	end

	local camera = workspace.CurrentCamera
	if camera and savedCameraType then
		camera.CameraType = savedCameraType
	end

	local humanoid = getHumanoid()
	if humanoid and savedWalkSpeed then
		humanoid.WalkSpeed = savedWalkSpeed
	end

	local prompt = focusedStation.part:FindFirstChildOfClass("ProximityPrompt")
	if prompt then
		prompt.Enabled = true
	end

	if focusedStation.os then
		focusedStation.os:SetHint("")
	end
	focusedStation.hintShown = false

	focusedStation = nil
	savedCameraType = nil
	savedWalkSpeed = nil
end

local function enterFocus(station: any)
	-- On ne se rassoit pas au bureau avec un objet dans les mains.
	if placement or focusedStation == station then
		return
	end
	exitFocus()

	local camera = workspace.CurrentCamera
	if not camera then
		return
	end

	station.ensureStarted()

	local screenPart = station.part
	-- La face avant d'une part regarde son -Z local : la caméra se place
	-- donc de ce côté, sinon on cadre l'arrière du moniteur.
	local halfHeight = screenPart.Size.Y / 2
	local distance = (halfHeight / math.tan(math.rad(camera.FieldOfView / 2))) * FOCUS_PADDING

	savedCameraType = camera.CameraType
	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = CFrame.lookAt(
		(screenPart.CFrame * CFrame.new(0, 0, -distance)).Position,
		screenPart.Position
	)

	-- On immobilise le joueur : marcher pendant que la caméra est figée
	-- donne l'impression que le jeu a planté.
	local humanoid = getHumanoid()
	if humanoid then
		savedWalkSpeed = humanoid.WalkSpeed
		humanoid.WalkSpeed = 0
	end

	local prompt = screenPart:FindFirstChildOfClass("ProximityPrompt")
	if prompt then
		prompt.Enabled = false
	end

	UserInputService.MouseBehavior = Enum.MouseBehavior.Default
	UserInputService.MouseIconEnabled = true

	focusedStation = station
	focusEnteredAt = os.clock()

	if station.os then
		station.os:SetHint("E — se lever")
	end
end

--- L'invite est créée par le serveur : elle peut arriver après la dalle.
--- On tente donc de s'y accrocher à chaque passage, jusqu'à y parvenir.
local function bindPrompt(station: any)
	if station.promptBound then
		return
	end

	local prompt = station.part:FindFirstChildOfClass("ProximityPrompt")
	if not prompt then
		return
	end

	station.promptBound = true

	prompt.Triggered:Connect(function(triggeringPlayer)
		if triggeringPlayer == player then
			enterFocus(station)
		end
	end)
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if gameProcessed or not focusedStation then
		return
	end
	-- Le même appui qui déclenche l'invite arrive aussi ici : on ignore la
	-- touche pendant un court instant pour ne pas se relever aussitôt.
	if input.KeyCode == Enum.KeyCode.E and os.clock() - focusEnteredAt > 0.4 then
		exitFocus()
	end
end)

--- Allume les dalles proches, éteint les autres, et relève le joueur s'il
--- s'éloigne d'un poste où il était installé.
local function updateStations()
	local character = player.Character
	local rootPart = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not rootPart then
		exitFocus()
		return
	end

	for screenPart, station in pairs(stations) do
		bindPrompt(station)

		local distance = (screenPart.Position - rootPart.Position).Magnitude

		-- Économie de performance : au-delà de SIT_DISTANCE, on éteint la
		-- dalle. Un écran allumé qu'on ne peut pas lire ne sert à rien et
		-- coûte une passe de rendu d'interface complète.
		-- Pendant une coupure de courant, aucun écran ne s'allume. C'est la
		-- sanction la plus lisible possible d'une ligne électrique saturée.
		local blackout = (api.state.blackoutRemaining or 0) > 0
		local inRange = distance <= SIT_DISTANCE

		station.surface:SetActive(not blackout and (inRange or station == focusedStation))

		if blackout and station == focusedStation then
			exitFocus()
		end

		if inRange then
			station.ensureStarted()
		end

		if station == focusedStation and station.os and not station.hintShown then
			station.hintShown = true
			station.os:SetHint("E — se lever")
		end

		if station == focusedStation and distance > SIT_DISTANCE then
			exitFocus()
		end
	end
end

RunService.Heartbeat:Connect(updateStations)

player.CharacterAdded:Connect(function()
	exitFocus()
end)

-- ── Mode construction ────────────────────────────────────────────────────

localHandlers["placement/begin"] = function(payload)
	if typeof(payload) ~= "table" or not payload.uid or not payload.itemId then
		return
	end

	if placement then
		placement:Destroy()
		placement = nil
	end

	-- On se lève d'abord : poser un meuble depuis sa chaise, caméra
	-- verrouillée sur l'écran, n'aurait aucun sens.
	exitFocus()

	placement = PlacementMode.start(payload.uid, payload.itemId, function(x, y, z, yaw)
		api.request("build/place", { uid = payload.uid, x = x, y = y, z = z, yaw = yaw })
	end, function()
		placement = nil
	end)
end

-- ── Dormir ───────────────────────────────────────────────────────────────

--- L'invite sur le lit est créée par le serveur. On l'attend plutôt que de
--- la chercher une seule fois : le décor peut arriver après le client.
local function bindSleepPrompt()
	local room = workspace:FindFirstChild("DevRoom")
	local bed = room and room:FindFirstChild("Mattress")
	if not bed then
		return false
	end

	local prompt = bed:FindFirstChildOfClass("ProximityPrompt")
	if not prompt then
		return false
	end

	prompt.Triggered:Connect(function(triggeringPlayer)
		if triggeringPlayer == player then
			api.request("sleep")
		end
	end)

	return true
end

task.spawn(function()
	while not bindSleepPrompt() do
		task.wait(1)
	end
end)

-- ── Démarrage ─────────────────────────────────────────────────────────────

-- On signale au serveur qu'on est prêt : il répond avec l'état initial.
task.defer(function()
	api.request("ping")
end)

print("[KZ] Client prêt.")
