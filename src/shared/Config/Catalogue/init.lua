--!strict
--[[
	Catalogue — tout ce qui peut être acheté et posé dans le jeu.

	Le catalogue est réparti en familles, une par module. Ajouter un objet
	ne demande jamais d'écrire de la logique : une entrée suffit, et l'objet
	apparaît en boutique, dans le mode construction, dans les sources de
	KZ Studio et dans le calcul de la note d'image.

	Champs communs à tous les objets :

	  id          identifiant unique
	  name        nom affiché
	  brand       marque fictive
	  family       "tech" | "furniture" | "lighting" | "decor" | "power"
	  category    sous-type ("camera", "desk", "led"...)
	  style       une des cinq directions de Config/Styles
	  tier        1 entrée de gamme, 2 milieu, 3 haut de gamme
	  price       prix d'achat
	  power       consommation en watts (0 si passif)
	  surface     "floor" | "desk" | "wall" | "ceiling"
	  footprint   encombrement au sol ou sur le plan, en studs
	  description texte de boutique

	Champs optionnels selon la famille : quality, requires, provides,
	screens, sockets, maxWatts, ambience.
]]

local families = {
	require(script.Tech),
	require(script.Furniture),
	require(script.Lighting),
	require(script.Decor),
	require(script.Power),
}

local items: { [string]: any } = {}
local order: { string } = {}

for _, family in ipairs(families) do
	for _, item in ipairs(family) do
		if items[item.id] then
			warn(string.format("[KZ] identifiant de catalogue en double : %s", item.id))
		end
		items[item.id] = item
		table.insert(order, item.id)
	end
end

local Catalogue = {}

Catalogue.Items = items

function Catalogue.Get(id: string): any?
	return items[id]
end

--- Tous les objets, dans l'ordre de déclaration (qui est aussi l'ordre de
--- progression : le catalogue se lit du plus modeste au plus ambitieux).
function Catalogue.All(): { any }
	local list = {}
	for _, id in ipairs(order) do
		table.insert(list, items[id])
	end
	return list
end

function Catalogue.ByFamily(family: string): { any }
	local list = {}
	for _, id in ipairs(order) do
		local item = items[id]
		if item.family == family then
			table.insert(list, item)
		end
	end
	return list
end

function Catalogue.ByCategory(category: string): { any }
	local list = {}
	for _, id in ipairs(order) do
		local item = items[id]
		if item.category == category then
			table.insert(list, item)
		end
	end
	return list
end

--- Compte les styles d'un ensemble d'objets possédés, pour le calcul de
--- cohérence. Les objets purement techniques et invisibles à l'image ne
--- comptent pas : personne ne juge une multiprise.
function Catalogue.CountStyles(ownedIds: { string }): { [string]: number }
	local counts: { [string]: number } = {}

	for _, id in ipairs(ownedIds) do
		local item = items[id]
		if item and item.style and item.visible ~= false then
			counts[item.style] = (counts[item.style] or 0) + 1
		end
	end

	return counts
end

return Catalogue
