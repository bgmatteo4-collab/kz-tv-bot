--!strict
--[[
	Le serveur — point d'entrée.

	v0.1 « preuve de direction artistique » (CDC §10.4). Cette version ne
	contient aucune mécanique de jeu : ni placement, ni sauvegarde, ni
	production. Elle répond à une seule question — le réalisme poussé tient-il
	dans les budgets de performance ?

	Le décor est donc bâti par code, à partir des cotes réelles déclarées dans
	`Config/Plateau`. Rien n'est positionné à la main, et rien n'est estimé à
	l'œil.
]]

local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local Materiaux = require(Partage.Charte.Materiaux)

local Coque = require(script.Construction.Coque)
local Eclairage = require(script.Construction.Eclairage)
local Grill = require(script.Construction.Grill)

local PLAFOND_MATERIAUX = 12

--- Retire ce que Studio pose dans un place vide et qui n'a rien à faire ici.
local function nettoyerLeDecorParDefaut()
	for _, nom in { "Baseplate", "SpawnLocation" } do
		local objet = Workspace:FindFirstChild(nom)
		if objet then
			objet:Destroy()
		end
	end
end

--- Les réglages de rendu vivent dans `default.project.json`. On vérifie qu'ils
--- ont bien été appliqués plutôt que de les réécrire en silence : un décor
--- éclairé en Voxel n'a rien à voir avec le rendu visé, et il vaut mieux le
--- savoir tout de suite que le découvrir sur une capture d'écran.
local function verifierLeRendu()
	if Lighting.Technology ~= Enum.Technology.Future then
		warn(
			`[Rendu] Lighting.Technology vaut {Lighting.Technology.Name} au lieu de Future. `
				.. "Les mesures de performance ne seront pas représentatives."
		)
	end

	if not Workspace.StreamingEnabled then
		warn("[Rendu] StreamingEnabled est désactivé (CDC §14).")
	end
end

local function verifierLesMateriaux()
	local nombre = Materiaux.compter()
	if nombre > PLAFOND_MATERIAUX then
		error(
			`Materiaux : {nombre} matériaux définis pour un plafond de {PLAFOND_MATERIAUX} (CDC §14)`
		)
	end
	return nombre
end

--- Un sol et un point d'apparition de secours. Ils ne servent que si la
--- construction échoue : sans eux, une erreur laisserait le joueur dans le
--- vide noir, sans le moindre indice sur ce qui s'est passé.
local function filetDeSecurite()
	local sol = Instance.new("Part")
	sol.Name = "SolDeSecours"
	sol.Anchored = true
	sol.Size = Vector3.new(120, 2, 120)
	sol.Position = Vector3.new(0, -20, 0)
	sol.Material = Enum.Material.Concrete
	sol.Parent = Workspace

	local apparition = Instance.new("SpawnLocation")
	apparition.Name = "ApparitionDeSecours"
	apparition.Anchored = true
	apparition.CanCollide = false
	apparition.Transparency = 1
	apparition.Size = Vector3.new(12, 1, 12)
	apparition.Position = Vector3.new(0, -18, 0)
	apparition.Parent = Workspace

	local lumiere = Instance.new("PointLight")
	lumiere.Brightness = 3
	lumiere.Range = 60
	lumiere.Parent = sol
end

local function retirerLeFiletDeSecurite()
	for _, nom in { "SolDeSecours", "ApparitionDeSecours" } do
		local objet = Workspace:FindFirstChild(nom)
		if objet then
			objet:Destroy()
		end
	end
end

local function construire()
	local depart = os.clock()

	local materiaux = verifierLesMateriaux()
	local racine = Coque.construire(Workspace)
	local poutres = Grill.construire(racine)
	local ombres = Eclairage.construire(racine)

	local parts = 0
	for _, descendant in racine:GetDescendants() do
		if descendant:IsA("BasePart") then
			parts += 1
		end
	end

	print(
		string.format(
			"[Le Local] v0.1 bâtie en %.0f ms — %d parts, %d poutres, %d sources à ombre sur %d, %d matériaux sur %d.",
			(os.clock() - depart) * 1000,
			parts,
			poutres,
			ombres,
			Eclairage.BUDGET_OMBRES,
			materiaux,
			PLAFOND_MATERIAUX
		)
	)
end

-- Le décor n'existe pas encore quand le script démarre : il n'y a donc ni sol
-- ni point d'apparition. Un joueur qui rejoint pendant la construction
-- tomberait dans le vide. On suspend l'apparition, on bâtit, puis on la rend.
Players.CharacterAutoLoads = false

nettoyerLeDecorParDefaut()
verifierLeRendu()
filetDeSecurite()

-- La construction est protégée : une erreur ici ne doit jamais se traduire par
-- un écran noir sans explication. Elle doit se voir, se lire, et laisser le
-- joueur debout quelque part.
local reussite, souci = pcall(construire)

if reussite then
	retirerLeFiletDeSecurite()
else
	warn("[Le Local] LA CONSTRUCTION A ÉCHOUÉ : " .. tostring(souci))
	warn("[Le Local] Filet de sécurité actif : tu es sur une dalle de secours.")
end

Workspace:SetAttribute("DecorConstruit", reussite)
Workspace:SetAttribute("DecorErreur", if reussite then "" else tostring(souci))

Players.CharacterAutoLoads = true
for _, joueur in Players:GetPlayers() do
	joueur:LoadCharacter()
end
