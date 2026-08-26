--!strict
--[[
	Materiel — le matériel technique du plateau.

	Tout ce qui est ici est anguleux, donc entièrement modélisable en géométrie
	native : un pied de caméra, un flight case ou un chemin de câbles n'a rien
	d'organique. C'est ce que j'avais eu tort d'écarter en attendant des modèles
	3D — seuls les assises rembourrées en ont réellement besoin.

	Les cotes viennent du réel : un objectif de caméra de plateau est à 1,45 m,
	c'est-à-dire à hauteur d'œil d'une personne assise. Plus haut, on filme en
	plongée et l'invité a l'air écrasé.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)
local E = require(Partage.Config.Equipement)
local Palette = require(Partage.Charte.Palette)

local Batir = require(script.Parent.Batir)

local Materiel = {}

--- Une caméra sur pied : embase, colonne, tête, corps, optique, viseur, tally.
local function camera(
	parent: Instance,
	def: { nom: string, x: number, z: number, hauteurObjectif: number }
)
	local dossier = Batir.dossier(`Camera{def.nom}`, parent)
	local x, z = def.x, def.z
	local hauteurColonne = def.hauteurObjectif - 0.22

	Batir.bloc({
		nom = "Embase",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.86, 0.07, 0.86),
		positionM = Vector3.new(x, 0.035, z),
	})

	Batir.bloc({
		nom = "Colonne",
		parent = dossier,
		materiau = "alu_brosse",
		tailleM = Vector3.new(0.14, hauteurColonne, 0.14),
		positionM = Vector3.new(x, hauteurColonne / 2, z),
	})

	Batir.bloc({
		nom = "Tete",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.3, 0.14, 0.32),
		positionM = Vector3.new(x, hauteurColonne + 0.07, z),
	})

	Batir.bloc({
		nom = "Corps",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.26, 0.24, 0.6),
		positionM = Vector3.new(x, def.hauteurObjectif, z),
	})

	-- L'optique regarde le décor, donc vers le sud.
	Batir.bloc({
		nom = "Optique",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.17, 0.17, 0.32),
		positionM = Vector3.new(x, def.hauteurObjectif, z - 0.44),
	})

	Batir.bloc({
		nom = "PareSoleil",
		parent = dossier,
		materiau = "caoutchouc_noir",
		tailleM = Vector3.new(0.21, 0.21, 0.07),
		positionM = Vector3.new(x, def.hauteurObjectif, z - 0.63),
	})

	Batir.bloc({
		nom = "Viseur",
		parent = dossier,
		materiau = "ecran_eteint",
		tailleM = Vector3.new(0.2, 0.13, 0.03),
		positionM = Vector3.new(x, def.hauteurObjectif + 0.17, z + 0.22),
	})

	-- Le voyant d'antenne. La couleur vient de la palette ; seule la matière
	-- émissive est imposée par la bibliothèque.
	local tally = Batir.bloc({
		nom = "Tally",
		parent = dossier,
		materiau = "led_ecran",
		tailleM = Vector3.new(0.08, 0.05, 0.03),
		positionM = Vector3.new(x, def.hauteurObjectif + 0.15, z - 0.3),
		collision = false,
	})
	tally.Color = Palette.AccentProvisoire
end

--- Un moniteur de retour sur pied : ce que les intervenants regardent.
local function retour(parent: Instance, nom: string, x: number, z: number)
	local dossier = Batir.dossier(`Retour{nom}`, parent)

	Batir.bloc({
		nom = "Embase",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(0.5, 0.05, 0.5),
		positionM = Vector3.new(x, 0.025, z),
	})
	Batir.bloc({
		nom = "Mat",
		parent = dossier,
		materiau = "alu_brosse",
		tailleM = Vector3.new(0.08, 1.15, 0.08),
		positionM = Vector3.new(x, 0.575, z),
	})
	Batir.bloc({
		nom = "Chassis",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(1.02, 0.6, 0.07),
		positionM = Vector3.new(x, 1.45, z),
	})
	Batir.bloc({
		nom = "Dalle",
		parent = dossier,
		materiau = "ecran_eteint",
		tailleM = Vector3.new(0.96, 0.54, 0.02),
		positionM = Vector3.new(x, 1.45, z - 0.045),
		collision = false,
	})
