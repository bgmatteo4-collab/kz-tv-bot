--!strict
--[[
	Eclairage — les projecteurs du plateau et de la régie.

	Cahier des charges §9.3 : c'est la lumière qui fait « studio
	professionnel », davantage que la géométrie. Le plateau est éclairé en
	trois points — face, latérale, contre-jour — plus un lavage du fond.

	Budget §14 : **douze sources projetant une ombre au maximum**. C'est une
	limite de conception, pas un objectif. Le compte est vérifié ici même et
	la construction échoue si on le dépasse : un budget qu'on peut franchir
	sans s'en apercevoir n'est pas un budget.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)
local Echelle = require(Partage.Charte.Echelle)
local Palette = require(Partage.Charte.Palette)

local Batir = require(script.Parent.Batir)

local Eclairage = {}

local BUDGET_OMBRES = 12
local PORTEE_M = 20

type Projecteur = {
	nom: string,
	position: Vector3,
	cible: Vector3,
	couleur: Color3,
	intensite: number,
	angle: number,
	ombres: boolean,
}

--- Hauteur d'accroche : juste sous les poutres du grill.
local accroche = C.grill.hauteur - C.grill.section - 0.15

--- Le plan de feu de la configuration talk-show. Le décor est au sud, les
--- caméras au nord : les sources de face viennent donc de Z positif.
local PLAN_DE_FEU: { Projecteur } = {
	{
		nom = "Face",
		position = Vector3.new(-4, accroche, 2),
		cible = Vector3.new(0, 1.4, -3),
		couleur = Palette.LumiereChaude,
		intensite = 3,
		angle = 62,
		ombres = true,
	},
	{
		nom = "Laterale",
		position = Vector3.new(4, accroche, 2),
		cible = Vector3.new(0, 1.4, -3),
		couleur = Palette.LumiereNeutre,
		intensite = 1.6,
		angle = 72,
		ombres = false,
	},
	{
		nom = "ContreJourGauche",
		position = Vector3.new(-3, accroche, -5.2),
		cible = Vector3.new(-1.5, 1.6, -2.5),
		couleur = Palette.LumiereNeutre,
		intensite = 2.4,
		angle = 46,
		ombres = true,
	},
	{
		nom = "ContreJourDroit",
		position = Vector3.new(3, accroche, -5.2),
		cible = Vector3.new(1.5, 1.6, -2.5),
		couleur = Palette.LumiereNeutre,
		intensite = 2.4,
		angle = 46,
		ombres = true,
	},
}

--- Le lavage du fond de scène. Couleur d'accent, donc provisoire tant que
--- l'identité Kay Prod n'existe pas (CDC §9.6).
local function planDeFeuDuFond(): { Projecteur }
	local fond = {}
	for _, x in { -3.5, 0, 3.5 } do
		table.insert(fond, {
			nom = `LavageFond_{x}`,
			position = Vector3.new(x, accroche, -4.4),
			cible = Vector3.new(x, 1.6, -C.plateau.profondeur / 2 + C.fond.retrait),
			couleur = Palette.AccentProvisoire,
			intensite = 2,
			angle = 52,
			ombres = false,
		})
	end
	return fond
end

--- Le sas d'entrée. Sans lui la pièce est noire : l'ambiance générale du jeu
--- est réglée sur noir absolu, comme il se doit pour un studio, donc toute
--- pièce fermée sans source est parfaitement aveugle. Et c'est précisément la
--- pièce où le joueur apparaît.
local function planDeFeuSas(): { Projecteur }
	local sas = {}
	-- Positions dérivées de la face extérieure du mur ouest : le sas suit le
	-- plateau quand celui-ci change de taille.
	local sasFin = -(C.plateau.largeur / 2 + C.epaisseurMur)
	for index, x in { sasFin - 1.2, sasFin - 3 } do
		table.insert(sas, {
			nom = `PlafonnierSas_{index}`,
			position = Vector3.new(x, 2.85, 0),
			cible = Vector3.new(x, 0, 0),
			couleur = Palette.LumiereNeutre,
			intensite = 2.2,
			angle = 110,
			ombres = index == 1,
		})
	end
	return sas
end

--- La régie reste sombre : les écrans y sont les sources dominantes, et deux
--- plafonniers froids suffisent à ne pas travailler dans le noir complet.
local function planDeFeuRegie(): { Projecteur }
	local regie = {}
	local zDepart = C.plateau.profondeur / 2 + C.epaisseurMur + 1.2
	for index, z in { zDepart, zDepart + 2.6 } do
		table.insert(regie, {
			nom = `PlafonnierRegie_{index}`,
			position = Vector3.new(0, C.regie.hauteur - 0.1, z),
			cible = Vector3.new(0, 0, z),
			couleur = Palette.LumiereFroide,
			intensite = 1.1,
			angle = 90,
			ombres = false,
		})
	end
	return regie
end

--- `CFrame.lookAt` dégénère quand la direction de visée est parallèle à son
--- vecteur haut par défaut : un plafonnier qui éclaire droit vers le bas
--- produit alors une orientation invalide. On bascule le vecteur haut dans ce
--- cas plutôt que d'incliner artificiellement la source.
local function orienter(depuis: Vector3, vers: Vector3): CFrame
	local direction = (vers - depuis).Unit
	local haut = if math.abs(direction.Y) > 0.999
		then Vector3.new(0, 0, 1)
		else Vector3.new(0, 1, 0)
	return CFrame.lookAt(Echelle.v(depuis), Echelle.v(vers), haut)
end

local function poser(parent: Instance, projecteur: Projecteur)
	local corps = Batir.bloc({
		nom = `Projecteur_{projecteur.nom}`,
		parent = parent,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.28, 0.28, 0.42),
		positionM = projecteur.position,
		collision = false,
		cframe = orienter(projecteur.position, projecteur.cible),
	})

	local lumiere = Instance.new("SpotLight")
	lumiere.Name = "Faisceau"
	lumiere.Face = Enum.NormalId.Front -- aligné sur le regard de la part
	lumiere.Angle = projecteur.angle
	lumiere.Brightness = projecteur.intensite
	lumiere.Color = projecteur.couleur
	lumiere.Range = math.min(Echelle.m(PORTEE_M), 60)
	lumiere.Shadows = projecteur.ombres
	lumiere.Parent = corps
end

--- Pose tout l'éclairage et renvoie le nombre de sources projetant une ombre.
function Eclairage.construire(parent: Instance): number
	local dossier = Batir.dossier("Eclairage", parent)

	local plan = table.clone(PLAN_DE_FEU)
	for _, projecteur in planDeFeuDuFond() do
		table.insert(plan, projecteur)
	end
	for _, projecteur in planDeFeuRegie() do
		table.insert(plan, projecteur)
	end
	for _, projecteur in planDeFeuSas() do
		table.insert(plan, projecteur)
	end

	local ombres = 0
	for _, projecteur in plan do
		if projecteur.ombres then
			ombres += 1
		end
		poser(dossier, projecteur)
	end

	if ombres > BUDGET_OMBRES then
		error(
			`Eclairage : {ombres} sources à ombre pour un budget de {BUDGET_OMBRES} (CDC §14)`,
			2
		)
	end

	return ombres
end

Eclairage.BUDGET_OMBRES = BUDGET_OMBRES

return Eclairage
