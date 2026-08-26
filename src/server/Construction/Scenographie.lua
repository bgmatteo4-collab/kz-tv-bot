--!strict
--[[
	Scenographie — ce qui fait qu'une boîte noire devient un plateau.

	Trois éléments, et aucun n'est décoratif :

	· le **mur LED**, bâti dalle par dalle avec ses joints visibles. Une seule
	  grande surface bleue ne ressemble à rien ; ce sont les interstices entre
	  modules qui font lire l'objet comme un vrai mur d'images ;
	· le **praticable**, qui donne au décor son assise. Sans lui, tout est posé
	  à même le sol et la pièce reste un gymnase ;
	· le **traitement acoustique**, en panneaux espacés plutôt qu'en aplat.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)
local E = require(Partage.Config.Equipement)

local Batir = require(script.Parent.Batir)

local Scenographie = {}

local function murLed(parent: Instance): number
	local dossier = Batir.dossier("MurLed", parent)
	local f = C.fond
	local zMur = -C.plateau.profondeur / 2 + f.retrait

	-- L'ossature derrière les dalles : on la devine sur les bords.
	Batir.bloc({
		nom = "OssatureLed",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(f.largeur + 0.14, f.hauteur + 0.14, 0.12),
		positionM = Vector3.new(0, f.allege + f.hauteur / 2, zMur - 0.06),
	})

	-- Le socle bas sur lequel le mur repose. Un mur LED ne descend jamais
	-- jusqu'au sol : on y accroche les pieds et on passe les câbles dessous.
	Batir.bloc({
		nom = "SocleLed",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(f.largeur + 0.14, f.allege, 0.35),
		positionM = Vector3.new(0, f.allege / 2, zMur),
	})

	local colonnes = math.floor(f.largeur / f.panneau + 0.5)
	local rangs = math.floor(f.hauteur / f.panneau + 0.5)
	local cote = f.panneau - f.joint
	local dalles = 0

	for colonne = 1, colonnes do
		for rang = 1, rangs do
			dalles += 1
			Batir.bloc({
				nom = `Dalle_{colonne}_{rang}`,
				parent = dossier,
				materiau = "led_ecran",
				tailleM = Vector3.new(cote, cote, 0.05),
				positionM = Vector3.new(
					-f.largeur / 2 + (colonne - 0.5) * f.panneau,
					f.allege + (rang - 0.5) * f.panneau,
					zMur + 0.03
				),
				collision = false,
			})
		end
	end

	return dalles
end

local function praticable(parent: Instance)
	local dossier = Batir.dossier("Praticable", parent)
	local p = E.praticable

	Batir.bloc({
		nom = "Plateau",
		parent = dossier,
		materiau = "moquette_technique",
		tailleM = Vector3.new(p.largeur, p.hauteur, p.profondeur),
		positionM = Vector3.new(0, p.hauteur / 2, p.centreZ),
	})

	-- Le nez de scène : la ligne claire qui souligne le bord d'un praticable,
	-- et qui existe pour qu'on ne se prenne pas les pieds dedans.
	Batir.bloc({
		nom = "NezDeScene",
		parent = dossier,
		materiau = "alu_brosse",
		tailleM = Vector3.new(p.largeur, 0.04, 0.06),
		positionM = Vector3.new(0, p.hauteur - 0.02, p.centreZ + p.profondeur / 2 + 0.03),
	})

	-- Deux marches pour y monter, décalées sur le côté comme au théâtre.
	for index = 1, 2 do
		local hauteur = p.marche * index
		Batir.bloc({
			nom = `Marche_{index}`,
			parent = dossier,
			materiau = "moquette_technique",
			tailleM = Vector3.new(1.6, hauteur, 0.32),
			positionM = Vector3.new(
				-p.largeur / 2 + 1.2,
				hauteur / 2,
				p.centreZ + p.profondeur / 2 + 0.16 + (2 - index) * 0.32
			),
		})
	end
end

local function acoustique(parent: Instance): number
	local dossier = Batir.dossier("Acoustique", parent)
	local a = E.acoustique
	local demiLargeur = C.plateau.largeur / 2
	local profondeur = C.plateau.profondeur

	local pas = a.largeur + a.jeu
	local nombre = math.floor((profondeur - a.jeu) / pas)
	local depart = -(nombre * pas - a.jeu) / 2 + a.largeur / 2
	local poses = 0

	for _, signe in { -1, 1 } do
		for index = 0, nombre - 1 do
			poses += 1
			Batir.bloc({
				nom = `Panneau_{if signe < 0 then "Ouest" else "Est"}_{index + 1}`,
				parent = dossier,
				materiau = "acoustique_anthracite",
				tailleM = Vector3.new(a.epaisseur, a.hauteur, a.largeur),
				positionM = Vector3.new(
					signe * (demiLargeur - a.epaisseur / 2),
					a.allege + a.hauteur / 2,
					depart + index * pas
				),
				collision = false,
			})
		end
	end

	return poses
end

--- Bâtit la scénographie et renvoie le nombre de dalles LED posées.
function Scenographie.construire(parent: Instance): number
	local dalles = murLed(parent)
	praticable(parent)
	acoustique(parent)
	return dalles
end

return Scenographie
