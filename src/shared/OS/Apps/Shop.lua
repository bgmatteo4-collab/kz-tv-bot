--!strict
--[[
	Boutique — la commande de matériel en ligne.

	On ne reçoit rien immédiatement : la commande part, et le colis arrive
	le lendemain matin. C'est ce délai qui transforme un achat en décision
	de planification — on ne répare pas son setup en plein direct.

	L'app affiche aussi les commandes en cours, parce qu'un joueur doit
	pouvoir vérifier ce qu'il a déjà commandé avant de le commander deux fois.
]]

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Catalogue = require(Shared.Config.Catalogue)
local Styles = require(Shared.Config.Styles)

local Shop = {}

local SIDEBAR_WIDTH = 180
local HEADER_HEIGHT = 46

local FAMILIES = {
	{ id = "orders", name = "Mes commandes", glyph = "◷" },
	{ id = "tech", name = "Matériel", glyph = "◉" },
	{ id = "furniture", name = "Mobilier", glyph = "▤" },
	{ id = "lighting", name = "Éclairage", glyph = "☀" },
	{ id = "decor", name = "Décoration", glyph = "❋" },
	{ id = "power", name = "Alimentation", glyph = "⚡" },
}

local TIER_LABEL = { "entrée de gamme", "milieu de gamme", "haut de gamme" }

local function formatPrice(amount: number): string
	if amount <= 0 then
		return "fourni"
	end
	return string.format("%d €", amount)
end

--- Une fiche produit. Volontairement dense : c'est une boutique en ligne,
--- pas une vitrine de luxe, et le joueur doit pouvoir comparer vite.
local function buildCard(item, canAfford: boolean, alreadyOrdered: boolean, onBuy: () -> ())
	local style = item.style and Styles.Get(item.style)

	local specs = {}
	if item.quality then
		table.insert(specs, string.format("qualité %d%%", math.round(item.quality * 100)))
	end
	if item.keys then
		table.insert(specs, string.format("%d touches", item.keys))
	end
	if item.deskSlots then
		table.insert(specs, string.format("%d emplacements", item.deskSlots))
	end
	if item.seats then
		table.insert(specs, string.format("%d places", item.seats))
	end
	if item.sockets then
		table.insert(specs, string.format("%d prises", item.sockets))
	end
	if item.maxWatts then
		table.insert(specs, string.format("%d W max", item.maxWatts))
	end
	if item.power and item.power > 0 then
		table.insert(specs, string.format("%d W", item.power))
	end
	if item.controllable then
		table.insert(specs, "pilotable")
	end

	local buyLabel = "Commander"
	local buyVariant = "primary"

	if alreadyOrdered then
		buyLabel, buyVariant = "En cours de livraison", "ghost"
	elseif not canAfford then
		buyLabel, buyVariant = "Fonds insuffisants", "ghost"
	end

	return Widgets.Panel {
		name = item.id,
		size = UDim2.new(1, 0, 0, 128),
		color = Theme.Color.SurfaceRaised,
		radius = Theme.Radius.Small,
		padding = Theme.Space.MD,

		-- Bandeau de style : identifie la direction déco d'un coup d'oeil.
		Create("Frame") {
			Name = "StyleBar",
			Size = UDim2.new(0, 3, 1, 0),
			Position = UDim2.fromOffset(-Theme.Space.MD + 2, 0),
			BackgroundColor3 = style and style.palette[2] or Theme.Color.Border,
			BorderSizePixel = 0,
		},

		Widgets.Text {
			text = item.name,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Title,
			size2 = UDim2.new(1, -140, 0, 22),
			position = UDim2.fromOffset(Theme.Space.SM, 0),
			truncate = true,
		},
		Widgets.Text {
			text = string.format("%s · %s · %s", item.brand, style and style.name or "—", TIER_LABEL[item.tier] or ""),
			color = Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -140, 0, 15),
			position = UDim2.fromOffset(Theme.Space.SM, 23),
			truncate = true,
		},
		Widgets.Text {
			text = item.description,
			color = Theme.Color.TextMuted,
			size = Theme.TextSize.Small,
			wrapped = true,
			size2 = UDim2.new(1, -150, 0, 42),
			position = UDim2.fromOffset(Theme.Space.SM, 42),
			alignY = Enum.TextYAlignment.Top,
		},
		Widgets.Text {
			text = #specs > 0 and table.concat(specs, "  ·  ") or "",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Mono,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -150, 0, 14),
			position = UDim2.new(0, Theme.Space.SM, 1, -14),
			truncate = true,
		},

		Widgets.Text {
			text = formatPrice(item.price),
			font = Theme.Font.Bold,
			size = Theme.TextSize.Heading,
			align = Enum.TextXAlignment.Right,
			color = canAfford and Theme.Color.Text or Theme.Color.TextDisabled,
			size2 = UDim2.new(0, 130, 0, 28),
			position = UDim2.new(1, -130, 0, 0),
		},
		Widgets.Button {
			text = buyLabel,
			variant = buyVariant,
			size = UDim2.fromOffset(130, 32),
			position = UDim2.new(1, -130, 1, -32),
			onClick = function()
				if canAfford and not alreadyOrdered then
					onBuy()
				end
			end,
		},
	}
end

