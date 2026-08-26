--!nocheck
--[[
	Simulateur — un faux Roblox, juste assez pour exécuter la construction.

	Le décor est bâti par du code : il peut donc être bâti sans Roblox, et donc
	MESURÉ sans ouvrir Studio. Ce module réimplémente le strict minimum de l'API
	(instances, Vector3, CFrame, Enum) pour que `Coque`, `Grill` et `Eclairage`
	tournent tels quels, sans être modifiés d'une ligne.

	C'est ce qui permet de vérifier des affirmations comme « le plateau fait
	12 × 10 m » autrement qu'à l'œil.
]]

local Simulateur = {}

-- Vector3 ------------------------------------------------------------------
local V3 = {}
V3.__index = V3
local function v3(x, y, z)
	return setmetatable({ X = x, Y = y, Z = z }, V3)
end
V3.__mul = function(a, b)
	if type(b) == "number" then
		return v3(a.X * b, a.Y * b, a.Z * b)
	end
	return v3(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
end
V3.__add = function(a, b)
	return v3(a.X + b.X, a.Y + b.Y, a.Z + b.Z)
end
V3.__sub = function(a, b)
	return v3(a.X - b.X, a.Y - b.Y, a.Z - b.Z)
end
V3.__index = function(self, k)
	if k == "Magnitude" then
		return math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2)
	elseif k == "Unit" then
		local m = rawget(self, "X") and math.sqrt(self.X ^ 2 + self.Y ^ 2 + self.Z ^ 2) or 1
		if m == 0 then
			m = 1
		end
		return v3(self.X / m, self.Y / m, self.Z / m)
	end
	return rawget(V3, k)
end
V3.__tostring = function(s)
	return string.format("(%.2f, %.2f, %.2f)", s.X, s.Y, s.Z)
end

-- CFrame : on ne garde que la position, seule chose que l'on mesure ---------
local CF = {}
CF.__index = CF
local function cf(pos)
	return setmetatable({ Position = pos or v3(0, 0, 0) }, CF)
end
CF.__mul = function(a, _)
	return cf(a.Position)
end

-- Instances ----------------------------------------------------------------
local Node = {}

local function estUnePart(classe)
	return classe == "Part" or classe == "SpawnLocation"
end

local methodes = {}

function methodes:FindFirstChild(nom)
	for _, enfant in self._ordre do
		if enfant.Name == nom then
			return enfant
		end
	end
	return nil
end

function methodes:FindFirstChildWhichIsA(classe, recursif)
	for _, enfant in self._ordre do
		if enfant:IsA(classe) then
			return enfant
		end
		if recursif then
			local trouve = enfant:FindFirstChildWhichIsA(classe, true)
			if trouve then
				return trouve
			end
		end
	end
	return nil
end

function methodes:WaitForChild(nom)
	return self:FindFirstChild(nom)
end

function methodes:IsA(classe)
	if classe == "BasePart" then
		return estUnePart(self.ClassName)
	end
	return self.ClassName == classe
end

function methodes:GetDescendants()
	local tous = {}
	for _, enfant in self._ordre do
		table.insert(tous, enfant)
		for _, petit in enfant:GetDescendants() do
			table.insert(tous, petit)
		end
	end
	return tous
end

function methodes:Destroy()
	if self.Parent then
		for index, enfant in self.Parent._ordre do
			if enfant == self then
				table.remove(self.Parent._ordre, index)
				break
			end
		end
	end
end

function methodes:SetAttribute() end
function methodes:GetAttribute()
	return nil
end

Node.__index = function(self, cle)
	local methode = methodes[cle]
	if methode then
		return methode
	end
	for _, enfant in rawget(self, "_ordre") do
		if enfant.Name == cle then
			return enfant
		end
	end
	return nil
end

Node.__newindex = function(self, cle, valeur)
	if cle == "Parent" then
		rawset(self, "Parent", valeur)
		if valeur then
			table.insert(rawget(valeur, "_ordre"), self)
		end
	else
		rawset(self, cle, valeur)
	end
end

local function noeud(classe, nom)
	return setmetatable({
		ClassName = classe,
		Name = nom or classe,
		_ordre = {},
		Parent = nil,
	}, Node)
end

-- Enum : n'importe quel membre existe et connaît son nom --------------------
local function enumCategorie()
	return setmetatable({}, {
		__index = function(_, nom)
			return { Name = nom }
		end,
	})
end

-- Montage de l'environnement -----------------------------------------------
function Simulateur.environnement()
	local Workspace = noeud("Workspace", "Workspace")
	local ReplicatedStorage = noeud("ReplicatedStorage", "ReplicatedStorage")
	local Lighting = noeud("Lighting", "Lighting")
	local Players = noeud("Players", "Players")

	Workspace.StreamingEnabled = false

	-- Le point d'apparition vit dans le fichier de place : on le reproduit.
	local apparition = noeud("SpawnLocation", "Apparition")
	apparition.Parent = Workspace

	local services = {
		Workspace = Workspace,
		ReplicatedStorage = ReplicatedStorage,
		Lighting = Lighting,
		Players = Players,
	}

	local cache = {}

	--- Charge un module depuis le registre `Modules`, alimenté par le paquet
	--- généré. Chaque module y est une fonction prenant son propre `script`.
	local function charger(chemin: string, noeudScript)
		if cache[chemin] then
			return cache[chemin]
		end
		local fabrique = Modules[chemin]
		assert(fabrique, "module absent du paquet : " .. chemin)
		local resultat = fabrique(noeudScript)
		cache[chemin] = resultat
		return resultat
	end

	-- Chaque module partagé est un nœud qui connaît son fichier.
	local function poserModule(parent, nom, chemin)
		local n = noeud("ModuleScript", nom)
		n._chemin = chemin
		n.Parent = parent
		return n
	end

	local partage = noeud("Folder", "Partage")
	partage.Parent = ReplicatedStorage
	local charte = noeud("Folder", "Charte")
	charte.Parent = partage
	local config = noeud("Folder", "Config")
	config.Parent = partage

	for _, nom in { "Echelle", "Palette", "Materiaux" } do
		poserModule(charte, nom, "src/shared/Charte/" .. nom .. ".lua")
	end
	for _, nom in { "Dev", "Plateau" } do
		poserModule(config, nom, "src/shared/Config/" .. nom .. ".lua")
	end

	local serveur = noeud("Script", "Serveur")
	local construction = noeud("Folder", "Construction")
	construction.Parent = serveur
	for _, nom in { "Batir", "Mur", "Coque", "Grill", "Eclairage" } do
		poserModule(construction, nom, "src/server/Construction/" .. nom .. ".lua")
	end

	game = {
		GetService = function(_, nom)
			return services[nom] or noeud(nom, nom)
		end,
	}
	workspace = Workspace
	Vector3 = { new = v3, zero = v3(0, 0, 0) }
	CFrame = {
		new = function(p)
			return cf(p)
		end,
		lookAt = function(depuis)
			return cf(depuis)
		end,
		Angles = function()
			return cf(v3(0, 0, 0))
		end,
	}
	Color3 = {
		fromRGB = function(r, g, b)
			return { R = r, G = g, B = b }
		end,
	}
	Instance = {
		new = function(classe)
			return noeud(classe)
		end,
	}
	Enum = setmetatable({}, {
		__index = function()
			return enumCategorie()
		end,
	})
	warn = function(...)
		print("[avertissement]", ...)
	end
	require = function(cible)
		return charger(cible._chemin, cible)
	end

	return {
		Workspace = Workspace,
		construction = construction,
		charger = charger,
	}
end

Simulateur.v3 = v3

return Simulateur
