--!strict
--[[
	KZ Studio — le logiciel de diffusion.

	C'est l'app centrale du jeu, et la démonstration du principe qui tient
	tout le projet : les SOURCES disponibles ici ne sont pas une liste
	écrite en dur, ce sont les appareils réellement posés et branchés dans
	la pièce du joueur. Pas de micro branché, pas de source micro. Et le
	jeu ne t'avertira pas — le chat s'en chargera, dans quatre minutes.
]]

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)

local Studio = {}

local SIDEBAR_WIDTH = 240
local FOOTER_HEIGHT = 64

local CATEGORY_LABEL = {
	camera = "Caméra",
	microphone = "Micro",
	display = "Écran",
	backdrop = "Fond",
	light = "Lumière",
	capture = "Acquisition",
	computer = "Machine",
	network = "Réseau",
}

--- Un pavé de statistique du pied de page (durée, débit, viewers...).
local function statBlock(label: string, value: string, order: number, color: Color3?)
	return Widgets.Panel {
		size = UDim2.new(0, 110, 1, 0),
		color = Theme.Color.Surface,
		transparency = 1,
		order = order,

		Widgets.Text {
			text = label,
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Medium,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 14),
		},
		Widgets.Text {
			name = "Value",
			text = value,
			color = color or Theme.Color.Text,
			font = Theme.Font.Mono,
			size = Theme.TextSize.Title,
			size2 = UDim2.new(1, 0, 0, 24),
			position = UDim2.fromOffset(0, 15),
		},
	}
end

--- Ligne de source : nom, catégorie, et pastille d'état.
local function sourceRow(source, order: number)
	local ok = source.connected

	local status = Create("Frame") {
		Name = "Status",
		Size = UDim2.fromOffset(8, 8),
		Position = UDim2.new(1, 0, 0.5, 0),
		AnchorPoint = Vector2.new(1, 0.5),
		BackgroundColor3 = ok and Theme.Color.Success or Theme.Color.Danger,
		BorderSizePixel = 0,

		Create("UICorner") { CornerRadius = Theme.Radius.Pill },
	}

	return Widgets.ListRow {
		height = 42,
		order = order,

		status,

		Widgets.Text {
			text = source.name,
			color = ok and Theme.Color.Text or Theme.Color.TextDisabled,
			font = Theme.Font.Medium,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -16, 0, 15),
			truncate = true,
		},
		Widgets.Text {
			text = ok and (CATEGORY_LABEL[source.category] or source.category) or "non détecté",
			color = ok and Theme.Color.TextDisabled or Theme.Color.Danger,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -16, 0, 13),
			position = UDim2.fromOffset(0, 15),
			truncate = true,
		},
	}
end

