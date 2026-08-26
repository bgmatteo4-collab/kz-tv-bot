--!strict
--[[
	Materiaux — la bibliothèque unique du projet.

	Cahier des charges §14 : **douze matériaux au maximum sur tout le projet**,
	les deux palettes comprises. Ce plafond est une limite de conception, pas un
	objectif : dépasser douze, c'est perdre la cohérence que le réalisme exige.

	Chaque matériau existe en une seule version, utilisée partout. Le champ
	`variante` est réservé au `MaterialVariant` qui remplacera le matériau natif
	quand les textures PBR seront produites — la substitution ne demandera
	aucune modification du code qui appelle.
]]

local Palette = require(script.Parent.Palette)

export type Materiau = {
	nom: string,
	materiau: Enum.Material,
	couleur: Color3,
	reflectance: number,
	transparence: number,
	variante: string?,
}

local function definir(
	nom: string,
	materiau: Enum.Material,
	couleur: Color3,
	reflectance: number?,
	transparence: number?
): Materiau
	return {
		nom = nom,
		materiau = materiau,
		couleur = couleur,
		reflectance = reflectance or 0,
		transparence = transparence or 0,
		variante = nil,
	}
end

local Materiaux = {}

Materiaux.parNom = {
	-- Le local.
	platre_blanc = definir("platre_blanc", Enum.Material.Plaster, Palette.BlancPlatre),
	chene_clair = definir("chene_clair", Enum.Material.WoodPlanks, Palette.CheneClair),
	alu_brosse = definir("alu_brosse", Enum.Material.Metal, Palette.AluBrosse, 0.15),
	verre_clair = definir("verre_clair", Enum.Material.Glass, Palette.VerreClair, 0.25, 0.85),
	moquette_perle = definir("moquette_perle", Enum.Material.Carpet, Palette.GrisPerle),
	tissu_ecru = definir("tissu_ecru", Enum.Material.Fabric, Palette.TissuEcru),

	-- Le plateau.
	moquette_technique = definir("moquette_technique", Enum.Material.Carpet, Palette.NoirTechnique),
	acoustique_anthracite = definir(
		"acoustique_anthracite",
		Enum.Material.Fabric,
		Palette.Anthracite
	),
	alu_noir_mat = definir("alu_noir_mat", Enum.Material.Metal, Palette.AluNoirMat, 0.05),
	plexiglas = definir("plexiglas", Enum.Material.SmoothPlastic, Palette.Plexiglas, 0.2, 0.6),

	-- Commun.
	beton_lisse = definir("beton_lisse", Enum.Material.Concrete, Palette.BetonLisse),
	caoutchouc_noir = definir("caoutchouc_noir", Enum.Material.Rubber, Palette.CaoutchoucNoir),
}

--- Applique un matériau de la bibliothèque à une part.
--- Échoue bruyamment sur un nom inconnu : une faute de frappe ne doit jamais
--- produire un objet gris par défaut au milieu d'une pièce finie.
function Materiaux.appliquer(part: BasePart, nom: string)
	local m = Materiaux.parNom[nom]
	if not m then
		error(`Materiaux : "{nom}" n'existe pas dans la bibliothèque`, 2)
	end

	part.Material = m.materiau
	part.Color = m.couleur
	part.Reflectance = m.reflectance
	part.Transparency = m.transparence
end

--- Nombre de matériaux définis. Vérifié au démarrage contre le plafond de 12.
function Materiaux.compter(): number
	local n = 0
	for _ in Materiaux.parNom do
		n += 1
	end
	return n
end

return Materiaux
