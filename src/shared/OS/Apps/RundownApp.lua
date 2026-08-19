--!strict
--[[
	Conducteur — composer son émission.

	MAQUETTE. Le conducteur se modifie mais n'est pas encore sauvegardé ni
	joué : c'est la démonstration du geste, pas le système final.

	Le principe : on n'achète pas un « type de stream » dans une liste, on
	assemble une suite de rubriques, dans l'ordre qu'on veut, avec les
	durées qu'on veut. La colonne de droite montre en direct l'arbitrage —
	un débat ravit les fidèles et fait fuir les curieux, et aucun format ne
	plaît à tout le monde.
]]

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Rundown = require(Shared.Content.Rundown)

local RundownApp = {}

local LIBRARY_WIDTH = 250
local ANALYSIS_WIDTH = 250
local HEADER_HEIGHT = 62

local SEGMENTS = {
	{ id = "casual", label = "Curieux" },
	{ id = "hardcore", label = "Fidèles" },
	{ id = "jeune", label = "Jeune public" },
	{ id = "donateur", label = "Donateurs" },
	{ id = "presse", label = "Presse" },
}

local function formatDuration(minutes: number): string
	if minutes < 60 then
		return string.format("%d min", minutes)
	end
	return string.format("%dh%02d", math.floor(minutes / 60), minutes % 60)
end

