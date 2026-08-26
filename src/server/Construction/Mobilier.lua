--!strict
--[[
	Mobilier — gradins, pupitre de plateau et régie équipée.

	Ce qui reste hors de portée : les assises rembourrées. Un canapé ou un
	fauteuil de plateau demande de vrais modèles (backlog T3) et n'est pas
	approximé ici. Tout le reste — plateaux, piètements, pupitres, moniteurs —
	est anguleux, donc bâti pour de bon.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)
local E = require(Partage.Config.Equipement)
local Palette = require(Partage.Charte.Palette)

local Batir = require(script.Parent.Batir)

local Mobilier = {}

--- Les gradins du public. Chaque rang est une marche : c'est la géométrie qui
--- fait qu'un spectateur du fond voit par-dessus celui de devant.
local function gradins(parent: Instance): number
	local dossier = Batir.dossier("Gradins", parent)
	local g = E.gradins
	local places = 0

	for rang = 1, g.rangs do
		local hauteur = g.hauteurRang * rang
		local z = g.premierZ + (rang - 0.5) * g.profondeurRang

		Batir.bloc({
			nom = `Rang_{rang}`,
			parent = dossier,
			materiau = "moquette_technique",
			tailleM = Vector3.new(g.largeur, hauteur, g.profondeurRang),
			positionM = Vector3.new(g.centreX, hauteur / 2, z),
		})

		local pas = g.largeur / g.placesParRang
		for place = 1, g.placesParRang do
			places += 1
			local x = g.centreX - g.largeur / 2 + (place - 0.5) * pas

			Batir.bloc({
				nom = `Assise_{rang}_{place}`,
				parent = dossier,
				materiau = "acoustique_anthracite",
				tailleM = Vector3.new(pas - 0.12, 0.07, 0.42),
				positionM = Vector3.new(x, hauteur + 0.4, z - 0.1),
			})
			Batir.bloc({
				nom = `Pietement_{rang}_{place}`,
				parent = dossier,
				materiau = "alu_noir_mat",
				tailleM = Vector3.new(0.06, 0.4, 0.06),
				positionM = Vector3.new(x, hauteur + 0.2, z - 0.1),
			})
			Batir.bloc({
				nom = `Dossier_{rang}_{place}`,
				parent = dossier,
				materiau = "acoustique_anthracite",
				tailleM = Vector3.new(pas - 0.12, 0.44, 0.06),
				positionM = Vector3.new(x, hauteur + 0.65, z + 0.14),
			})
		end
	end

	return places
end

--- Le pupitre de présentation et les tabourets, posés sur le praticable.
local function plateau(parent: Instance)
	local dossier = Batir.dossier("MobilierPlateau", parent)
	local m = E.mobilier
	local sol = E.praticable.hauteur
	local zPupitre = E.praticable.centreZ + 1.1

	Batir.bloc({
		nom = "PupitreCorps",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(m.pupitreLargeur, m.pupitreHauteur, m.pupitreProfondeur),
		positionM = Vector3.new(0, sol + m.pupitreHauteur / 2, zPupitre),
	})

	Batir.bloc({
		nom = "PupitrePlateau",
		parent = dossier,
		materiau = "chene_clair",
		tailleM = Vector3.new(m.pupitreLargeur + 0.08, 0.05, m.pupitreProfondeur + 0.08),
		positionM = Vector3.new(0, sol + m.pupitreHauteur + 0.025, zPupitre),
	})

	-- Le bandeau lumineux en façade : l'endroit où vivra le logo Kay Prod.
	local bandeau = Batir.bloc({
		nom = "PupitreBandeau",
		parent = dossier,
		materiau = "led_ecran",
		tailleM = Vector3.new(m.pupitreLargeur - 0.3, 0.16, 0.02),
		positionM = Vector3.new(0, sol + 0.62, zPupitre - m.pupitreProfondeur / 2 - 0.01),
		collision = false,
	})
	bandeau.Color = Palette.AccentProvisoire

	for index, x in { -2.2, 2.2 } do
		Batir.bloc({
			nom = `TabouretAssise_{index}`,
			parent = dossier,
			materiau = "acoustique_anthracite",
			tailleM = Vector3.new(m.tabouretCote, 0.09, m.tabouretCote),
			positionM = Vector3.new(x, sol + m.tabouretHauteur, zPupitre - 0.2),
		})
		Batir.bloc({
			nom = `TabouretFut_{index}`,
			parent = dossier,
			materiau = "alu_brosse",
			tailleM = Vector3.new(0.08, m.tabouretHauteur - 0.045, 0.08),
			positionM = Vector3.new(x, sol + (m.tabouretHauteur - 0.045) / 2, zPupitre - 0.2),
		})
		Batir.bloc({
			nom = `TabouretEmbase_{index}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(0.4, 0.04, 0.4),
			positionM = Vector3.new(x, sol + 0.02, zPupitre - 0.2),
		})
	end
end

--- La régie : pupitre en L, mur de moniteurs, sièges d'opérateur.
local function regie(parent: Instance): number
	local dossier = Batir.dossier("MobilierRegie", parent)
	local r = E.regie
	local zMurNord = C.plateau.profondeur / 2 + C.epaisseurMur + C.regie.profondeur
	local zPupitre = zMurNord - 1.5

	Batir.bloc({
		nom = "PupitrePlateau",
		parent = dossier,
		materiau = "alu_brosse",
		tailleM = Vector3.new(3.4, 0.05, r.pupitreProfondeur),
		positionM = Vector3.new(0, r.pupitreHauteur, zPupitre),
	})
	Batir.bloc({
		nom = "PupitreCaisson",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(3.3, r.pupitreHauteur - 0.05, r.pupitreProfondeur - 0.12),
		positionM = Vector3.new(0, (r.pupitreHauteur - 0.05) / 2, zPupitre),
	})

	-- Le mur de moniteurs, moniteur par moniteur. Une seule grande dalle ne
	-- ressemble à rien : c'est la trame qui fait la régie.
	local largeurMur = r.moniteursColonnes * (r.moniteurLargeur + r.moniteurJeu) - r.moniteurJeu
	local hauteurMur = r.moniteursRangs * (r.moniteurHauteur + r.moniteurJeu) - r.moniteurJeu
	local moniteurs = 0

	Batir.bloc({
		nom = "SupportMoniteurs",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(largeurMur + 0.12, hauteurMur + 0.12, 0.06),
		positionM = Vector3.new(0, 1.78, zMurNord - 0.06),
		collision = false,
	})

	for colonne = 1, r.moniteursColonnes do
		for rang = 1, r.moniteursRangs do
			moniteurs += 1
			Batir.bloc({
				nom = `Moniteur_{colonne}_{rang}`,
				parent = dossier,
				materiau = "ecran_eteint",
				tailleM = Vector3.new(r.moniteurLargeur, r.moniteurHauteur, 0.02),
				positionM = Vector3.new(
					-largeurMur / 2 + (colonne - 0.5) * (r.moniteurLargeur + r.moniteurJeu),
					1.78 - hauteurMur / 2 + (rang - 0.5) * (r.moniteurHauteur + r.moniteurJeu),
					zMurNord - 0.1
				),
				collision = false,
			})
		end
	end

	for index, x in { -1.1, 1.1 } do
		Batir.bloc({
			nom = `SiegeAssise_{index}`,
			parent = dossier,
			materiau = "acoustique_anthracite",
			tailleM = Vector3.new(0.48, 0.1, 0.46),
			positionM = Vector3.new(x, 0.46, zPupitre - 0.9),
		})
		Batir.bloc({
			nom = `SiegeDossier_{index}`,
			parent = dossier,
			materiau = "acoustique_anthracite",
			tailleM = Vector3.new(0.46, 0.5, 0.07),
			positionM = Vector3.new(x, 0.76, zPupitre - 1.1),
		})
		Batir.bloc({
			nom = `SiegeFut_{index}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(0.08, 0.41, 0.08),
			positionM = Vector3.new(x, 0.205, zPupitre - 0.9),
		})
		Batir.bloc({
			nom = `SiegeEmbase_{index}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(0.62, 0.05, 0.62),
			positionM = Vector3.new(x, 0.025, zPupitre - 0.9),
		})
	end

	return moniteurs
end

--- Bâtit tout le mobilier. Renvoie les places de public et les moniteurs.
function Mobilier.construire(parent: Instance): (number, number)
	local places = gradins(parent)
	plateau(parent)
	local moniteurs = regie(parent)
	return places, moniteurs
end

return Mobilier
