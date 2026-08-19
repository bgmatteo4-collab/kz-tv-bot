--!strict
--[[
	Régie — le pilotage d'une émission multi-caméras.

	MAQUETTE. Rien n'est branché sur la simulation : couper une caméra ne
	change encore rien à l'audience. Mais le vocabulaire, la disposition et
	le geste sont ceux du jeu fini, et les deux grands écrans montrent un
	VRAI rendu 3D de la pièce depuis chaque angle.

	Le principe d'une régie tient en deux écrans. PROGRAMME, c'est ce qui
	part à l'antenne à cet instant. PRÉPARATION, c'est le plan suivant, que
	l'on cadre tranquillement pendant que l'autre est diffusé. Couper, c'est
	échanger les deux. C'est tout le métier, et c'est ce qui le rend tendu :
	on ne peut préparer qu'un seul plan à la fois.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Rundown = require(Shared.Content.Rundown)

local Control = {}

local MULTIVIEW_WIDTH = 210
local RUNDOWN_WIDTH = 230
local TRANSITION_HEIGHT = 74

local TALLY_LIVE = Color3.fromRGB(255, 61, 61)
local TALLY_PREVIEW = Color3.fromRGB(74, 201, 126)

--- Les angles proposés. Ils sont calculés autour du sujet plutôt que posés
--- en dur : le jour où le joueur aura plusieurs vraies caméras dans la
--- pièce, seule cette fonction changera.
local function buildAngles(subject: Vector3): { any }
	return {
		{
			id = "cam1",
			label = "CAM 1",
			name = "Face",
			cframe = CFrame.lookAt(subject + Vector3.new(0, 0.2, 3.6), subject),
			fov = 40,
		},
		{
			id = "cam2",
			label = "CAM 2",
			name = "Plan large",
			cframe = CFrame.lookAt(subject + Vector3.new(1.6, 2.4, 7.5), subject),
			fov = 55,
		},
		{
			id = "cam3",
			label = "CAM 3",
			name = "Profil",
			cframe = CFrame.lookAt(subject + Vector3.new(4.2, 0.6, 2.2), subject),
			fov = 42,
		},
		{
			id = "cam4",
			label = "CAM 4",
			name = "Plongée",
			cframe = CFrame.lookAt(subject + Vector3.new(-1.2, 4.2, 3.2), subject),
			fov = 48,
		},
	}
end

--- Un retour caméra : un ViewportFrame contenant une copie du décor.
---
--- Un ViewportFrame ne peut pas filmer le monde réel, il ne rend que ses
--- propres enfants. On duplique donc le décor à l'ouverture de l'app. C'est
--- coûteux, d'où une copie allégée pour les petites vignettes.
local function buildFeed(angle, full: boolean): ViewportFrame
	local viewport = Create("ViewportFrame") {
		Name = angle.id,
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.fromRGB(6, 7, 9),
		BorderSizePixel = 0,
		Ambient = Color3.fromRGB(120, 120, 132),
		LightColor = Color3.fromRGB(255, 248, 236),
		LightDirection = Vector3.new(-0.4, -1, -0.5),
	}

	local world = Instance.new("WorldModel")
	world.Parent = viewport

	local function copy(source: Instance?)
		if not source then
			return
		end
		local clone = source:Clone()
		for _, descendant in ipairs(clone:GetDescendants()) do
			if descendant:IsA("ProximityPrompt") or descendant:IsA("Sound") then
				descendant:Destroy()
			end
		end
		clone.Parent = world
	end

	copy(workspace:FindFirstChild("PlacedItems"))
	if full then
		copy(workspace:FindFirstChild("DevRoom"))
	end

	local camera = Instance.new("Camera")
	camera.FieldOfView = angle.fov
	camera.CFrame = angle.cframe
	camera.Parent = viewport
	viewport.CurrentCamera = camera

	return viewport
end

local function tallyBadge(text: string, color: Color3)
	return Create("Frame") {
		Name = "Tally",
		Size = UDim2.fromOffset(52, 16),
		Position = UDim2.fromOffset(6, 6),
		BackgroundColor3 = color,
		BorderSizePixel = 0,
		ZIndex = 5,

		Create("UICorner") { CornerRadius = UDim.new(0, 2) },
		Widgets.Text {
			text = text,
			color = Color3.new(1, 1, 1),
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			align = Enum.TextXAlignment.Center,
			size2 = UDim2.fromScale(1, 1),
			zIndex = 6,
		},
	}
end

function Control.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	-- Le sujet : le siège du joueur, à hauteur de visage. Sans siège posé,
	-- on vise le centre de la pièce.
	local subject = Vector3.new(0, 3.8, -2.9)
	for _, entry in ipairs(api.state.placed or {}) do
		if entry.itemId == "chair_kitchen" or entry.itemId == "chair_gaming" or entry.itemId == "chair_ergonomic" then
			subject = Vector3.new(entry.x, entry.y + 2.2, entry.z)
			break
		end
	end

	local angles = buildAngles(subject)
	local programIndex, previewIndex = 1, 2

	local programSlot = Widgets.Panel {
		name = "ProgramSlot",
		size = UDim2.new(0.5, -6, 1, 0),
		position = UDim2.new(0.5, 6, 0, 0),
		color = Color3.fromRGB(6, 7, 9),
		clip = true,
	}

	local previewSlot = Widgets.Panel {
		name = "PreviewSlot",
		size = UDim2.new(0.5, -6, 1, 0),
		color = Color3.fromRGB(6, 7, 9),
		clip = true,
	}

	local fadeOverlay = Create("Frame") {
		Name = "Fade",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ZIndex = 8,
	}
	fadeOverlay.Parent = programSlot

	local multiviewSlots = {}
	local statusLabel

	local function renderBuses()
		for _, slot in ipairs({ programSlot, previewSlot }) do
			for _, child in ipairs(slot:GetChildren()) do
				if child:IsA("ViewportFrame") or child.Name == "Label" then
					child:Destroy()
				end
			end
		end

		local program = angles[programIndex]
		local preview = angles[previewIndex]

		buildFeed(program, true).Parent = programSlot
		buildFeed(preview, true).Parent = previewSlot

		tallyBadge("ANTENNE", TALLY_LIVE).Parent = programSlot
		tallyBadge("PRÉPA", TALLY_PREVIEW).Parent = previewSlot

		Widgets.Text {
			name = "Label",
			text = string.format("%s — %s", program.label, program.name),
			color = Color3.fromRGB(230, 232, 238),
			font = Theme.Font.Bold,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -16, 0, 18),
			position = UDim2.new(0, 8, 1, -22),
			zIndex = 5,
		}.Parent = programSlot

		Widgets.Text {
			name = "Label",
			text = string.format("%s — %s", preview.label, preview.name),
			color = Color3.fromRGB(230, 232, 238),
			font = Theme.Font.Bold,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -16, 0, 18),
			position = UDim2.new(0, 8, 1, -22),
			zIndex = 5,
		}.Parent = previewSlot

		fadeOverlay.Parent = programSlot

		for index, slot in ipairs(multiviewSlots) do
			local stroke = slot:FindFirstChildOfClass("UIStroke")
			if stroke then
				stroke.Color = index == programIndex and TALLY_LIVE
					or (index == previewIndex and TALLY_PREVIEW or Theme.Color.Border)
				stroke.Thickness = (index == programIndex or index == previewIndex) and 2 or 1
			end
		end

		if statusLabel then
			statusLabel.Text = string.format(
				"ANTENNE %s  ·  PRÉPA %s  ·  maquette, aucun effet sur l'audience",
				program.label,
				preview.label
			)
		end
	end

	local function cut()
		programIndex, previewIndex = previewIndex, programIndex
		renderBuses()
	end

	local function fade()
		local toBlack = TweenService:Create(fadeOverlay, TweenInfo.new(0.35), { BackgroundTransparency = 0 })
		toBlack:Play()
		toBlack.Completed:Wait()

		programIndex, previewIndex = previewIndex, programIndex
		renderBuses()

		TweenService:Create(fadeOverlay, TweenInfo.new(0.45), { BackgroundTransparency = 1 }):Play()
	end

	-- ── Mur de retours ────────────────────────────────────────────────────

	local multiview = Widgets.Panel {
		name = "Multiview",
		size = UDim2.new(0, MULTIVIEW_WIDTH, 1, 0),
		color = Theme.Color.Desktop,
		padding = Theme.Space.SM,
		list = { gap = Theme.Space.SM },
	}

	for index, angle in ipairs(angles) do
		local slot = Widgets.Panel {
			name = angle.id,
			size = UDim2.new(1, 0, 0, 108),
			color = Color3.fromRGB(6, 7, 9),
			radius = Theme.Radius.Small,
			stroke = Theme.Color.Border,
			clip = true,
			order = index,
		}

		buildFeed(angle, false).Parent = slot

		Widgets.Text {
			text = string.format("%s  %s", angle.label, angle.name),
			color = Color3.fromRGB(226, 230, 238),
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -12, 0, 16),
			position = UDim2.new(0, 6, 1, -18),
			zIndex = 5,
		}.Parent = slot

		local hit = Create("TextButton") {
			Name = "Hit",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			Text = "",
			ZIndex = 7,
		}
		hit.MouseButton1Click:Connect(function()
			if index ~= programIndex then
				previewIndex = index
				renderBuses()
			end
		end)
		hit.Parent = slot

		multiviewSlots[index] = slot
		slot.Parent = multiview
	end

	-- ── Conducteur ────────────────────────────────────────────────────────

	local rundownList = Widgets.Scroll {
		name = "Rundown",
		size = UDim2.new(1, 0, 1, -30),
		position = UDim2.fromOffset(0, 30),
		padding = Theme.Space.SM,
		gap = 3,
	}

	local rundownPanel = Widgets.Panel {
		name = "RundownPanel",
		size = UDim2.new(0, RUNDOWN_WIDTH, 1, 0),
		position = UDim2.new(1, -RUNDOWN_WIDTH, 0, 0),
		color = Theme.Color.Surface,

		Widgets.Text {
			text = "CONDUCTEUR",
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 30),
			position = UDim2.fromOffset(Theme.Space.MD, 0),
		},
		rundownList,
	}

	local show = Rundown.Example
	local elapsed = 0

	for index, segment in ipairs(show.segments) do
		Widgets.Panel {
			name = segment.name,
			size = UDim2.new(1, 0, 0, 40),
			color = index == 2 and Theme.Color.SurfaceOverlay or Theme.Color.SurfaceRaised,
			radius = Theme.Radius.Small,
			padding = Theme.Space.SM,
			order = index,

			Create("Frame") {
				Name = "Bar",
				Size = UDim2.fromOffset(3, 24),
				Position = UDim2.fromOffset(-4, 0),
				BackgroundColor3 = Rundown.KindColor[segment.kind] or Theme.Color.Border,
				BorderSizePixel = 0,
			},
			Widgets.Text {
				text = segment.name,
				color = index == 2 and Theme.Color.Text or Theme.Color.TextMuted,
				font = Theme.Font.Medium,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, -46, 0, 14),
				position = UDim2.fromOffset(6, 0),
				truncate = true,
			},
			Widgets.Text {
				text = string.format("%d min", segment.minutes),
				color = Theme.Color.TextDisabled,
				font = Theme.Font.Mono,
				size = Theme.TextSize.Tiny,
				align = Enum.TextXAlignment.Right,
				size2 = UDim2.new(0, 44, 0, 14),
				position = UDim2.new(1, -44, 0, 0),
			},
			Widgets.Text {
				text = index == 2 and "À L'ANTENNE" or string.format("+%d min", elapsed),
				color = index == 2 and Theme.Color.Live or Theme.Color.TextDisabled,
				font = Theme.Font.Mono,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, -12, 0, 12),
				position = UDim2.fromOffset(6, 16),
			},
		}.Parent = rundownList

		elapsed += segment.minutes
	end

	-- ── Barre de transition ───────────────────────────────────────────────

	statusLabel = Widgets.Text {
		name = "Status",
		text = "",
		color = Theme.Color.TextDisabled,
		font = Theme.Font.Mono,
		size = Theme.TextSize.Tiny,
		size2 = UDim2.new(1, -320, 0, 16),
		position = UDim2.fromOffset(0, 30),
		truncate = true,
	}

	local transitionBar = Widgets.Panel {
		name = "Transition",
		size = UDim2.new(1, -MULTIVIEW_WIDTH - RUNDOWN_WIDTH, 0, TRANSITION_HEIGHT),
		position = UDim2.new(0, MULTIVIEW_WIDTH, 1, -TRANSITION_HEIGHT),
		color = Theme.Color.SurfaceRaised,
		padding = Theme.Space.MD,

		Widgets.Button {
			name = "Cut",
			text = "COUPER",
			variant = "live",
			font = Theme.Font.Bold,
			size = UDim2.fromOffset(140, 40),
			onClick = cut,
		},
		Widgets.Button {
			name = "Fade",
			text = "FONDU",
			variant = "ghost",
			font = Theme.Font.Bold,
			size = UDim2.fromOffset(120, 40),
			position = UDim2.fromOffset(148, 0),
			onClick = function()
				task.spawn(fade)
			end,
		},
		statusLabel,
	}
	statusLabel.Position = UDim2.fromOffset(280, 12)
	statusLabel.Size = UDim2.new(1, -300, 0, 16)

	-- ── Assemblage ────────────────────────────────────────────────────────

	local buses = Widgets.Panel {
		name = "Buses",
		size = UDim2.new(1, -MULTIVIEW_WIDTH - RUNDOWN_WIDTH - Theme.Space.MD * 2, 1, -TRANSITION_HEIGHT - Theme.Space.MD),
		position = UDim2.fromOffset(MULTIVIEW_WIDTH + Theme.Space.MD, Theme.Space.MD),
		transparency = 1,

		previewSlot,
		programSlot,
	}

	for _, slot in ipairs({ previewSlot, programSlot }) do
		Create("UICorner") { CornerRadius = Theme.Radius.Small }.Parent = slot
		Create("UIStroke") { Color = Theme.Color.Border, Thickness = 1 }.Parent = slot
	end

	local root = Widgets.Panel {
		name = "ControlRoot",
		color = Theme.Color.Desktop,

		multiview,
		buses,
		transitionBar,
		rundownPanel,
	}
	root.Parent = container
	trove:Add(root)

	renderBuses()

	return function()
		trove:Clean()
	end
end

return Control
