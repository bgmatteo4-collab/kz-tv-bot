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
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local Materiaux = require(Partage.Charte.Materiaux)

local Coque = require(script.Construction.Coque)
local Eclairage = require(script.Construction.Eclairage)
local Grill = require(script.Construction.Grill)
local Materiel = require(script.Construction.Materiel)
local Mobilier = require(script.Construction.Mobilier)
local Scenographie = require(script.Construction.Scenographie)

local PLAFOND_MATERIAUX = 14

--- Retire ce que Studio pose dans un place vide et qui n'a rien à faire ici.
local function nettoyerLeDecorParDefaut()
	local socle = Workspace:FindFirstChild("Baseplate")
	if socle then
		socle:Destroy()
	end
end

--- Les réglages de rendu vivent dans `default.project.json`. On vérifie qu'ils
--- ont bien été appliqués plutôt que de les réécrire en silence : un décor
--- éclairé en Voxel n'a rien à voir avec le rendu visé, et il vaut mieux le
--- savoir tout de suite que le découvrir sur une capture d'écran.
local function verifierLeRendu()
	-- `Lighting.Technology` n'est pas lisible depuis un script serveur
	-- ordinaire : Roblox le réserve à une capacité que nous n'avons pas. La
	-- lecture est donc protégée. Une vérification de confort ne doit jamais
	-- pouvoir empêcher la construction — c'est exactement ce qui est arrivé.
	local lisible, technologie = pcall(function()
		return Lighting.Technology
	end)

	if lisible and technologie ~= Enum.Technology.Future then
		warn(
			`[Rendu] Lighting.Technology vaut {technologie.Name} au lieu de Future. `
				.. "Les mesures de performance ne seront pas représentatives."
		)
	end

	-- Le chargement par flux est volontairement désactivé en v0.1 : il n'a
	-- aucun intérêt sur une pièce de soixante parts et ajoute une variable de
	-- plus au diagnostic. Il redevient obligatoire en v0.2, quand le local
	-- entier existera (CDC §14, écart consigné au backlog).
	local flux = select(
		2,
		pcall(function()
			return Workspace.StreamingEnabled
		end)
	)
	if flux == true then
		warn("[Rendu] StreamingEnabled est actif ; la v0.1 se mesure sans lui.")
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

local function construire()
	local depart = os.clock()

	local materiaux = verifierLesMateriaux()
	local racine = Coque.construire(Workspace)
	local poutres = Grill.construire(racine)
	local dalles = Scenographie.construire(racine)
	local cameras = Materiel.construire(racine)
	local places, moniteurs = Mobilier.construire(racine)
	local ombres = Eclairage.construire(racine)

	local parts = 0
	for _, descendant in racine:GetDescendants() do
		if descendant:IsA("BasePart") then
			parts += 1
		end
	end

	print(
		string.format(
			"[Le Local] v0.1 bâtie en %.0f ms — %d parts, %d matériaux sur %d.",
			(os.clock() - depart) * 1000,
			parts,
			materiaux,
			PLAFOND_MATERIAUX
		)
	)
	print(
		string.format(
			"[Le Local] %d poutres · %d dalles LED · %d caméras · %d places · %d moniteurs · %d sources à ombre sur %d.",
			poutres,
			dalles,
			cameras,
			places,
			moniteurs,
			ombres,
			Eclairage.BUDGET_OMBRES
		)
	)
end

-- La construction est protégée : une erreur ne doit jamais se traduire par un
-- écran vide et muet. Elle doit se voir, se lire, et laisser le joueur debout.
-- Le point d'apparition, lui, est statique : il vit dans le fichier de place et
-- existe donc avant que la moindre ligne de code tourne.
local reussite, souci = pcall(function()
	nettoyerLeDecorParDefaut()
	verifierLeRendu()
	construire()
end)

if not reussite then
	warn("[Le Local] LA CONSTRUCTION A ÉCHOUÉ : " .. tostring(souci))
end

Workspace:SetAttribute("DecorConstruit", reussite)
Workspace:SetAttribute("DecorErreur", if reussite then "" else tostring(souci))
