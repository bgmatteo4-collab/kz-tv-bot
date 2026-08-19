--!strict
--[[
	Placeholder — l'écran des apps déclarées mais pas encore écrites.

	Il existe pour une raison précise : le catalogue d'apps décrit toute la
	courbe de progression du jeu (analytique, gestion d'entreprise,
	conducteur d'émission). On veut pouvoir tester dès maintenant que les
	déblocages s'enchaînent bien, sans attendre que chaque app soit finie.
]]

local Shared = script.Parent.Parent.Parent
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)

local Placeholder = {}

function Placeholder.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local root = Widgets.Panel {
		name = "PlaceholderRoot",
		color = Theme.Color.Surface,
		padding = Theme.Space.XXL,
		list = { gap = Theme.Space.SM, alignX = Enum.HorizontalAlignment.Center, alignY = Enum.VerticalAlignment.Center },

		Widgets.Text {
			text = "Module non installé",
			font = Theme.Font.Bold,
			size = Theme.TextSize.Heading,
			align = Enum.TextXAlignment.Center,
			size2 = UDim2.new(1, 0, 0, 30),
			order = 1,
		},
		Widgets.Text {
			text = "Cette application est débloquée mais son contenu arrive dans une prochaine mise à jour.",
			color = Theme.Color.TextMuted,
			size = Theme.TextSize.Small,
			align = Enum.TextXAlignment.Center,
			wrapped = true,
			size2 = UDim2.new(0.7, 0, 0, 40),
			order = 2,
		},
	}
	root.Parent = container
	trove:Add(root)

	return function()
		trove:Clean()
	end
end

return Placeholder
