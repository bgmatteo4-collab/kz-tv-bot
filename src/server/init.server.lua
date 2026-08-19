--!strict
--[[
	Point d'entrée serveur de KZ Stream Simulator.

	Le serveur fait autorité sur tout : l'argent, l'audience, l'état du
	direct. Le client demande, le serveur décide. C'est plus long à écrire
	et ça évite qu'un jeu de gestion se fasse vider par un exploit en
	quinze minutes le jour du lancement.

	Le jeu est solo pour l'instant, mais chaque joueur a déjà sa propre
	session isolée : le jour où on ajoutera les collaborations, il n'y aura
	rien à démonter.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net)
local DeviceCatalogue = require(Shared.Config.Devices)
local Emails = require(Shared.Content.Emails)

local PlayerState = require(script.Services.PlayerState)
local DevRoom = require(script.DevRoom)

local stateEvent = Net.stateEvent()
local requestEvent = Net.requestEvent()

local sessions: { [Player]: any } = {}

--- Les sources visibles dans KZ Studio sont dérivées du matériel posé dans
--- la pièce. C'est le lien qui tient tout le jeu : pas de micro branché,
--- pas de source micro, et le joueur ne l'apprendra que par son chat.
local function buildSources(data)
	local sources = {}

	for _, owned in ipairs(data.devices) do
		local device = DeviceCatalogue[owned.id]
		if device and (device.category == "camera" or device.category == "microphone" or device.category == "capture") then
			table.insert(sources, {
				id = owned.id,
				name = device.name,
				category = device.category,
				connected = owned.connected == true,
			})
		end
	end

	return sources
end

--- Ce qu'on envoie au client : l'état plus quelques valeurs dérivées, pour
--- que l'interface n'ait aucun calcul de règle métier à faire.
local function buildPayload(session)
	local data = session:Get()
	local payload = table.clone(data)

	payload.sources = buildSources(data)

	return payload
end

local function push(player: Player)
	local session = sessions[player]
	if session then
		stateEvent:FireClient(player, buildPayload(session))
	end
end

-- ── Routes ────────────────────────────────────────────────────────────────

local routes = {}

function routes.ping(session)
	-- Le client annonce qu'il est prêt à recevoir l'état.
	push(session.player)
end

routes["stream/toggle"] = function(session)
	session:Update(function(data)
		if data.isLive then
			data.isLive = false
			data.viewers = 0
			data.bitrate = 0
			data.streamElapsed = 0
			data.droppedFrames = 0
			data.stats.streamsCompleted += 1
		else
			data.isLive = true
			data.streamElapsed = 0
			-- Le débit dépend de la machine : une tour de récup n'encode pas
			-- du 6000 kb/s, elle fait ce qu'elle peut.
			data.bitrate = math.round(1500 + data.hardwareQuality * 4500)
		end
	end)
end

routes["stream/setScene"] = function(session, payload)
	if typeof(payload) ~= "table" or typeof(payload.sceneId) ~= "string" then
		return
	end

	session:Update(function(data)
		for _, scene in ipairs(data.scenes) do
			if scene.id == payload.sceneId then
				data.activeSceneId = scene.id
				return
			end
		end
	end)
end

routes["mail/answer"] = function(session, payload)
	if typeof(payload) ~= "table" then
		return
	end
	if typeof(payload.emailId) ~= "string" or typeof(payload.choiceIndex) ~= "number" then
		return
	end

	local email
	for _, candidate in ipairs(Emails) do
		if candidate.id == payload.emailId then
			email = candidate
			break
		end
	end

	if not email or not email.choices then
		return
	end

	local choice = email.choices[payload.choiceIndex]
	if not choice then
		return
	end

	local data = session:Get()
	if data.answeredEmails[email.id] then
		-- On ne répond qu'une fois : sans ça, un clic répété sur "Accepter"
		-- encaisserait le cachet du sponsor en boucle.
		return
	end

	session:Update(function(state)
		state.answeredEmails[email.id] = payload.choiceIndex

		local effects = choice.effects or {}
		if typeof(effects.money) == "number" then
			state.money += effects.money
		end
		if typeof(effects.energy) == "number" then
			state.energy = math.clamp(state.energy + effects.energy, 0, 100)
		end
	end)
end

-- ── Boucle de direct ──────────────────────────────────────────────────────

--- Pour l'instant une simulation volontairement naïve : elle sert à prouver
--- que la chaîne serveur -> réseau -> interface tient debout. Le vrai moteur
--- d'audience (segments, rétention, humeur) viendra la remplacer ici même.
local function tickLive(session, deltaTime: number)
	local data = session:Get()
	if not data.isLive then
		return
	end

	session:Update(function(state)
		state.streamElapsed += deltaTime

		local target = 3 + state.hardwareQuality * 20
		local drift = (target - state.viewers) * 0.05 + (math.random() - 0.5)
		state.viewers = math.max(0, math.round(state.viewers + drift))

		-- Une machine faible lâche des images quand l'encodage la dépasse.
		state.droppedFrames = math.clamp((0.35 - state.hardwareQuality * 0.35) * math.random(), 0, 1)
	end)
end

-- ── Cycle de vie ──────────────────────────────────────────────────────────

local function onPlayerAdded(player: Player)
	local session = PlayerState.new(player)
	sessions[player] = session

	session.Changed:Connect(function()
		push(player)
	end)

	push(player)
end

local function onPlayerRemoving(player: Player)
	local session = sessions[player]
	if session then
		session:Destroy()
		sessions[player] = nil
	end
end

requestEvent.OnServerEvent:Connect(function(player, route, payload)
	if typeof(route) ~= "string" then
		return
	end

	local session = sessions[player]
	local handler = routes[route]

	if session and handler then
		handler(session, payload)
	end
end)

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

for _, player in ipairs(Players:GetPlayers()) do
	onPlayerAdded(player)
end

-- Un tick à 1 Hz suffit : l'audience d'un live ne change pas à 60 images
-- par seconde, et ça garde le trafic réseau négligeable.
task.spawn(function()
	while true do
		task.wait(1)
		for _, session in pairs(sessions) do
			tickLive(session, 1)
		end
	end
end)

DevRoom.build()

print("[KZ] Serveur prêt.")
