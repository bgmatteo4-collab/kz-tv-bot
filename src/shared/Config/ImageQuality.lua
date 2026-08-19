--!strict
--[[
	ImageQuality — ce que la caméra voit vraiment.

	C'est le module qui tient la promesse du projet : on n'achète pas un bon
	setup, on le monte. La note ne lit aucune statistique d'objet, elle
	calcule de la géométrie — où est la caméra, où est le siège, ce qu'il y
	a derrière, d'où vient la lumière.

	Quatre sous-notes indépendantes, parce qu'un joueur doit pouvoir savoir
	QUOI corriger et pas seulement qu'il est mauvais :

	  cadrage    es-tu dans le champ, à la bonne distance ?
	  lumière    es-tu éclairé de face, ou à contre-jour ?
	  fond       y a-t-il quelque chose derrière toi ?
	  cohérence  le décor raconte-t-il une seule histoire ?

	Tout se calcule côté serveur à partir des objets posés. Aucun raycast,
	aucune dépendance au rendu : c'est reproductible et impossible à
	tromper depuis le client.
]]

local Catalogue = require(script.Parent.Catalogue)
local Placement = require(script.Parent.Placement)
local Styles = require(script.Parent.Styles)

local ImageQuality = {}

-- Hauteur du visage au-dessus de l'assise, et distances de cadrage.
-- Distances exprimées dans l'échelle du projet : 1 stud = 25 cm. Un
-- streamer assis se filme entre 60 cm et 1,60 m de sa caméra.
local HEAD_HEIGHT = 2.2
local IDEAL_MIN_DISTANCE = 2.5
local IDEAL_MAX_DISTANCE = 6.5
local MAX_FRAMING_ANGLE = 38

export type Report = {
	framing: number,
	lighting: number,
	background: number,
	coherence: number,
	total: number,
	issues: { string },
	hasCamera: boolean,
}

local function positionOf(entry): Vector3
	return Vector3.new(entry.x, entry.y, entry.z)
end

local function degreesBetween(a: Vector3, b: Vector3): number
	local dot = math.clamp(a.Unit:Dot(b.Unit), -1, 1)
	return math.deg(math.acos(dot))
end

--- Regroupe les objets posés par rôle, une seule fois, pour que chaque
--- sous-note n'ait plus qu'à lire ce qui la concerne.
local function collect(placed: { any })
	local groups = {
		camera = nil :: any,
		subject = nil :: any,
		lights = {},
		backdrops = {},
		decor = {},
		styles = {},
	}

	for _, entry in ipairs(placed) do
		local item = Catalogue.Get(entry.itemId)
		if not item then
			continue
		end

		if item.style and item.visible ~= false then
			groups.styles[item.style] = (groups.styles[item.style] or 0) + 1
		end

		if item.category == "camera" then
			-- La meilleure caméra posée fait foi : personne ne filme avec la
			-- vieille webcam quand un hybride est sur le bureau.
			if not groups.camera or (item.quality or 0) > (groups.camera.item.quality or 0) then
				groups.camera = { entry = entry, item = item }
			end
		elseif item.category == "chair" then
			groups.subject = { entry = entry, item = item }
		elseif item.family == "lighting" and item.category ~= "hub" then
			table.insert(groups.lights, { entry = entry, item = item })
		elseif item.category == "backdrop" then
			table.insert(groups.backdrops, { entry = entry, item = item })
		elseif item.family == "decor" or item.category == "storage" or item.category == "decoscreen" then
			table.insert(groups.decor, { entry = entry, item = item })
		end
	end

	return groups
end

--- Es-tu dans le champ, et à la bonne distance ?
local function scoreFraming(cameraPos: Vector3, forward: Vector3, subject: Vector3): (number, string?)
	local toSubject = subject - cameraPos
	local distance = toSubject.Magnitude

	if distance < 0.5 then
		return 0, "La caméra est collée au sujet."
	end

	local angle = degreesBetween(forward, toSubject)
	local centering = math.clamp(1 - angle / MAX_FRAMING_ANGLE, 0, 1)

	local distanceScore
	if distance < IDEAL_MIN_DISTANCE then
		distanceScore = math.clamp(distance / IDEAL_MIN_DISTANCE, 0, 1)
	elseif distance > IDEAL_MAX_DISTANCE then
		distanceScore = math.clamp(1 - (distance - IDEAL_MAX_DISTANCE) / 6, 0, 1)
	else
		distanceScore = 1
	end

	local score = centering * 0.65 + distanceScore * 0.35

	local issue
	if centering < 0.3 then
		issue = "Tu n'es pas dans le champ. Tourne la caméra vers le siège."
	elseif distance > IDEAL_MAX_DISTANCE + 3 then
		issue = "La caméra est trop loin : tu es minuscule à l'image."
	elseif distance < IDEAL_MIN_DISTANCE then
		issue = "La caméra est trop près : le cadrage est étouffant."
	end

	return score, issue
end

