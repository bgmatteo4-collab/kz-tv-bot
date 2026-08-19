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
local Catalogue = require(Shared.Config.Catalogue)
local Emails = require(Shared.Content.Emails)

local Placement = require(Shared.Config.Placement)

local PlayerState = require(script.Services.PlayerState)
local RoomBuilder = require(script.Services.RoomBuilder)
local DevRoom = require(script.DevRoom)

-- Limites de la pièce actuelle. Elles viendront du local choisi par le
-- joueur quand les lieux existeront ; en attendant elles décrivent la
-- chambre de test.
local ROOM_BOUNDS = { x = 12.5, y = 12.5, z = 10.5 }

-- Vitesses proposées au joueur. 0 met le temps en pause.
local ALLOWED_TIME_SCALES = { [0] = true, [1] = true, [4] = true, [10] = true }

local stateEvent = Net.stateEvent()
local requestEvent = Net.requestEvent()

local sessions: { [Player]: any } = {}

--- Les sources visibles dans KZ Studio sont dérivées du matériel posé dans
--- la pièce. C'est le lien qui tient tout le jeu : pas de micro branché,
--- pas de source micro, et le joueur ne l'apprendra que par son chat.
local SOURCE_CATEGORIES = { camera = true, microphone = true, capture = true }

local function buildSources(data)
	local sources = {}

	local function consider(itemId: string, connected: boolean)
		local device = Catalogue.Get(itemId)
		if device and SOURCE_CATEGORIES[device.category] then
			table.insert(sources, {
				id = itemId,
				name = device.name,
				category = device.category,
				connected = connected,
			})
		end
	end

	-- Posé dans la pièce : branché, donc détecté.
	for _, entry in ipairs(data.placed) do
		consider(entry.itemId, true)
	end

	-- Possédé mais encore dans son carton : le logiciel le liste en rouge.
	-- C'est ainsi qu'on peut streamer vingt minutes sans micro.
	for _, entry in ipairs(data.inventory) do
		consider(entry.itemId, false)
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

routes["time/setScale"] = function(session, payload)
	if typeof(payload) ~= "table" or typeof(payload.scale) ~= "number" then
		return
	end
	if not ALLOWED_TIME_SCALES[payload.scale] then
		return
	end

	session:Update(function(data)
		data.timeScale = payload.scale
	end)
end

routes["shop/order"] = function(session, payload)
	if typeof(payload) ~= "table" or typeof(payload.itemId) ~= "string" then
		return
	end

	local item = Catalogue.Get(payload.itemId)
	if not item then
		return
	end

	local data = session:Get()
	if data.money < item.price then
		return
	end

	-- Une seule commande en cours par référence : sinon un double clic
	-- commande deux fois, et le joueur découvre deux colis le lendemain.
	for _, order in ipairs(data.orders) do
		if order.itemId == item.id then
			return
		end
	end

	session:Update(function(state)
		state.money -= item.price
		table.insert(state.orders, {
			orderId = state.nextUid,
			itemId = item.id,
			-- Livré le lendemain matin. C'est ce délai qui fait d'un achat
			-- une décision de planification.
			arrivesDay = state.day + 1,
		})
		state.nextUid += 1
	end)
end

routes["sleep"] = function(session)
	session:Update(function(state)
		state.day += 1
		state.clockMinutes = 8 * 60
		state.energy = math.min(100, state.energy + 70)

		-- Les colis attendus arrivent avec le facteur.
		local remaining = {}
		for _, order in ipairs(state.orders) do
			if order.arrivesDay <= state.day then
				table.insert(state.inventory, {
					uid = state.nextUid,
					itemId = order.itemId,
				})
				state.nextUid += 1
			else
				table.insert(remaining, order)
			end
		end
		state.orders = remaining
	end)
end

routes["build/place"] = function(session, payload)
	if typeof(payload) ~= "table" then
		return
	end
	if typeof(payload.uid) ~= "number" then
		return
	end
	for _, key in ipairs({ "x", "y", "z", "yaw" }) do
		if typeof(payload[key]) ~= "number" or payload[key] ~= payload[key] then
			return
		end
	end

	-- Le client propose une position, le serveur la remet sur la grille et
	-- vérifie qu'elle tient dans la pièce. Ce qui arrive par le réseau
	-- n'est jamais pris pour argent comptant.
	local snapped = Placement.SnapToGrid(Vector3.new(payload.x, payload.y, payload.z))
	if math.abs(snapped.X) > ROOM_BOUNDS.x or math.abs(snapped.Z) > ROOM_BOUNDS.z then
		return
	end
	if snapped.Y < 0 or snapped.Y > ROOM_BOUNDS.y then
		return
	end

	local data = session:Get()

	local index, entry
	for candidateIndex, candidate in ipairs(data.inventory) do
		if candidate.uid == payload.uid then
			index, entry = candidateIndex, candidate
			break
		end
	end

	if not entry or not Catalogue.Get(entry.itemId) then
		return
	end

	session:Update(function(state)
		table.remove(state.inventory, index)
		table.insert(state.placed, {
			uid = entry.uid,
			itemId = entry.itemId,
			x = snapped.X,
			y = snapped.Y,
			z = snapped.Z,
			yaw = Placement.SnapAngle(payload.yaw),
		})
	end)

	RoomBuilder.rebuild(session:Get().placed)
end

routes["build/remove"] = function(session, payload)
	if typeof(payload) ~= "table" or typeof(payload.uid) ~= "number" then
		return
	end

	local data = session:Get()

	local index, entry
	for candidateIndex, candidate in ipairs(data.placed) do
		if candidate.uid == payload.uid then
			index, entry = candidateIndex, candidate
			break
		end
	end

	if not entry then
		return
	end

	-- Ranger son dernier écran enfermerait le joueur dehors : toute
	-- l'interface du jeu vit sur cet écran, y compris le bouton qui
	-- permettrait de le ressortir.
	local item = Catalogue.Get(entry.itemId)
	if item and item.category == "display" then
		local displays = 0
		for _, candidate in ipairs(data.placed) do
			local other = Catalogue.Get(candidate.itemId)
			if other and other.category == "display" then
				displays += 1
			end
		end
		if displays <= 1 then
			return
		end
	end

	session:Update(function(state)
		table.remove(state.placed, index)
		table.insert(state.inventory, { uid = entry.uid, itemId = entry.itemId })
	end)

	RoomBuilder.rebuild(session:Get().placed)
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

	-- Le mobilier de départ est dans l'état du joueur : il faut donc le
	-- construire, exactement comme un objet acheté.
	RoomBuilder.rebuild(session:Get().placed)

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
local function tickClock(session, deltaTime: number)
	local scale = session:Get().timeScale or 0
	if scale <= 0 then
		return
	end

	session:Update(function(state)
		-- timeScale minutes de jeu par minute réelle.
		state.clockMinutes += (scale / 60) * deltaTime

		if state.clockMinutes >= 1440 then
			state.clockMinutes -= 1440
			state.day += 1
		end
	end)
end

task.spawn(function()
	while true do
		task.wait(1)
		for _, session in pairs(sessions) do
			tickClock(session, 1)
			tickLive(session, 1)
		end
	end
end)

DevRoom.build()

print("[KZ] Serveur prêt.")
