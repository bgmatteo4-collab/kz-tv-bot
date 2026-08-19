--!strict
--[[
	Aménagement — l'inventaire et le mode construction.

	C'est d'ici qu'on décide de poser un objet. Cliquer sur « Placer »
	referme la vue de l'écran, remet le joueur debout, et lui met l'objet
	en fantôme dans les mains.

	Ça peut sembler un détour — pourquoi ne pas ouvrir le mode construction
	avec une touche ? Parce qu'on s'est interdit tout menu hors de l'OS, et
	parce que c'est cohérent : on choisit ce qu'on installe devant son
	ordinateur, puis on se lève pour le faire.
]]

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Catalogue = require(Shared.Config.Catalogue)
local Styles = require(Shared.Config.Styles)

local Layout = {}

local HEADER_HEIGHT = 64

local SURFACE_LABEL = {
	floor = "au sol",
	desk = "sur le bureau",
	wall = "au mur",
	ceiling = "au plafond",
}

--- Bandeau de cohérence : la seule note que le joueur voit en permanence
--- dans cette app, parce que c'est elle qui doit guider ses achats.
local function buildCoherenceBar(coherence: number, dominant: string?)
	local percent = math.round(coherence * 100)
	local color = Theme.Color.Success

	if percent < 55 then
		color = Theme.Color.Danger
	elseif percent < 80 then
		color = Theme.Color.Warning
	end

	local style = dominant and Styles.Get(dominant)

	local verdict
	if not style then
		verdict = "Pièce vide. Tout reste à faire."
	elseif percent >= 90 then
		verdict = string.format("Direction %s, tenue de bout en bout.", string.lower(style.name))
	elseif percent >= 70 then
		verdict = string.format("Direction %s, avec quelques intrus.", string.lower(style.name))
	else
		verdict = "Trop de directions en même temps. Le fond part dans tous les sens."
	end

	return Widgets.Panel {
		name = "Coherence",
		size = UDim2.new(1, 0, 0, HEADER_HEIGHT),
		color = Theme.Color.SurfaceRaised,
		padding = Theme.Space.LG,

		Widgets.Text {
			text = "IDENTITÉ VISUELLE",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -90, 0, 14),
		},
		Widgets.Text {
			text = verdict,
			color = Theme.Color.TextMuted,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -90, 0, 18),
			position = UDim2.fromOffset(0, 15),
			truncate = true,
		},

		Create("Frame") {
			Name = "Track",
			Size = UDim2.new(1, -90, 0, 4),
			Position = UDim2.fromOffset(0, 38),
			BackgroundColor3 = Theme.Color.Border,
			BorderSizePixel = 0,

			Create("UICorner") { CornerRadius = Theme.Radius.Pill },
			Create("Frame") {
				Name = "Fill",
				Size = UDim2.fromScale(math.clamp(coherence, 0, 1), 1),
				BackgroundColor3 = color,
				BorderSizePixel = 0,
				Create("UICorner") { CornerRadius = Theme.Radius.Pill },
			},
		},

		Widgets.Text {
			text = string.format("%d%%", percent),
			font = Theme.Font.Mono,
			size = Theme.TextSize.Heading,
			color = color,
			align = Enum.TextXAlignment.Right,
			size2 = UDim2.new(0, 80, 1, 0),
			position = UDim2.new(1, -80, 0, 0),
		},
	}
end

local function buildRow(entry, item, placed: boolean, order: number, onAction: () -> ())
	local style = item.style and Styles.Get(item.style)

	return Widgets.ListRow {
		height = 52,
		order = order,

		Create("Frame") {
			Name = "StyleDot",
			Size = UDim2.fromOffset(8, 8),
			Position = UDim2.new(0, 0, 0.5, 0),
			AnchorPoint = Vector2.new(0, 0.5),
			BackgroundColor3 = style and style.palette[2] or Theme.Color.Border,
			BorderSizePixel = 0,
			Create("UICorner") { CornerRadius = Theme.Radius.Pill },
		},

		Widgets.Text {
			text = item.name,
			font = Theme.Font.Medium,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -140, 0, 17),
			position = UDim2.fromOffset(18, 0),
			truncate = true,
		},
		Widgets.Text {
			text = string.format("%s · %s", item.brand, SURFACE_LABEL[item.surface] or item.surface or ""),
			color = Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -140, 0, 15),
			position = UDim2.fromOffset(18, 18),
			truncate = true,
		},

		Widgets.Button {
			text = placed and "Ranger" or "Placer",
			variant = placed and "ghost" or "primary",
			size = UDim2.fromOffset(110, 30),
			position = UDim2.new(1, -110, 0.5, 0),
			anchor = Vector2.new(0, 0.5),
			onClick = onAction,
		},
	}