--- D'où vient la lumière ? Une source derrière toi sans rien devant fait
--- une silhouette noire, et c'est mérité.
local function scoreLighting(cameraPos: Vector3, subject: Vector3, lights): (number, string?)
	if #lights == 0 then
		return 0.12, "Aucune lumière : tu es éclairé par ton seul écran."
	end

	-- L'axe de vue va de la caméra vers le sujet. Une lumière « de face »
	-- est donc du côté de la caméra.
	local viewAxis = (subject - cameraPos).Unit

	local frontal = 0
	local rim = 0
	local backlightOnly = true

	for _, light in ipairs(lights) do
		local item = light.item
		local toLight = positionOf(light.entry) - subject

		if toLight.Magnitude < 0.5 then
			continue
		end

		local quality = item.quality or 0.25
		-- Positif si la lumière est du côté caméra, négatif si elle est
		-- derrière le sujet.
		local facing = toLight.Unit:Dot(-viewAxis)
		local offAxis = degreesBetween(toLight, -viewAxis)

		if facing > 0.15 then
			backlightOnly = false
			-- Une source pile dans l'axe aplatit le visage ; entre vingt et
			-- soixante-dix degrés, elle sculpte.
			local shaping = 1 - math.abs(offAxis - 45) / 55
			frontal += quality * (0.55 + 0.45 * math.clamp(shaping, 0, 1))
		elseif facing < -0.2 then
			rim += quality * 0.5
		end
	end

	local score = math.clamp(frontal, 0, 1) * 0.8 + math.clamp(rim, 0, 0.4) * 0.5

	local issue
	if backlightOnly then
		score = math.min(score, 0.25)
		issue = "Tout ton éclairage est derrière toi : tu es en ombre chinoise."
	elseif frontal < 0.35 then
		issue = "Ton visage manque de lumière de face."
	end

	return math.clamp(score, 0, 1), issue
end

--- Y a-t-il quelque chose derrière toi ? Un fond vert bien placé l'emporte ;
--- sinon on compte ce qui habille l'arrière-plan.
local function scoreBackground(cameraPos: Vector3, subject: Vector3, backdrops, decor): (number, string?)
	local viewAxis = (subject - cameraPos).Unit

	local function isBehind(entry, maxDistance: number, maxAngle: number): boolean
		local toItem = positionOf(entry) - subject
		if toItem.Magnitude > maxDistance then
			return false
		end
		return degreesBetween(toItem, viewAxis) < maxAngle
	end

	for _, backdrop in ipairs(backdrops) do
		if isBehind(backdrop.entry, 8, 55) then
			local coverage = backdrop.item.quality or 0.5
			return math.clamp(0.55 + coverage * 0.45, 0, 1), nil
		end
	end

	local dressing = 0
	for _, piece in ipairs(decor) do
		if isBehind(piece.entry, 9, 60) then
			dressing += 0.18
		end
	end

	if #backdrops > 0 then
		return math.clamp(0.25 + dressing, 0, 1), "Ton fond vert n'est pas derrière toi dans l'axe de la caméra."
	end

	if dressing <= 0 then
		return 0.18, "Ton arrière-plan est un mur nu."
	end

	return math.clamp(0.25 + dressing, 0, 0.85), nil
end

--- Calcule le rapport complet à partir des objets posés.
function ImageQuality.evaluate(placed: { any }): Report
	local groups = collect(placed)

	local coherence = select(1, Styles.ComputeCoherence(groups.styles))

	if not groups.camera then
		return {
			framing = 0,
			lighting = 0,
			background = 0,
			coherence = coherence,
			total = 0,
			issues = { "Aucune caméra posée dans la pièce." },
			hasCamera = false,
		}
	end

	local cameraEntry = groups.camera.entry
	local cameraPos = positionOf(cameraEntry)
	local forward = Placement.ToCFrame(cameraEntry.x, cameraEntry.y, cameraEntry.z, cameraEntry.yaw).LookVector

	-- Sans siège posé, on suppose que le streamer se tient juste devant la
	-- caméra : le jeu ne doit pas s'effondrer parce qu'un meuble manque.
	local subject
	if groups.subject then
		subject = positionOf(groups.subject.entry) + Vector3.new(0, HEAD_HEIGHT, 0)
	else
		subject = cameraPos + forward * 3.5
	end

	local issues = {}
	local function push(issue: string?)
		if issue then
			table.insert(issues, issue)
		end
	end

	local framing, framingIssue = scoreFraming(cameraPos, forward, subject)
	local lighting, lightingIssue = scoreLighting(cameraPos, subject, groups.lights)
	local background, backgroundIssue = scoreBackground(cameraPos, subject, groups.backdrops, groups.decor)

	push(framingIssue)
	push(lightingIssue)
	push(backgroundIssue)

	if coherence < 0.6 then
		push("Trop de styles différents : ton décor part dans tous les sens.")
	end

	-- La qualité de la caméra plafonne le cadrage : une webcam de grenier
	-- reste une webcam de grenier, même parfaitement placée.
	local cameraQuality = groups.camera.item.quality or 0.2
	framing = framing * (0.5 + cameraQuality * 0.5)

	local total = framing * 0.3 + lighting * 0.3 + background * 0.25 + coherence * 0.15

	return {
		framing = framing,
		lighting = lighting,
		background = background,
		coherence = coherence,
		total = math.clamp(total, 0, 1),
		issues = issues,
		hasCamera = true,
	}
end

return ImageQuality