end

--- Les flight cases, empilés près de la porte de service. Un studio en
--- activité n'est jamais rangé : c'est ce désordre-là qui le rend crédible.
local function flightCases(parent: Instance)
	local dossier = Batir.dossier("FlightCases", parent)
	local x = -C.plateau.largeur / 2 + 1.1
	local piles = {
		{ z = -4.2, nombre = 3 },
		{ z = -3.1, nombre = 2 },
	}

	for indexPile, pile in piles do
		for niveau = 1, pile.nombre do
			local hauteur = 0.58
			local y = (niveau - 0.5) * hauteur

			Batir.bloc({
				nom = `Case_{indexPile}_{niveau}`,
				parent = dossier,
				materiau = "caoutchouc_noir",
				tailleM = Vector3.new(0.72, hauteur, 1.1),
				positionM = Vector3.new(x, y, pile.z),
			})
			-- La ceinture d'aluminium à mi-hauteur : le détail qui fait lire
			-- l'objet comme un flight case et non comme un carton.
			Batir.bloc({
				nom = `Ceinture_{indexPile}_{niveau}`,
				parent = dossier,
				materiau = "alu_brosse",
				tailleM = Vector3.new(0.75, 0.05, 1.13),
				positionM = Vector3.new(x, y, pile.z),
				collision = false,
			})
		end
	end
end

--- Les chemins de câbles au sol. Sans eux, un plateau paraît alimenté par
--- magie ; avec eux, on comprend d'où vient le courant.
local function cables(parent: Instance)
	local dossier = Batir.dossier("Cables", parent)
	local demiLargeur = C.plateau.largeur / 2
	local demiProfondeur = C.plateau.profondeur / 2

	for index, camera in E.cameras do
		Batir.bloc({
			nom = `Toron_{index}`,
			parent = dossier,
			materiau = "caoutchouc_noir",
			tailleM = Vector3.new(0.22, 0.035, demiProfondeur + camera.z),
			positionM = Vector3.new(camera.x, 0.017, (camera.z - demiProfondeur) / 2),
			collision = false,
		})
	end

	Batir.bloc({
		nom = "TorronMural",
		parent = dossier,
		materiau = "caoutchouc_noir",
		tailleM = Vector3.new(demiLargeur, 0.035, 0.28),
		positionM = Vector3.new(-demiLargeur / 2, 0.017, demiProfondeur - 0.3),
		collision = false,
	})
end

--- Le voyant d'antenne au-dessus de la porte de régie.
local function onAir(parent: Instance)
	local dossier = Batir.dossier("OnAir", parent)
	local z = C.plateau.profondeur / 2 - 0.08

	Batir.bloc({
		nom = "Caisson",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(1.05, 0.34, 0.1),
		positionM = Vector3.new(C.porteRegie.centreX, C.porteRegie.hauteur + 0.35, z),
		collision = false,
	})

	local voyant = Batir.bloc({
		nom = "Voyant",
		parent = dossier,
		materiau = "led_ecran",
		tailleM = Vector3.new(0.92, 0.22, 0.03),
		positionM = Vector3.new(C.porteRegie.centreX, C.porteRegie.hauteur + 0.35, z - 0.06),
		collision = false,
	})
	voyant.Color = Palette.AccentProvisoire
end

function Materiel.construire(parent: Instance): number
	local dossier = Batir.dossier("Materiel", parent)

	for _, def in E.cameras do
		camera(dossier, def)
	end

	retour(dossier, "Gauche", -5.8, -1.2)
	retour(dossier, "Droit", 5.8, -1.2)

	flightCases(dossier)
	cables(dossier)
	onAir(dossier)

	return #E.cameras
end

return Materiel
