--!strict
--[[
	Trove — un sac à nettoyage. On y jette tout ce qu'on crée (Instances,
	connexions, fonctions d'annulation), et un seul :Clean() range tout.

	Sans ça, un OS qui ouvre et ferme des fenêtres en permanence fuit
	de la mémoire au bout de dix minutes de jeu.
]]

local Trove = {}
Trove.__index = Trove

function Trove.new()
	return setmetatable({ _items = {} }, Trove)
end

--- Accepte une Instance, une RBXScriptConnection, une table avec :Destroy()
--- ou :Disconnect(), ou une simple fonction.
function Trove:Add<T>(item: T): T
	table.insert(self._items, item)
	return item
end

--- Retire un objet du trove sans le nettoyer.
function Trove:Remove(item: any)
	for index, stored in ipairs(self._items) do
		if stored == item then
			table.remove(self._items, index)
			return true
		end
	end
	return false
end

local function cleanupItem(item: any)
	local itemType = typeof(item)

	if itemType == "Instance" then
		item:Destroy()
	elseif itemType == "RBXScriptConnection" then
		item:Disconnect()
	elseif itemType == "function" then
		item()
	elseif itemType == "table" then
		if typeof(item.Destroy) == "function" then
			item:Destroy()
		elseif typeof(item.Disconnect) == "function" then
			item:Disconnect()
		elseif typeof(item.Clean) == "function" then
			item:Clean()
		end
	end
end

function Trove:Clean()
	-- En ordre inverse : on détruit les enfants avant les parents.
	for index = #self._items, 1, -1 do
		cleanupItem(self._items[index])
	end
	table.clear(self._items)
end

Trove.Destroy = Trove.Clean

return Trove