function Studio.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	-- ── Aperçu : le ViewportFrame est la caméra du stream. Ce que le joueur
	-- voit ici est littéralement ce que voient ses viewers, rendu depuis la
	-- position réelle de sa webcam dans la pièce.
	local viewport = Create("ViewportFrame") {
		Name = "Preview",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BorderSizePixel = 0,
		Ambient = Color3.fromRGB(150, 150, 150),
		LightColor = Color3.fromRGB(255, 255, 255),
	}

	local noSignal = Widgets.Text {
		name = "NoSignal",
		text = "PAS DE SIGNAL",
		color = Theme.Color.TextDisabled,
		font = Theme.Font.Mono,
		size = Theme.TextSize.Small,
		align = Enum.TextXAlignment.Center,
		size2 = UDim2.fromScale(1, 1),
		zIndex = 2,
	}
	noSignal.Parent = viewport

	local previewFrame = Widgets.Panel {
		name = "PreviewFrame",
		size = UDim2.new(1, -SIDEBAR_WIDTH - Theme.Space.MD * 3, 1, -FOOTER_HEIGHT - Theme.Space.MD * 3),
		position = UDim2.fromOffset(SIDEBAR_WIDTH + Theme.Space.MD * 2, Theme.Space.MD),
		color = Color3.new(0, 0, 0),
		radius = Theme.Radius.Small,
		stroke = Theme.Color.Border,
		clip = true,

		viewport,
	}

	-- ── Barre latérale : scènes puis sources.
	local scenesList = Widgets.Scroll {
		name = "Scenes",
		size = UDim2.new(1, 0, 0, 120),
		position = UDim2.fromOffset(0, 22),
		gap = 2,
	}

	local sourcesList = Widgets.Scroll {
		name = "Sources",
		size = UDim2.new(1, 0, 1, -172),
		position = UDim2.fromOffset(0, 172),
		gap = 2,
	}

	local sidebar = Widgets.Panel {
		name = "Sidebar",
		size = UDim2.new(0, SIDEBAR_WIDTH, 1, -FOOTER_HEIGHT - Theme.Space.MD * 2),
		position = UDim2.fromOffset(Theme.Space.MD, Theme.Space.MD),
		color = Theme.Color.SurfaceRaised,
		radius = Theme.Radius.Small,
		padding = Theme.Space.SM,
		clip = true,

		Widgets.Text {
			text = "SCÈNES",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 18),
		},
		scenesList,

		Widgets.Text {
			text = "SOURCES",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 18),
			position = UDim2.fromOffset(0, 150),
		},
		sourcesList,
	}

	-- ── Pied de page : l'état du direct et le gros bouton.
	local durationStat = statBlock("DURÉE", "00:00:00", 1)
	local viewersStat = statBlock("VIEWERS", "0", 2)
	local bitrateStat = statBlock("DÉBIT", "— kb/s", 3)
	local droppedStat = statBlock("PERDUES", "0 %", 4)

	local liveButton = Widgets.Button {
		name = "GoLive",
		text = "PASSER EN DIRECT",
		variant = "live",
		font = Theme.Font.Bold,
		textSize = Theme.TextSize.Small,
		size = UDim2.fromOffset(180, 40),
		position = UDim2.new(1, 0, 0.5, 0),
		anchor = Vector2.new(1, 0.5),
		onClick = function()
			api.request("stream/toggle", {})
		end,
	}

	local footer = Widgets.Panel {
		name = "Footer",
		size = UDim2.new(1, -Theme.Space.MD * 2, 0, FOOTER_HEIGHT),
		position = UDim2.new(0, Theme.Space.MD, 1, -FOOTER_HEIGHT - Theme.Space.MD),
		color = Theme.Color.SurfaceRaised,
		radius = Theme.Radius.Small,
		padding = Theme.Space.MD,

		Widgets.Panel {
			name = "Stats",
			size = UDim2.new(1, -190, 1, 0),
			transparency = 1,
			list = { direction = Enum.FillDirection.Horizontal, gap = Theme.Space.LG },

			durationStat,
			viewersStat,
			bitrateStat,
			droppedStat,
		},

		liveButton,
	}

	local root = Widgets.Panel {
		name = "StudioRoot",
		color = Theme.Color.Desktop,

		sidebar,
		previewFrame,
		footer,
	}
	root.Parent = container
	trove:Add(root)

	-- ── Rendu réactif : on redessine quand l'état du joueur change.
	local function renderScenes()
		for _, child in ipairs(scenesList:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		local scenes = api.state.scenes or { { id = "main", name = "Scène principale" } }
		local activeId = api.state.activeSceneId or scenes[1] and scenes[1].id

		for index, scene in ipairs(scenes) do
			Widgets.ListRow {
				height = 30,
				order = index,
				selected = scene.id == activeId,
				onClick = function()
					api.request("stream/setScene", { sceneId = scene.id })
				end,

				Widgets.Text {
					text = scene.name,
					size = Theme.TextSize.Small,
					size2 = UDim2.fromScale(1, 1),
					truncate = true,
				},
			}.Parent = scenesList
		end
	end

	local function renderSources()
		for _, child in ipairs(sourcesList:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		local sources = api.state.sources or {}

		if #sources == 0 then
			-- Pas un bug : le joueur n'a encore rien branché.
			Widgets.Text {
				text = "Aucune source.\nBranche du matériel dans ta pièce.",
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Tiny,
				wrapped = true,
				size2 = UDim2.new(1, 0, 0, 40),
			}.Parent = sourcesList
			return
		end

		for index, source in ipairs(sources) do
			sourceRow(source, index).Parent = sourcesList
		end
	end

	local function renderLiveState()
		local live = api.state.isLive == true

		liveButton.Text = live and "ARRÊTER LE DIRECT" or "PASSER EN DIRECT"
		noSignal.Visible = not live
		noSignal.Text = live and "" or "PAS DE SIGNAL"

		local viewers = api.state.viewers or 0
		viewersStat:FindFirstChild("Value").Text = tostring(viewers)

		local elapsed = api.state.streamElapsed or 0
		viewersStat:FindFirstChild("Value").TextColor3 = live and Theme.Color.Text or Theme.Color.TextDisabled
		durationStat:FindFirstChild("Value").Text = string.format(
			"%02d:%02d:%02d",
			math.floor(elapsed / 3600),
			math.floor(elapsed / 60) % 60,
			math.floor(elapsed) % 60
		)

		bitrateStat:FindFirstChild("Value").Text = live and string.format("%d kb/s", api.state.bitrate or 0) or "— kb/s"
		droppedStat:FindFirstChild("Value").Text = string.format("%d %%", math.round((api.state.droppedFrames or 0) * 100))
		droppedStat:FindFirstChild("Value").TextColor3 = (api.state.droppedFrames or 0) > 0.05 and Theme.Color.Warning
			or Theme.Color.Text
	end

	--- Les compteurs du direct changent chaque seconde ; les listes non.
	--- On sépare les deux, sinon les lignes seraient détruites et
	--- recréées sous le curseur en permanence.
	local function listSignature(): string
		local parts = { tostring(api.state.activeSceneId) }
		for _, source in ipairs(api.state.sources or {}) do
			table.insert(parts, string.format("%s:%s", source.id, tostring(source.connected)))
		end
		for _, scene in ipairs(api.state.scenes or {}) do
			table.insert(parts, scene.id)
		end
		return table.concat(parts, ",")
	end

	local lastLists = listSignature()

	renderScenes()
	renderSources()
	renderLiveState()

	trove:Add(api.stateChanged:Connect(function()
		local current = listSignature()
		if current ~= lastLists then
			lastLists = current
			renderScenes()
			renderSources()
		end
		renderLiveState()
	end))

	return function()
		trove:Clean()
	end
end

return Studio