function RundownApp.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	-- Copie de travail : la maquette modifie sa propre liste, sans rien
	-- envoyer au serveur.
	local segments = {}
	for _, segment in ipairs(Rundown.Example.segments) do
		table.insert(segments, { kind = segment.kind, name = segment.name, minutes = segment.minutes })
	end

	local timeline = Widgets.Scroll {
		name = "Timeline",
		size = UDim2.new(1, -LIBRARY_WIDTH - ANALYSIS_WIDTH, 1, -HEADER_HEIGHT),
		position = UDim2.fromOffset(LIBRARY_WIDTH, HEADER_HEIGHT),
		padding = Theme.Space.MD,
		gap = Theme.Space.XS,
	}

	local analysis = Widgets.Panel {
		name = "Analysis",
		size = UDim2.new(0, ANALYSIS_WIDTH, 1, -HEADER_HEIGHT),
		position = UDim2.new(1, -ANALYSIS_WIDTH, 0, HEADER_HEIGHT),
		color = Theme.Color.Surface,
		padding = Theme.Space.MD,
	}

	local totalLabel = Widgets.Text {
		name = "Total",
		text = "",
		color = Theme.Color.Text,
		font = Theme.Font.Mono,
		size = Theme.TextSize.Title,
		align = Enum.TextXAlignment.Right,
		size2 = UDim2.new(0, 200, 0, 26),
		position = UDim2.new(1, -220, 0, 12),
	}

	local prepLabel = Widgets.Text {
		name = "Prep",
		text = "",
		color = Theme.Color.TextDisabled,
		size = Theme.TextSize.Tiny,
		align = Enum.TextXAlignment.Right,
		size2 = UDim2.new(0, 200, 0, 14),
		position = UDim2.new(1, -220, 0, 38),
	}

	local render

	--- La colonne d'arbitrage. C'est elle qui transforme une liste de
	--- rubriques en décision : on voit immédiatement qui on séduit et qui
	--- on perd.
	local function renderAnalysis()
		for _, child in ipairs(analysis:GetChildren()) do
			if child:IsA("GuiObject") then
				child:Destroy()
			end
		end

		Widgets.Text {
			text = "RÉACTION ATTENDUE",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 16),
		}.Parent = analysis

		local totals: { [string]: number } = {}
		local weight = 0

		for _, segment in ipairs(segments) do
			local segmentType = Rundown.GetType(segment.kind)
			if segmentType then
				weight += segment.minutes
				for id, value in pairs(segmentType.appeal) do
					totals[id] = (totals[id] or 0) + value * segment.minutes
				end
			end
		end

		for index, audience in ipairs(SEGMENTS) do
			local raw = weight > 0 and (totals[audience.id] or 0) / weight or 0
			local normalised = math.clamp((raw + 1) / 2, 0, 1)

			local color = Theme.Color.Success
			if raw < -0.1 then
				color = Theme.Color.Danger
			elseif raw < 0.15 then
				color = Theme.Color.Warning
			end

			local row = Widgets.Panel {
				name = audience.id,
				size = UDim2.new(1, 0, 0, 38),
				position = UDim2.fromOffset(0, 24 + (index - 1) * 42),
				transparency = 1,

				Widgets.Text {
					text = audience.label,
					color = Theme.Color.TextMuted,
					size = Theme.TextSize.Tiny,
					size2 = UDim2.new(1, -46, 0, 14),
				},
				Widgets.Text {
					text = string.format("%+d", math.round(raw * 100)),
					color = color,
					font = Theme.Font.Mono,
					size = Theme.TextSize.Tiny,
					align = Enum.TextXAlignment.Right,
					size2 = UDim2.new(0, 44, 0, 14),
					position = UDim2.new(1, -44, 0, 0),
				},
				Create("Frame") {
					Name = "Track",
					Size = UDim2.new(1, 0, 0, 4),
					Position = UDim2.fromOffset(0, 20),
					BackgroundColor3 = Theme.Color.Border,
					BorderSizePixel = 0,
					Create("UICorner") { CornerRadius = Theme.Radius.Pill },
					Create("Frame") {
						Name = "Fill",
						Size = UDim2.fromScale(normalised, 1),
						BackgroundColor3 = color,
						BorderSizePixel = 0,
						Create("UICorner") { CornerRadius = Theme.Radius.Pill },
					},
				},
			}
			row.Parent = analysis
		end

		Widgets.Text {
			text = "Aucun format ne plaît à tout le monde. Un conducteur, c'est le choix de qui on accepte de perdre.",
			color = Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			wrapped = true,
			size2 = UDim2.new(1, 0, 0, 60),
			position = UDim2.fromOffset(0, 24 + #SEGMENTS * 42 + 12),
			alignY = Enum.TextYAlignment.Top,
		}.Parent = analysis
	end

	local function segmentRow(segment, index: number)
		local segmentType = Rundown.GetType(segment.kind)
		local color = Rundown.KindColor[segment.kind] or Theme.Color.Border

		local row = Widgets.Panel {
			name = segment.name,
			size = UDim2.new(1, 0, 0, 62),
			color = Theme.Color.SurfaceRaised,
			radius = Theme.Radius.Small,
			padding = Theme.Space.MD,
			order = index,

			Create("Frame") {
				Name = "Bar",
				Size = UDim2.fromOffset(4, 40),
				Position = UDim2.fromOffset(-8, 0),
				BackgroundColor3 = color,
				BorderSizePixel = 0,
				Create("UICorner") { CornerRadius = Theme.Radius.Pill },
			},

			Widgets.Text {
				text = string.format("%d.  %s", index, segment.name),
				font = Theme.Font.Medium,
				size = Theme.TextSize.Small,
				size2 = UDim2.new(1, -190, 0, 18),
				truncate = true,
			},
			Widgets.Text {
				text = segmentType and segmentType.risk or "",
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, -190, 0, 16),
				position = UDim2.fromOffset(0, 20),
				truncate = true,
			},
			Widgets.Text {
				text = segmentType and segmentType.requires and ("nécessite : " .. segmentType.requires) or "",
				color = Theme.Color.Warning,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, -190, 0, 14),
				position = UDim2.fromOffset(0, 36),
				truncate = true,
			},

			Widgets.Text {
				text = formatDuration(segment.minutes),
				color = Theme.Color.Text,
				font = Theme.Font.Mono,
				size = Theme.TextSize.Body,
				align = Enum.TextXAlignment.Right,
				size2 = UDim2.new(0, 66, 0, 20),
				position = UDim2.new(1, -186, 0, 0),
			},
		}

		local controls = {
			{ text = "−", action = function()
				segment.minutes = math.max(2, segment.minutes - 5)
			end },
			{ text = "+", action = function()
				segment.minutes = math.min(120, segment.minutes + 5)
			end },
			{ text = "▲", action = function()
				if index > 1 then
					segments[index], segments[index - 1] = segments[index - 1], segments[index]
				end
			end },
			{ text = "▼", action = function()
				if index < #segments then
					segments[index], segments[index + 1] = segments[index + 1], segments[index]
				end
			end },
			{ text = "✕", action = function()
				table.remove(segments, index)
			end },
		}

		for buttonIndex, control in ipairs(controls) do
			Widgets.Button {
				text = control.text,
				variant = control.text == "✕" and "danger" or "ghost",
				textSize = Theme.TextSize.Small,
				size = UDim2.fromOffset(30, 28),
				position = UDim2.new(1, -114 + (buttonIndex - 1) * 32, 0.5, 0),
				anchor = Vector2.new(0, 0.5),
				onClick = function()
					control.action()
					render()
				end,
			}.Parent = row
		end

		return row
	end

	function render()
		timeline:ClearAllChildren()

		Create("UIListLayout") {
			Padding = UDim.new(0, Theme.Space.XS),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = timeline

		Create("UIPadding") {
			PaddingTop = UDim.new(0, Theme.Space.MD),
			PaddingLeft = UDim.new(0, Theme.Space.LG),
			PaddingRight = UDim.new(0, Theme.Space.MD),
			PaddingBottom = UDim.new(0, Theme.Space.MD),
		}.Parent = timeline

		local total, prep = 0, 0

		for index, segment in ipairs(segments) do
			segmentRow(segment, index).Parent = timeline
			total += segment.minutes

			local segmentType = Rundown.GetType(segment.kind)
			if segmentType then
				prep += segmentType.prepCost
			end
		end

		if #segments == 0 then
			Widgets.Text {
				text = "Conducteur vide. Ajoute une rubrique depuis la colonne de gauche.",
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Small,
				align = Enum.TextXAlignment.Center,
				size2 = UDim2.new(1, 0, 0, 60),
			}.Parent = timeline
		end

		totalLabel.Text = formatDuration(total)
		totalLabel.TextColor3 = total > 150 and Theme.Color.Warning or Theme.Color.Text
		prepLabel.Text = string.format("%d heures de préparation dans la semaine", prep)

		renderAnalysis()
	end

	-- ── Bibliothèque de rubriques ─────────────────────────────────────────

	local library = Widgets.Scroll {
		name = "Library",
		size = UDim2.new(0, LIBRARY_WIDTH, 1, -HEADER_HEIGHT),
		position = UDim2.fromOffset(0, HEADER_HEIGHT),
		padding = Theme.Space.SM,
		gap = Theme.Space.XS,
	}

	Widgets.Text {
		text = "RUBRIQUES DISPONIBLES",
		color = Theme.Color.TextDisabled,
		font = Theme.Font.Bold,
		size = Theme.TextSize.Tiny,
		size2 = UDim2.new(1, 0, 0, 18),
		order = 0,
	}.Parent = library

	for index, segmentType in ipairs(Rundown.Types) do
		local entry = segmentType :: any

		Widgets.ListRow {
			height = 54,
			order = index,
			onClick = function()
				table.insert(segments, {
					kind = entry.kind,
					name = entry.name,
					minutes = entry.defaultMinutes,
				})
				render()
			end,

			Create("Frame") {
				Name = "Bar",
				Size = UDim2.fromOffset(3, 34),
				Position = UDim2.new(0, 0, 0.5, 0),
				AnchorPoint = Vector2.new(0, 0.5),
				BackgroundColor3 = Rundown.KindColor[entry.kind] or Theme.Color.Border,
				BorderSizePixel = 0,
			},
			Widgets.Text {
				text = entry.name,
				font = Theme.Font.Medium,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, -12, 0, 15),
				position = UDim2.fromOffset(10, 0),
				truncate = true,
			},
			Widgets.Text {
				text = entry.description,
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Tiny,
				wrapped = true,
				size2 = UDim2.new(1, -12, 0, 26),
				position = UDim2.fromOffset(10, 15),
				alignY = Enum.TextYAlignment.Top,
			},
		}.Parent = library
	end

	-- ── En-tête ───────────────────────────────────────────────────────────

	local header = Widgets.Panel {
		name = "Header",
		size = UDim2.new(1, 0, 0, HEADER_HEIGHT),
		color = Theme.Color.SurfaceRaised,
		padding = Theme.Space.LG,

		Widgets.Text {
			text = Rundown.Example.name,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Heading,
			size2 = UDim2.new(1, -240, 0, 28),
			truncate = true,
		},
		Widgets.Text {
			text = string.format(
				"tous les %s à %s   ·   maquette : rien n'est encore sauvegardé",
				Rundown.Example.weekday,
				Rundown.Example.hour
			),
			color = Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -240, 0, 16),
			position = UDim2.fromOffset(0, 28),
		},

		totalLabel,
		prepLabel,
	}

	local root = Widgets.Panel {
		name = "RundownRoot",
		color = Theme.Color.Desktop,

		header,
		library,
		timeline,
		analysis,
	}
	root.Parent = container
	trove:Add(root)

	render()

	return function()
		trove:Clean()
	end
end

return RundownApp
