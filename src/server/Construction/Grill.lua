--!strict
--[[
	Grill — la grille technique qui porte les projecteurs.

	C'est l'élément qui distingue un plateau d'une salle repeinte en noir, et
	la raison pour laquelle la hauteur sous plafond de 6 m est non négociable
	(CDC §5.2) : il faut de la place au-dessus du grill pour que les
	projecteurs respirent, et sous le grill pour qu'ils éclairent.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local C = require(Partage.Config.Plateau)

local Batir = require(script.Parent.Batir)

local Grill = {}

--- Construit la grille et renvoie le nombre de poutres posées.
function Grill.construire(parent: Instance): number
	local dossier = Batir.dossier("Grill", parent)

	local demiLargeur = C.plateau.largeur / 2
	local demiProfondeur = C.plateau.profondeur / 2
	local hauteur = C.grill.hauteur
	local section = C.grill.section
	local pas = C.grill.pas

	local poutres = 0

	-- Poutres transversales : elles courent selon X, réparties selon Z.
	-- Départ à une demi-maille du mur : la grille est ainsi centrée sur le
	-- plateau, avec des retombées égales de chaque côté.
	local z = -demiProfondeur + pas / 2
	while z <= demiProfondeur - pas / 2 + 1e-6 do
		poutres += 1
		Batir.bloc({
			nom = `PoutreX_{poutres}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(C.plateau.largeur, section, section),
			positionM = Vector3.new(0, hauteur, z),
			collision = false,
		})
		z += pas
	end

	-- Poutres longitudinales : elles portent les transversales et rigidifient
	-- la grille. Trois suffisent sur une portée de 12 m.
	for _, x in { -demiLargeur / 1.5, 0, demiLargeur / 1.5 } do
		poutres += 1
		Batir.bloc({
			nom = `PoutreZ_{poutres}`,
			parent = dossier,
			materiau = "alu_noir_mat",
			tailleM = Vector3.new(section, section, C.plateau.profondeur),
			positionM = Vector3.new(x, hauteur + section, 0),
			collision = false,
		})
	end

	return poutres
end

return Grill
