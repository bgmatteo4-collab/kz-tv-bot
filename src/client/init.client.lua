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

-- ── L'état répliqué et le pont donné aux apps ─────────────────────────────

local api = {
	state = {},
	stateChanged = Signal.new(),
	request = function(route: string, payload: any?)
		requestEvent:FireServer(route, payload)
	end,
}

stateEvent.OnClientEvent:Connect(function(newState)
	api.state = newState
	api.stateChanged:Fire(newState)
end)

-- ── Les postes de travail ─────────────────────────────────────────────────

local stations: { [BasePart]: any } = {}

local SIT_DISTANCE = 14
local FOCUS_DISTANCE = 7.5

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
		if station.os or not api.state.day then
			return
		end

		station.os = KZOS.new(surface.root, {
			getPointer = function()
				return surface:GetPointer()
			end,
		}, api)
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

-- ── S'asseoir devant l'écran ──────────────────────────────────────────────

local focusedStation: any = nil

local function setFocused(station: any?)
	if focusedStation == station then
		return
	end

	focusedStation = station

	if station then
		UserInputService.MouseBehavior = Enum.MouseBehavior.Default
		UserInputService.MouseIconEnabled = true
	else
		UserInputService.MouseIconEnabled = true
	end
end

--- On ne fige pas la caméra de force : le joueur reste libre de ses
--- mouvements, on se contente de savoir quel écran il utilise. Le verrou
--- caméra viendra avec le vrai mobilier (s'asseoir sur une chaise).
local function updateFocus()
	local character = player.Character
	local rootPart = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not rootPart then
		setFocused(nil)
		return
	end

	local closest, closestDistance = nil, math.huge

	for screenPart, station in pairs(stations) do
		local distance = (screenPart.Position - rootPart.Position).Magnitude

		-- Économie de performance : au-delà de SIT_DISTANCE, on éteint la
		-- dalle. Un écran allumé qu'on ne peut pas lire ne sert à rien et
		-- coûte une passe de rendu d'interface complète.
		local inRange = distance <= SIT_DISTANCE
		station.surface:SetActive(inRange)

		if inRange then
			station.ensureStarted()
		end

		if distance < closestDistance then
			closest, closestDistance = station, distance
		end
	end

	setFocused(closestDistance <= FOCUS_DISTANCE and closest or nil)
end

RunService.Heartbeat:Connect(updateFocus)

-- ── Démarrage ─────────────────────────────────────────────────────────────

-- On signale au serveur qu'on est prêt : il répond avec l'état initial.
task.defer(function()
	api.request("ping")
end)

print("[KZ] Client prêt.")
