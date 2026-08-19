--!strict
--[[
	Power — l'alimentation électrique de la pièce.

	On a choisi de ne pas faire tirer les câbles de données à la main :
	poser un appareil à portée le branche. L'électricité, elle, se gère —
	et c'est elle qui porte toute la tension technique du jeu.

	Deux limites indépendantes :

	  les PRISES   combien d'appareils peuvent être branchés
	  les WATTS    ce que la ligne électrique supporte

	Quand une limite est dépassée, on ne coupe pas tout : les appareils les
	moins prioritaires ne sont simplement pas alimentés. C'est déterministe,
	lisible, et surtout ça n'enferme jamais le joueur dehors — couper son
	écran lui retirerait l'interface qui permettrait de débrancher quelque
	chose.

	Le vrai coup de théâtre est ailleurs : au-dessus d'un certain seuil de
	charge, le disjoncteur peut sauter EN DIRECT. Temporaire, spectaculaire,
	et entièrement de la faute du joueur.
]]

local Catalogue = require(script.Parent.Catalogue)

local Power = {}

--- Ligne d'origine : le vieux circuit de la chambre, partagé avec le reste
--- de l'étage, et quatre prises murales. Tout le reste s'achète.
---
--- Les deux limites n'enseignent pas la même chose. Les PRISES se saturent
--- très vite — deux appareils secteur de libre au départ — et apprennent au
--- joueur qu'une multiprise à douze euros débloque plus qu'un achat à cent.
--- Les WATTS ne deviennent un problème qu'avec une vraie machine, un mur
--- d'écrans et de la lumière partout : c'est le danger de fin de partie.
Power.BaseCapacity = 1600
Power.BaseSockets = 4

--- Au-delà de cette part de la capacité, le disjoncteur devient nerveux.
Power.TripThreshold = 0.85

--- Durée d'une coupure, en secondes de jeu.
Power.TripDuration = 25

-- Ordre de sacrifice : ce qui part en premier quand la ligne est trop
-- chargée. Plus le nombre est petit, plus l'appareil est protégé.
local PRIORITY: { [string]: number } = {
	display = 0,
	computer = 1,
	camera = 2,
	microphone = 3,
	audio = 3,
	capture = 4,
	streamdeck = 5,
	key = 6,
	fill = 7,
	backdrop = 7,
	rim = 8,
	hub = 9,
	decoscreen = 10,
	led = 11,
}

export type Report = {
	load: number,
	capacity: number,
	socketsUsed: number,
	socketsTotal: number,
	unpowered: { [number]: boolean },
	overloaded: boolean,
	strain: number,
}

--- Calcule qui est alimenté et qui ne l'est pas.
function Power.evaluate(placed: { any }): Report
	local capacity = Power.BaseCapacity
	local sockets = Power.BaseSockets

	-- Premier passage : ce que l'installation électrique elle-même apporte.
	-- Une multiprise ne consomme rien et ne se branche pas sur elle-même.
	local consumers = {}

	for _, entry in ipairs(placed) do
		local item = Catalogue.Get(entry.itemId)
		if not item then
			continue
		end

		if item.family == "power" then
			if item.sockets then
				-- La multiprise occupe une prise murale et en rend plusieurs.
				sockets += item.sockets - 1
			end
			if item.category == "circuit" and item.maxWatts then
				capacity = math.max(capacity, item.maxWatts)
			end
		elseif (item.power or 0) > 0 then
			table.insert(consumers, { entry = entry, item = item })
		end
	end

	-- Deuxième passage : on alimente par ordre de priorité, puis par ordre
	-- de pose. Ce qui dépasse reste éteint.
	table.sort(consumers, function(a, b)
		local pa = PRIORITY[a.item.category] or 12
		local pb = PRIORITY[b.item.category] or 12
		if pa ~= pb then
			return pa < pb
		end
		return a.entry.uid < b.entry.uid
	end)

	local load = 0
	local socketsUsed = 0
	local unpowered: { [number]: boolean } = {}
	local overloaded = false

	for _, consumer in ipairs(consumers) do
		local item = consumer.item
		local watts = item.power or 0

		-- Un appareil alimenté en USB tire son courant de la machine : il
		-- pèse sur la ligne, mais il n'occupe pas de prise murale. Sans
		-- cette nuance, une webcam à deux watts coûterait aussi cher
		-- qu'une tour.
		local needsSocket = true
		if item.requires and #item.requires > 0 then
			needsSocket = false
			for _, port in ipairs(item.requires) do
				if port == "power" then
					needsSocket = true
					break
				end
			end
		end

		local socketCost = needsSocket and 1 or 0

		if socketsUsed + socketCost > sockets or load + watts > capacity then
			unpowered[consumer.entry.uid] = true
			overloaded = true
		else
			socketsUsed += socketCost
			load += watts
		end
	end

	return {
		load = load,
		capacity = capacity,
		socketsUsed = socketsUsed,
		socketsTotal = sockets,
		unpowered = unpowered,
		overloaded = overloaded,
		strain = capacity > 0 and load / capacity or 0,
	}
end

--- Le disjoncteur saute-t-il maintenant ? Appelé une fois par seconde
--- pendant un direct : plus la ligne est chargée, plus le risque monte,
--- et il reste nul en dessous du seuil.
function Power.shouldTrip(report: Report): boolean
	if report.strain < Power.TripThreshold then
		return false
	end

	-- De 0 à 1,2 % par seconde entre le seuil et la saturation : assez rare
	-- pour surprendre, assez fréquent pour qu'on finisse par apprendre.
	local excess = (report.strain - Power.TripThreshold) / (1 - Power.TripThreshold)
	return math.random() < math.clamp(excess, 0, 1) * 0.012
end

return Power
