--!strict
--[[
	Coque — le gros œuvre : dalles, murs, plafonds, ouvertures.

	Repère et conventions (CDC §5.2) :
	  · le plateau est centré sur l'origine, sol fini à Y = 0 ;
	  · les cotes déclarées sont des dimensions INTÉRIEURES, comme en
	    architecture : le plateau fait bien 12 × 10 m dans œuvre ;
	  · les murs sont donc centrés une demi-épaisseur au-delà de la limite,
	    de sorte que leur face intérieure tombe exactement sur la cote.

	Un sas d'entrée en palette claire est bâti à l'ouest. Il n'est pas
	décoratif : le contraste entre un couloir clair et la boîte noire est la
	décision artistique centrale du projet (CDC §9.4), et une version qui ne
	montrerait que le plateau ne permettrait pas de la valider.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)
local Echelle = require(Partage.Charte.Echelle)

local Batir = require(script.Parent.Batir)
local Mur = require(script.Parent.Mur)

local Coque = {}

-- Raccourcis de cotes, tous en mètres.
local demiLargeur = C.plateau.largeur / 2 -- 6
local demiProfondeur = C.plateau.profondeur / 2 -- 5
local ep = C.epaisseurMur
local demiEp = ep / 2

-- Emprise hors tout du plateau : la limite intérieure plus l'épaisseur du mur.
local extX = demiLargeur + ep -- 6,2
local extZ = demiProfondeur + ep -- 5,2

-- La régie, accolée au nord.
local regieDemiLargeur = C.regie.largeur / 2 -- 3
local regieZDebut = demiProfondeur + ep -- 5,2 : face intérieure du mur mitoyen
local regieZFin = regieZDebut + C.regie.profondeur -- 10,2
local regieExtZ = regieZFin + ep -- 10,4

-- Le sas d'entrée, à l'ouest de la porte de service.
local SAS_PROFONDEUR = 3.8
local SAS_DEMI_LARGEUR = 2
local sasXFin = -extX -- 6,2 : la face extérieure du mur ouest du plateau
local sasXDebut = sasXFin - SAS_PROFONDEUR -- -10

local function dalleEtPlafond(
	parent: Instance,
	nom: string,
	largeur: number,
	profondeur: number,
	centreX: number,
	centreZ: number,
	hauteurSousPlafond: number,
	materiauSol: string,
	materiauPlafond: string
)
	Batir.bloc({
		nom = `Sol_{nom}`,
		parent = parent,
		materiau = materiauSol,
		tailleM = Vector3.new(largeur, C.epaisseurDalle, profondeur),
		positionM = Vector3.new(centreX, -C.epaisseurDalle / 2, centreZ),
	})

	Batir.bloc({
		nom = `Plafond_{nom}`,
		parent = parent,
		materiau = materiauPlafond,
		tailleM = Vector3.new(largeur, C.epaisseurDalle, profondeur),
		positionM = Vector3.new(centreX, hauteurSousPlafond + C.epaisseurDalle / 2, centreZ),
	})
end

local function construirePlateau(parent: Instance)
	local dossier = Batir.dossier("Plateau", parent)
	local hauteur = C.plateau.hauteur

	dalleEtPlafond(
		dossier,
		"Plateau",
		extX * 2,
		extZ * 2,
		0,
		0,
		hauteur,
		"moquette_technique",
		"alu_noir_mat"
	)

	-- Mur sud : le fond de scène s'appuie dessus, aucune ouverture.
	Mur.construire({
		nom = "MurSud",
		parent = dossier,
		materiau = "acoustique_anthracite",
		axe = "X",
		fixe = -(demiProfondeur + demiEp),
		de = -extX,
		a = extX,
		hauteur = hauteur,
		epaisseur = ep,
	})

	-- Mur nord : mitoyen avec la régie. Il porte la vitre et la porte.
	Mur.construire({
		nom = "MurNord",
		parent = dossier,
		materiau = "acoustique_anthracite",
		axe = "X",
		fixe = demiProfondeur + demiEp,
		de = -extX,
		a = extX,
		hauteur = hauteur,
		epaisseur = ep,
		ouvertures = {
			{
				nom = "Vitre",
				de = C.vitre.centreX - C.vitre.largeur / 2,
				a = C.vitre.centreX + C.vitre.largeur / 2,
				bas = C.vitre.allege,
				haut = C.vitre.allege + C.vitre.hauteur,
			},
			{
				nom = "PorteRegie",
				de = C.porteRegie.centreX - C.porteRegie.largeur / 2,
				a = C.porteRegie.centreX + C.porteRegie.largeur / 2,
				bas = 0,
				haut = C.porteRegie.hauteur,
			},
		},
	})

	-- Mur ouest : la porte de service, par où passe le matériel.
	Mur.construire({
		nom = "MurOuest",
		parent = dossier,
		materiau = "acoustique_anthracite",
		axe = "Z",
		fixe = -(demiLargeur + demiEp),
		de = -extZ,
		a = extZ,
		hauteur = hauteur,
		epaisseur = ep,
		ouvertures = {
			{
				nom = "PorteService",
				de = C.porteService.centreZ - C.porteService.largeur / 2,
				a = C.porteService.centreZ + C.porteService.largeur / 2,
				bas = 0,
				haut = C.porteService.hauteur,
			},
		},
	})

	Mur.construire({
		nom = "MurEst",
		parent = dossier,
		materiau = "acoustique_anthracite",
		axe = "Z",
		fixe = demiLargeur + demiEp,
		de = -extZ,
		a = extZ,
		hauteur = hauteur,
		epaisseur = ep,
	})

	-- Le fond habillé de la configuration talk-show, décollé du mur comme un
	-- vrai panneau monté sur ossature.
	Batir.bloc({
		nom = "FondDeScene",
		parent = dossier,
		materiau = "acoustique_anthracite",
		tailleM = Vector3.new(C.fond.largeur, C.fond.hauteur, 0.1),
		positionM = Vector3.new(0, C.fond.hauteur / 2, -demiProfondeur + C.fond.retrait),
	})

	return dossier
end

local function construireRegie(parent: Instance)
	local dossier = Batir.dossier("Regie", parent)
	local hauteur = C.regie.hauteur
	local centreZ = (demiProfondeur + regieExtZ) / 2

	dalleEtPlafond(
		dossier,
		"Regie",
		(regieDemiLargeur + ep) * 2,
		regieExtZ - demiProfondeur,
		0,
		centreZ,
		hauteur,
		"moquette_technique",
		"platre_blanc"
	)

	for _, cote in { { nom = "Ouest", signe = -1 }, { nom = "Est", signe = 1 } } do
		Mur.construire({
			nom = `MurRegie{cote.nom}`,
			parent = dossier,
			materiau = "acoustique_anthracite",
			axe = "Z",
			fixe = cote.signe * (regieDemiLargeur + demiEp),
			de = demiProfondeur,
			a = regieExtZ,
			hauteur = hauteur,
			epaisseur = ep,
		})
	end

	Mur.construire({
		nom = "MurRegieNord",
		parent = dossier,
		materiau = "acoustique_anthracite",
		axe = "X",
		fixe = regieZFin + demiEp,
		de = -(regieDemiLargeur + ep),
		a = regieDemiLargeur + ep,
		hauteur = hauteur,
		epaisseur = ep,
	})

	-- La vitre elle-même, dans l'ouverture du mur mitoyen.
	Batir.bloc({
		nom = "VitreRegie",
		parent = dossier,
		materiau = "verre_clair",
		tailleM = Vector3.new(C.vitre.largeur, C.vitre.hauteur, 0.02),
		positionM = Vector3.new(
			C.vitre.centreX,
			C.vitre.allege + C.vitre.hauteur / 2,
			demiProfondeur + demiEp
		),
	})

	return dossier
end

--- Les portes sont ouvertes, plaquées contre le mur : c'est leur position
--- normale dans un studio en activité, et ça évite un système d'ouverture dont
--- la v0.1 n'a pas besoin.
local function construirePortes(parent: Instance)
	local dossier = Batir.dossier("Portes", parent)
	local EPAISSEUR_VANTAIL = 0.05

	-- Porte de la régie, ouverte côté plateau.
	local bordPorte = C.porteRegie.centreX + C.porteRegie.largeur / 2
	Batir.bloc({
		nom = "VantailRegie",
		parent = dossier,
		materiau = "alu_noir_mat",
		tailleM = Vector3.new(C.porteRegie.largeur, C.porteRegie.hauteur, EPAISSEUR_VANTAIL),
		positionM = Vector3.new(
			bordPorte + C.porteRegie.largeur / 2,
			C.porteRegie.hauteur / 2,
			demiProfondeur - EPAISSEUR_VANTAIL
		),
	})

	-- Porte de service : deux vantaux, ouverts vers l'intérieur du plateau.
	for _, signe in { -1, 1 } do
		local bord = signe * (C.porteService.largeur / 2)
		Batir.bloc({
			nom = `VantailService{if signe < 0 then "Sud" else "Nord"}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(
				EPAISSEUR_VANTAIL,
				C.porteService.hauteur,
				C.porteService.largeur / 2
			),
			positionM = Vector3.new(
				-demiLargeur + EPAISSEUR_VANTAIL,
				C.porteService.hauteur / 2,
				bord + signe * (C.porteService.largeur / 4)
			),
		})
	end

	return dossier
end

--- Le sas d'entrée, en palette claire. Il existe pour rendre visible le
--- contraste avec la boîte noire (CDC §9.4).
local function construireSas(parent: Instance)
	local dossier = Batir.dossier("Sas", parent)
	local HAUTEUR = 3
	local centreX = (sasXDebut - ep + sasXFin) / 2
	local largeur = sasXFin - (sasXDebut - ep)
	local profondeur = (SAS_DEMI_LARGEUR + ep) * 2

	dalleEtPlafond(
		dossier,
		"Sas",
		largeur,
		profondeur,
		centreX,
		0,
		HAUTEUR,
		"moquette_perle",
		"platre_blanc"
	)

	Mur.construire({
		nom = "MurSasOuest",
		parent = dossier,
		materiau = "platre_blanc",
		axe = "Z",
		fixe = sasXDebut - demiEp,
		de = -(SAS_DEMI_LARGEUR + ep),
		a = SAS_DEMI_LARGEUR + ep,
		hauteur = HAUTEUR,
		epaisseur = ep,
	})

	for _, signe in { -1, 1 } do
		Mur.construire({
			nom = `MurSas{if signe < 0 then "Sud" else "Nord"}`,
			parent = dossier,
			materiau = "platre_blanc",
			axe = "X",
			fixe = signe * (SAS_DEMI_LARGEUR + demiEp),
			de = sasXDebut - ep,
			a = sasXFin,
			hauteur = HAUTEUR,
			epaisseur = ep,
		})
	end

	-- Une banquette en chêne clair : le seul objet du sas, et le seul endroit
	-- où la palette naturelle se lit vraiment.
	Batir.bloc({
		nom = "Banquette",
		parent = dossier,
		materiau = "chene_clair",
		tailleM = Vector3.new(1.6, 0.45, 0.45),
		positionM = Vector3.new(sasXDebut + 1.2, 0.225, -SAS_DEMI_LARGEUR + 0.25),
	})

	return dossier
end

--- Le joueur apparaît dans le sas : il entre donc dans le studio par la porte
--- de service, et découvre la boîte noire depuis la lumière. C'est la première
--- impression que la direction artistique doit réussir.
local function poserApparition(parent: Instance)
	local apparition = Instance.new("SpawnLocation")
	apparition.Name = "Apparition"
	apparition.Anchored = true
	apparition.CanCollide = false
	apparition.Transparency = 1
	apparition.Size = Echelle.v(Vector3.new(2, 0.2, 2))
	-- Tourné vers l'est : le joueur fait face à la porte de service, donc au
	-- plateau, dès la première image.
	apparition.CFrame = CFrame.new(Echelle.v(Vector3.new(sasXDebut + 1.5, 0.4, 0)))
		* CFrame.Angles(0, math.rad(-90), 0)
	apparition.Parent = parent
	return apparition
end

--- Bâtit tout le gros œuvre et renvoie le dossier racine.
function Coque.construire(parent: Instance): Folder
	local racine = Batir.dossier("LeLocal", parent)

	construirePlateau(racine)
	construireRegie(racine)
	construirePortes(racine)
	construireSas(racine)
	poserApparition(racine)

	return racine
end

return Coque