end

function Layout.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local showPlaced = false

	local list = Widgets.Scroll {
		size = UDim2.new(1, 0, 1, -HEADER_HEIGHT - 38),
		position = UDim2.fromOffset(0, HEADER_HEIGHT + 38),
		padding = Theme.Space.MD,
		gap = 2,
	}

	local tabs = Widgets.Panel {
		name = "Tabs",
		size = UDim2.new(1, 0, 0, 38),
		position = UDim2.fromOffset(0, HEADER_HEIGHT),
		color = Theme.Color.Surface,
		padding = Theme.Space.SM,
		list = { direction = Enum.FillDirection.Horizontal, gap = Theme.Space.XS },
	}

	local header = Widgets.Panel {
		name = "HeaderSlot",
		size = UDim2.new(1, 0, 0, HEADER_HEIGHT),
		color = Theme.Color.SurfaceRaised,
	}

	local render

	local function renderTabs()
		for _, child in ipairs(tabs:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		local inventory = api.state.inventory or {}
		local placed = api.state.placed or {}

		local options = {
			{ label = string.format("À installer (%d)", #inventory), placed = false },
			{ label = string.format("Installé (%d)", #placed), placed = true },
		}

		for index, option in ipairs(options) do
			Widgets.Button {
				text = option.label,
				variant = option.placed == showPlaced and "primary" or "ghost",
				size = UDim2.fromOffset(160, 26),
				order = index,
				onClick = function()
					showPlaced = option.placed
					renderTabs()
					render()
				end,
			}.Parent = tabs
		end
	end

	function render()
		header:ClearAllChildren()

		local owned = {}
		for _, entry in ipairs(api.state.inventory or {}) do
			table.insert(owned, entry.itemId)
		end
		for _, entry in ipairs(api.state.placed or {}) do
			table.insert(owned, entry.itemId)
		end

		local counts = Catalogue.CountStyles(owned)
		local coherence, dominant = Styles.ComputeCoherence(counts)
		buildCoherenceBar(coherence, dominant).Parent = header

		list:ClearAllChildren()

		Create("UIListLayout") {
			Padding = UDim.new(0, 2),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = list

		Create("UIPadding") {
			PaddingTop = UDim.new(0, Theme.Space.SM),
			PaddingLeft = UDim.new(0, Theme.Space.MD),
			PaddingRight = UDim.new(0, Theme.Space.MD),
		}.Parent = list

		local entries = showPlaced and (api.state.placed or {}) or (api.state.inventory or {})

		if #entries == 0 then
			Widgets.Text {
				text = showPlaced and "Rien n'est encore installé dans la pièce."
					or "Aucun objet en attente. Passe commande depuis le Marché.",
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Small,
				align = Enum.TextXAlignment.Center,
				wrapped = true,
				size2 = UDim2.new(1, 0, 0, 60),
			}.Parent = list
			return
		end

		for index, entry in ipairs(entries) do
			local item = Catalogue.Get(entry.itemId)
			if item then
				buildRow(entry, item, showPlaced, index, function()
					if showPlaced then
						api.request("build/remove", { uid = entry.uid })
					else
						api.localAction("placement/begin", { uid = entry.uid, itemId = entry.itemId })
					end
				end).Parent = list
			end
		end
	end

	local root = Widgets.Panel {
		name = "LayoutRoot",
		color = Theme.Color.Desktop,

		header,
		tabs,
		list,
	}
	root.Parent = container
	trove:Add(root)

	renderTabs()
	render()

	trove:Add(api.stateChanged:Connect(function()
		renderTabs()
		render()
	end))

	return function()
		trove:Clean()
	end
end

return Layout