local function buildOrderRow(order, item, currentDay: number, order_: number)
	local remaining = math.max(0, (order.arrivesDay or currentDay) - currentDay)
	local status = remaining <= 0 and "Livraison ce matin" or string.format("Arrive dans %d jour(s)", remaining)

	return Widgets.ListRow {
		height = 50,
		order = order_,

		Widgets.Text {
			text = item and item.name or order.itemId,
			font = Theme.Font.Medium,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -120, 0, 17),
			truncate = true,
		},
		Widgets.Text {
			text = status,
			color = remaining <= 0 and Theme.Color.Success or Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -120, 0, 15),
			position = UDim2.fromOffset(0, 18),
		},
		Widgets.Text {
			text = item and formatPrice(item.price) or "",
			color = Theme.Color.TextMuted,
			font = Theme.Font.Mono,
			size = Theme.TextSize.Small,
			align = Enum.TextXAlignment.Right,
			size2 = UDim2.new(0, 110, 1, 0),
			position = UDim2.new(1, -110, 0, 0),
		},
	}
end

function Shop.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local currentFamily = "tech"

	local balanceLabel = Widgets.Text {
		name = "Balance",
		text = "",
		font = Theme.Font.Bold,
		size = Theme.TextSize.Title,
		align = Enum.TextXAlignment.Right,
		size2 = UDim2.new(0, 200, 1, 0),
		position = UDim2.new(1, -200 - Theme.Space.LG, 0, 0),
	}

	local header = Widgets.Panel {
		name = "Header",
		size = UDim2.new(1, 0, 0, HEADER_HEIGHT),
		color = Theme.Color.SurfaceRaised,

		Widgets.Text {
			text = "MARCHÉ — livraison le lendemain matin",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(0.6, 0, 1, 0),
			position = UDim2.fromOffset(Theme.Space.LG, 0),
		},
		balanceLabel,
	}

	local list = Widgets.Scroll {
		size = UDim2.new(1, -SIDEBAR_WIDTH, 1, -HEADER_HEIGHT),
		position = UDim2.fromOffset(SIDEBAR_WIDTH, HEADER_HEIGHT),
		padding = Theme.Space.MD,
		gap = Theme.Space.SM,
	}

	local sidebar = Widgets.Panel {
		name = "Sidebar",
		size = UDim2.new(0, SIDEBAR_WIDTH, 1, -HEADER_HEIGHT),
		position = UDim2.fromOffset(0, HEADER_HEIGHT),
		color = Theme.Color.Surface,
		padding = Theme.Space.SM,
		list = { gap = 2 },
	}

	local renderList

	local function renderSidebar()
		for _, child in ipairs(sidebar:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		for index, family in ipairs(FAMILIES) do
			Widgets.ListRow {
				height = 34,
				order = index,
				selected = family.id == currentFamily,
				onClick = function()
					currentFamily = family.id
					renderSidebar()
					renderList()
				end,

				Widgets.Text {
					text = string.format("%s   %s", family.glyph, family.name),
					size = Theme.TextSize.Small,
					color = family.id == currentFamily and Theme.Color.Text or Theme.Color.TextMuted,
					size2 = UDim2.fromScale(1, 1),
					truncate = true,
				},
			}.Parent = sidebar
		end
	end

	function renderList()
		list:ClearAllChildren()

		Create("UIListLayout") {
			Padding = UDim.new(0, Theme.Space.SM),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = list

		Create("UIPadding") {
			PaddingTop = UDim.new(0, Theme.Space.MD),
			PaddingBottom = UDim.new(0, Theme.Space.MD),
			PaddingLeft = UDim.new(0, Theme.Space.MD),
			PaddingRight = UDim.new(0, Theme.Space.MD),
		}.Parent = list

		local money = api.state.money or 0
		local orders = api.state.orders or {}

		if currentFamily == "orders" then
			if #orders == 0 then
				Widgets.Text {
					text = "Aucune commande en cours.",
					color = Theme.Color.TextDisabled,
					size = Theme.TextSize.Small,
					align = Enum.TextXAlignment.Center,
					size2 = UDim2.new(1, 0, 0, 60),
				}.Parent = list
				return
			end

			for index, order in ipairs(orders) do
				buildOrderRow(order, Catalogue.Get(order.itemId), api.state.day or 1, index).Parent = list
			end
			return
		end

		local pending: { [string]: boolean } = {}
		for _, order in ipairs(orders) do
			pending[order.itemId] = true
		end

		for index, item in ipairs(Catalogue.ByFamily(currentFamily)) do
			-- Le matériel fourni au départ ne se commande pas : il est déjà
			-- là, et le proposer à zéro euro permettrait d'en empiler.
			if item.price > 0 then
			local card = buildCard(item, money >= item.price, pending[item.id] == true, function()
				api.request("shop/order", { itemId = item.id })
			end)
			card.LayoutOrder = index
			card.Parent = list
			end
		end
	end

	local function renderBalance()
		balanceLabel.Text = string.format("%d €", api.state.money or 0)
	end

	local root = Widgets.Panel {
		name = "ShopRoot",
		color = Theme.Color.Desktop,

		header,
		sidebar,
		list,
	}
	root.Parent = container
	trove:Add(root)

	renderSidebar()
	renderList()
	renderBalance()

	trove:Add(api.stateChanged:Connect(function()
		renderBalance()
		renderList()
	end))

	return function()
		trove:Clean()
	end
end

return Shop
