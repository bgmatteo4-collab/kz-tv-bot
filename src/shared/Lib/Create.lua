--!strict
--[[
	Create — sucre syntaxique pour fabriquer des Instances sans dix lignes
	d'assignations. Les enfants se déclarent dans le même bloc que les
	propriétés, ce qui rend l'arborescence d'UI lisible d'un coup d'oeil.

	local frame = Create("Frame") {
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(0, 0, 0),

		Create("UICorner") { CornerRadius = UDim.new(0, 6) },
	}
]]

local function Create(className: string)
	return function(properties: { [any]: any }): any
		local instance = Instance.new(className)

		-- Les clés numériques sont des enfants, les clés texte des propriétés.
		-- On applique les propriétés d'abord : certaines (comme Size sur un
		-- UIListLayout parent) changent la manière dont les enfants se placent.
		for key, value in pairs(properties) do
			if typeof(key) == "string" then
				(instance :: any)[key] = value
			end
		end

		for _, child in ipairs(properties) do
			if typeof(child) == "Instance" then
				child.Parent = instance
			end
		end

		return instance
	end
end

return Create
