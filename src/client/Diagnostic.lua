--!strict
--[[
	Diagnostic — le panneau de mesure de la v0.1.

	Cette version n'existe que pour répondre à des questions chiffrées
	(CDC §10.4, backlog V1 à V5). Ce panneau est l'instrument qui y répond :
	images par seconde, plancher observé, et surtout la **hauteur réelle de
	l'avatar**, dont dépend toute la table d'échelle du projet.

	C'est un outil de développement, donc soumis au drapeau `Config.Dev`
	(CDC §15) et sans aucun pouvoir : il lit, il n'agit pas.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Partage = ReplicatedStorage:WaitForChild("Partage")
local Echelle = require(Partage.Charte.Echelle)
local Palette = require(Partage.Charte.Palette)

local TOUCHE = Enum.KeyCode.F3
local FENETRE = 0.5 -- durée d'une mesure d'images par seconde, en secondes
-- Les premières secondes sont celles du chargement : les retenir comme
-- plancher fausserait la mesure pour toute la session.
local PREPARATION = 3

local Diagnostic = {}

local joueur = Players.LocalPlayer

local imagesCumulees = 0
local tempsCumule = 0
local imagesParSeconde = 0
local plancher = math.huge
local depuisLeDebut = 0

local function creerPanneau(): (ScreenGui, TextLabel)
	local ecran = Instance.new("ScreenGui")
	ecran.Name = "Diagnostic"
	ecran.ResetOnSpawn = false
	ecran.IgnoreGuiInset = true
	ecran.DisplayOrder = 100

	local cadre = Instance.new("Frame")
	cadre.Name = "Cadre"
	cadre.AnchorPoint = Vector2.new(0, 0)
	cadre.Position = UDim2.fromOffset(16, 16)
	cadre.Size = UDim2.fromOffset(320, 168)
	cadre.BackgroundColor3 = Palette.NoirTechnique
	cadre.BackgroundTransparency = 0.15
	cadre.BorderSizePixel = 0
	cadre.Parent = ecran

	local coin = Instance.new("UICorner")
	coin.CornerRadius = UDim.new(0, 6)
	coin.Parent = cadre

	local marge = Instance.new("UIPadding")
	marge.PaddingTop = UDim.new(0, 12)
	marge.PaddingBottom = UDim.new(0, 12)
	marge.PaddingLeft = UDim.new(0, 14)
	marge.PaddingRight = UDim.new(0, 14)
	marge.Parent = cadre

	local texte = Instance.new("TextLabel")
	texte.Name = "Mesures"
	texte.Size = UDim2.fromScale(1, 1)
	texte.BackgroundTransparency = 1
	texte.Font = Enum.Font.RobotoMono
	texte.TextSize = 14
	texte.TextColor3 = Palette.BlancPlatre
	texte.TextXAlignment = Enum.TextXAlignment.Left
	texte.TextYAlignment = Enum.TextYAlignment.Top
	texte.Text = ""
	texte.Parent = cadre

	ecran.Parent = joueur:WaitForChild("PlayerGui")
	return ecran, texte
end

--- La mesure qui compte le plus : si l'avatar ne fait pas la hauteur attendue,
--- c'est le rapport mètre/stud de toute la charte qui doit être révisé.
local function mesurerAvatar(): (number?, string)
	local personnage = joueur.Character
	if not personnage or not personnage.PrimaryPart then
		return nil, "avatar         en attente"
	end

	local hauteur = personnage:GetExtentsSize().Y
	local ecart = hauteur - Echelle.AVATAR_ATTENDU_STUDS
	local verdict = if math.abs(ecart) < 0.15 then "conforme" else "À RÉVISER"

	return hauteur,
		string.format(
			"avatar         %.2f studs = %.2f m  (%+.2f, %s)",
			hauteur,
			Echelle.enMetres(hauteur),
			ecart,
			verdict
		)
end

local function compterParts(): number
	local total = 0
	for _, descendant in Workspace:GetDescendants() do
		if descendant:IsA("BasePart") then
			total += 1
		end
	end
	return total
end

function Diagnostic.demarrer()
	local ecran, texte = creerPanneau()
	local parts = compterParts()

	UserInputService.InputBegan:Connect(function(entree, capturee)
		if not capturee and entree.KeyCode == TOUCHE then
			ecran.Enabled = not ecran.Enabled
		end
	end)

	RunService.RenderStepped:Connect(function(delta)
		imagesCumulees += 1
		tempsCumule += delta
		depuisLeDebut += delta

		if tempsCumule < FENETRE then
			return
		end

		imagesParSeconde = imagesCumulees / tempsCumule
		imagesCumulees = 0
		tempsCumule = 0

		if depuisLeDebut >= PREPARATION and imagesParSeconde < plancher then
			plancher = imagesParSeconde
		end

		if not ecran.Enabled then
			return
		end

		local _, ligneAvatar = mesurerAvatar()
		local position = joueur.Character
				and joueur.Character.PrimaryPart
				and joueur.Character.PrimaryPart.Position
			or Vector3.zero

		texte.Text = table.concat({
			"LE LOCAL — v0.1        F3 masque · V change de vue",
			if Workspace:GetAttribute("DecorConstruit") == false
				then "DÉCOR         ÉCHEC : " .. tostring(Workspace:GetAttribute("DecorErreur"))
				else "décor          bâti",
			"",
			string.format(
				"images/s       %.0f   (plancher %s)",
				imagesParSeconde,
				if plancher == math.huge then "mesure en cours" else string.format("%.0f", plancher)
			),
			ligneAvatar,
			string.format("parts           %d", parts),
			string.format(
				"position        %.1f ; %.1f ; %.1f m",
				Echelle.enMetres(position.X),
				Echelle.enMetres(position.Y),
				Echelle.enMetres(position.Z)
			),
			"",
			string.format("échelle        1 m = %d studs", Echelle.STUDS_PAR_METRE),
		}, "\n")
	end)
end

Diagnostic.TOUCHE = TOUCHE

return Diagnostic
