--!strict
--[[
	Styles — les cinq directions de décor, et comment l'audience y réagit.

	Chaque objet du catalogue appartient à un style et un seul. C'est le
	socle du score de cohérence : on ne gagne pas en achetant tout, mais en
	choisissant une direction et en s'y tenant.

	La distance entre deux styles décide de la pénalité quand on les
	mélange. Deux styles voisins cohabitent sans problème ; quatre styles
	dans la même pièce font chuter l'identité visuelle.
]]

export type StyleId = "sobre" | "gamer" | "retro" | "cosy" | "pro"

export type Style = {
	id: StyleId,
	name: string,
	description: string,
	palette: { Color3 },
	-- Affinité par segment d'audience, de -1 (rejet) à 1 (adhésion).
	affinity: { [string]: number },
}

local Styles: { [string]: Style } = {
	sobre = {
		id = "sobre",
		name = "Sobre",
		description = "Bois clair, blanc cassé, plantes. Rassurant, adulte, intemporel.",
		palette = {
			Color3.fromRGB(224, 216, 202),
			Color3.fromRGB(176, 148, 114),
			Color3.fromRGB(108, 122, 100),
		},
		affinity = { casual = 0.3, hardcore = 0, jeune = -0.2, donateur = 0.4, presse = 0.5 },
	},

	gamer = {
		id = "gamer",
		name = "Gamer",
		description = "Noir, RGB, néons, figurines. Énergique, immédiatement lisible, très daté si mal dosé.",
		palette = {
			Color3.fromRGB(24, 24, 32),
			Color3.fromRGB(120, 60, 220),
			Color3.fromRGB(40, 200, 220),
		},
		affinity = { casual = 0.1, hardcore = 0.5, jeune = 0.6, donateur = 0, presse = -0.3 },
	},

	retro = {
		id = "retro",
		name = "Rétro",
		description = "Bois foncé, écrans cathodiques, affiches jaunies, cassettes. Chaleureux et de niche.",
		palette = {
			Color3.fromRGB(86, 58, 40),
			Color3.fromRGB(210, 160, 70),
			Color3.fromRGB(148, 60, 52),
		},
		affinity = { casual = -0.1, hardcore = 0.6, jeune = -0.3, donateur = 0.3, presse = 0.3 },
	},

	cosy = {
		id = "cosy",
		name = "Cosy",
		description = "Textiles, lumière chaude, guirlandes, bibliothèque. Intime, propice aux longues sessions.",
		palette = {
			Color3.fromRGB(198, 156, 124),
			Color3.fromRGB(150, 110, 130),
			Color3.fromRGB(238, 206, 158),
		},
		affinity = { casual = 0.5, hardcore = 0.1, jeune = 0.2, donateur = 0.5, presse = 0.1 },
	},

	pro = {
		id = "pro",
		name = "Pro",
		description = "Gris, acoustique apparente, éclairage neutre. Crédible et un peu froid.",
		palette = {
			Color3.fromRGB(58, 60, 66),
			Color3.fromRGB(140, 144, 152),
			Color3.fromRGB(210, 214, 220),
		},
		affinity = { casual = 0, hardcore = 0.2, jeune = -0.4, donateur = 0.2, presse = 0.7 },
	},
}

-- Les styles voisins se marient sans pénalité. La table est symétrique :
-- on la déclare une fois et on la complète à l'exécution.
local NEIGHBOURS = {
	{ "sobre", "cosy" },
	{ "sobre", "pro" },
	{ "cosy", "retro" },
	{ "gamer", "pro" },
	{ "gamer", "retro" },
}

local neighbourLookup: { [string]: { [string]: boolean } } = {}

for id in pairs(Styles) do
	neighbourLookup[id] = { [id] = true }
end

for _, pair in ipairs(NEIGHBOURS) do
	neighbourLookup[pair[1]][pair[2]] = true
	neighbourLookup[pair[2]][pair[1]] = true
end

local StylesModule = {}

StylesModule.All = Styles

function StylesModule.Get(id: string): Style?
	return Styles[id]
end

function StylesModule.AreCompatible(a: string, b: string): boolean
	local row = neighbourLookup[a]
	return row ~= nil and row[b] == true
end

--- Calcule la cohérence d'un ensemble d'objets, de 0 à 1.
---
--- Un seul style, ou deux styles voisins : cohérence parfaite. Chaque style
--- supplémentaire incompatible coûte cher. On pondère par le nombre
--- d'objets : trois figurines gamer dans une pièce sobre gênent moins qu'un
--- mur entier.
function StylesModule.ComputeCoherence(styleCounts: { [string]: number }): (number, StyleId?)
	local total = 0
	local dominant: StyleId? = nil
	local dominantCount = 0

	for id, count in pairs(styleCounts) do
		total += count
		if count > dominantCount then
			dominant, dominantCount = id :: StyleId, count
		end
	end

	if total == 0 or not dominant then
		return 1, nil
	end

	local aligned = 0
	for id, count in pairs(styleCounts) do
		if StylesModule.AreCompatible(dominant, id) then
			aligned += count
		end
	end

	return aligned / total, dominant
end

return StylesModule
