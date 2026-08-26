--!nocheck
--[[
	Mesurer — exécute la construction hors de Roblox et en donne les cotes.

	Usage : python3 tests/lancer.py

	Ce test répond à des questions qu'aucune capture d'écran ne tranche : le
	plateau fait-il vraiment 12 × 10 m ? le plafond est-il à 6 m ? les pièces
	communiquent-elles ? combien de parts, et de quel volume ?
]]

local monde = Simulateur.environnement()
local Echelle = monde.charger("src/shared/Charte/Echelle.lua")
local Coque = monde.charger("src/server/Construction/Coque.lua", monde.construction.Coque)
local Grill = monde.charger("src/server/Construction/Grill.lua", monde.construction.Grill)
local Eclairage =
	monde.charger("src/server/Construction/Eclairage.lua", monde.construction.Eclairage)
local Scenographie =
	monde.charger("src/server/Construction/Scenographie.lua", monde.construction.Scenographie)
local Materiel = monde.charger("src/server/Construction/Materiel.lua", monde.construction.Materiel)
local Mobilier = monde.charger("src/server/Construction/Mobilier.lua", monde.construction.Mobilier)

local racine = Coque.construire(monde.Workspace)
local poutres = Grill.construire(racine)
local dalles = Scenographie.construire(racine)
local cameras = Materiel.construire(racine)
local places, moniteurs = Mobilier.construire(racine)
local ombres = Eclairage.construire(racine)

local M = Echelle.STUDS_PAR_METRE

--- Boîte englobante d'un dossier, exprimée en mètres.
local function encombrement(dossier)
	local minX, minY, minZ = math.huge, math.huge, math.huge
	local maxX, maxY, maxZ = -math.huge, -math.huge, -math.huge
	local parts = 0

	for _, objet in dossier:GetDescendants() do
		if not objet:IsA("BasePart") or not objet.Size then
			continue
		end
		parts += 1
		local p = objet.Position or (objet.CFrame and objet.CFrame.Position)
		if not p then
			continue
		end
		local d = objet.Size * 0.5
		minX, maxX = math.min(minX, p.X - d.X), math.max(maxX, p.X + d.X)
		minY, maxY = math.min(minY, p.Y - d.Y), math.max(maxY, p.Y + d.Y)
		minZ, maxZ = math.min(minZ, p.Z - d.Z), math.max(maxZ, p.Z + d.Z)
	end

	return {
		parts = parts,
		largeur = (maxX - minX) / M,
		hauteur = (maxY - minY) / M,
		profondeur = (maxZ - minZ) / M,
		x = { minX / M, maxX / M },
		y = { minY / M, maxY / M },
		z = { minZ / M, maxZ / M },
	}
end

print("")
print("=====================================================================")
print(string.format("  LE LOCAL — mesures hors moteur     échelle : 1 m = %.2f studs", M))
print("=====================================================================")
print("")

local total = 0
for _, dossier in racine._ordre do
	if #dossier._ordre == 0 then
		continue
	end
	local e = encombrement(dossier)
	total += e.parts
	print(
		string.format(
			"%-12s %3d parts   %5.1f x %5.1f m   hauteur %4.1f m",
			dossier.Name,
			e.parts,
			e.largeur,
			e.profondeur,
			e.hauteur
		)
	)
	print(
		string.format(
			"             X %6.1f -> %5.1f    Z %6.1f -> %5.1f",
			e.x[1],
			e.x[2],
			e.z[1],
			e.z[2]
		)
	)
end

print("")
print(
	string.format("TOTAL        %3d parts, %d poutres, %d sources à ombre", total, poutres, ombres)
)
print(
	string.format(
		"             %d dalles LED, %d caméras, %d places de public, %d moniteurs",
		dalles,
		cameras,
		places,
		moniteurs
	)
)
print("")

-- Contrôles ---------------------------------------------------------------
local echecs = 0
local function verifier(intitule, obtenu, attendu, tolerance)
	local ok = math.abs(obtenu - attendu) <= (tolerance or 0.05)
	if not ok then
		echecs += 1
	end
	print(
		string.format(
			"%s %-46s %7.2f (attendu %.2f)",
			ok and " OK " or "ECHEC",
			intitule,
			obtenu,
			attendu
		)
	)
end

local plateau = encombrement(racine.Plateau)
local regie = encombrement(racine.Regie)
local sas = encombrement(racine.Sas)

verifier("plateau : largeur hors tout (m)", plateau.largeur, 16.4)
verifier("plateau : profondeur hors tout (m)", plateau.profondeur, 12.4)
verifier("plateau : hauteur hors tout, dalle et plafond compris", plateau.hauteur, 7.4)
verifier("régie : hauteur hors tout, dalle et plafond compris", regie.hauteur, 3.4)
verifier("sas : hauteur hors tout, dalle et plafond compris", sas.hauteur, 3.4)
verifier("avatar attendu (studs)", Echelle.AVATAR_ATTENDU_STUDS, 6.12)
verifier("avatar attendu (m)", Echelle.enMetres(Echelle.AVATAR_ATTENDU_STUDS), 1.749, 0.01)

-- Le sas doit toucher le plateau, sinon les pièces ne communiquent pas.
verifier("sas et plateau se rejoignent en X (m)", sas.x[2], plateau.x[1], 0.01)
-- La régie doit toucher le plateau au nord.
verifier("régie et plateau se rejoignent en Z (m)", regie.z[1], plateau.z[2] - 0.2, 0.01)

-- Collisions : ce que l'œil ne voit pas sur une capture mais qui se paie en jeu.
local led = encombrement(racine.MurLed)
local prat = encombrement(racine.Praticable)
local grad = encombrement(racine.Gradins)
local Config = monde.charger("src/shared/Config/Plateau.lua", monde.construction.Parent.Config)

print("")
local function separer(intitule, aFin, bDebut)
	local jeu = bDebut - aFin
	local ok = jeu >= -0.001
	if not ok then
		echecs += 1
	end
	print(string.format("%s %-46s jeu %6.2f m", ok and " OK " or "ECHEC", intitule, jeu))
end

separer("praticable devant le mur LED", led.z[2], prat.z[1])
separer("gradins dégagent la porte de régie", grad.x[2], 2.0)
separer("gradins ne touchent pas le mur nord", grad.z[2], 6.0)

print("")
if echecs == 0 then
	print("Tous les contrôles passent.")
else
	print(string.format("%d CONTRÔLE(S) EN ÉCHEC.", echecs))
end
print("")
