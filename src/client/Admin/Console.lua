--!strict
--[[
	Console — les outils de test, ouverts par F4.

	C'est la seule interface flottante du jeu, et c'est assumé : elle n'est
	pas destinée au joueur. Elle est accessible partout, y compris debout au
	milieu de la pièce, précisément pour tester le mode construction et les
	lumières sans faire l'aller-retour jusqu'au bureau.

	Le serveur refuse toutes ces routes si Config/Dev.AdminEnabled est faux.
	Masquer ce panneau ne protégerait rien.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Catalogue = require(Shared.Config.Catalogue)

local player = Players.LocalPlayer

local Console = {}
Console.__index = Console

local WIDTH = 560
local HEADER = 44

local ACCENT = Color3.fromRGB(232, 84, 84)

--- Une ligne de boutons courts, chacun déclenchant une action immédiate.
local function actionRow(label: string, buttons: { { text: string, action: () -> () } }, order: number)
	local row = Widgets.Panel {
		name = label,
		size = UDim2.new(1, 0, 0, 46),
		color = Theme.Color.Surface,
		transparency = 1,
		order = order,

		Widgets.Text {
			text = string.upper(label),
			color = Theme.Color.TextDisabled,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 14),
		},
	}

	local strip = Widgets.Panel {
		name = "Buttons",
		size = UDim2.new(1, 0, 0, 28),
		position = UDim2.fromOffset(0, 16),
		transparency = 1,
		list = { direction = Enum.FillDirection.Horizontal, gap = 4 },
	}
	strip.Parent = row

	for index, button in ipairs(buttons) do
		Widgets.Button {
			text = button.text,
			variant = "ghost",
			textSize = Theme.TextSize.Tiny,
			size = UDim2.fromOffset(86, 26),
			order = index,
			onClick = button.action,
		}.Parent = strip
	end

	return row
end

function Console.new(api)
	local self = setmetatable({}, Console)

	self._trove = Trove.new()
	self.api = api
	self.visible = false

	self:_build()

	self._trove:Add(UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then
			return
		end
		if input.KeyCode == Enum.KeyCode.F4 then
			self:Toggle()
		end
	end))

	return self
end

function Console:_build()
	local api = self.api

	local function set(payload)
		api.request("admin/set", payload)
	end

	-- ── Contenu ───────────────────────────────────────────────────────────

	local content = Widgets.Scroll {
		name = "Content",
		size = UDim2.new(1, 0, 1, -HEADER),
		position = UDim2.fromOffset(0, HEADER),
		padding = Theme.Space.MD,
		gap = Theme.Space.SM,
	}

	self.statusLabel = Widgets.Text {
		name = "Status",
		text = "",
		color = Theme.Color.TextMuted,
		font = Theme.Font.Mono,
		size = Theme.TextSize.Tiny,
		size2 = UDim2.new(1, 0, 0, 30),
		wrapped = true,
		order = 0,
		alignY = Enum.TextYAlignment.Top,
	}
	self.statusLabel.Parent = content

	actionRow("argent", {
		{ text = "+ 100 €", action = function() set({ addMoney = 100 }) end },
		{ text = "+ 1 000 €", action = function() set({ addMoney = 1000 }) end },
		{ text = "+ 10 000 €", action = function() set({ addMoney = 10000 }) end },
		{ text = "remise à 0", action = function() set({ money = 0 }) end },
	}, 1).Parent = content

	actionRow("temps", {
		{ text = "jour + 1", action = function() set({ day = (api.state.day or 1) + 1 }) end },
		{ text = "matin", action = function() set({ clockMinutes = 8 * 60 }) end },
		{ text = "soir", action = function() set({ clockMinutes = 21 * 60 }) end },
		{ text = "nuit", action = function() set({ clockMinutes = 3 * 60 }) end },
	}, 2).Parent = content

	actionRow("vitesse du temps", {
		{ text = "pause", action = function() api.request("time/setScale", { scale = 0 }) end },
		{ text = "x1", action = function() api.request("time/setScale", { scale = 1 }) end },
		{ text = "x4", action = function() api.request("time/setScale", { scale = 4 }) end },
		{ text = "x10", action = function() api.request("time/setScale", { scale = 10 }) end },
	}, 3).Parent = content

	actionRow("énergie", {
		{ text = "épuisé", action = function() set({ energy = 5 }) end },
		{ text = "moyen", action = function() set({ energy = 50 }) end },
		{ text = "en forme", action = function() set({ energy = 100 }) end },
	}, 4).Parent = content

	actionRow("progression", {
		{ text = "3 lives", action = function() set({ streamsCompleted = 3 }) end },
		{ text = "1 employé", action = function() set({ employees = 1 }) end },
		{ text = "local", action = function() set({ venueTier = 3 }) end },
		{ text = "tout", action = function()
			set({ streamsCompleted = 20, employees = 4, venueTier = 4, subscribers = 25000 })
		end },
	}, 5).Parent = content

	actionRow("systèmes", {
		{ text = "livrer tout", action = function() api.request("admin/deliver") end },
		{ text = "vider pièce", action = function() api.request("admin/clearRoom") end },
		{ text = "coupure", action = function() set({ blackout = 25 }) end },
		{ text = "rétablir", action = function() set({ blackout = 0 }) end },
	}, 6).Parent = content

	actionRow("direct", {
		{ text = "démarrer", action = function()
			if not api.state.isLive then
				api.request("stream/toggle")
			end
		end },
		{ text = "arrêter", action = function()
			if api.state.isLive then
				api.request("stream/toggle")
			end
		end },
	}, 7).Parent = content

	-- ── Donner un objet ───────────────────────────────────────────────────

	local filterBox = Create("TextBox") {
		Name = "Filter",
		Size = UDim2.new(1, 0, 0, 28),
		BackgroundColor3 = Theme.Color.Desktop,
		BorderSizePixel = 0,
		Text = "",
		PlaceholderText = "filtrer le catalogue…",
		PlaceholderColor3 = Theme.Color.TextDisabled,
		TextColor3 = Theme.Color.Text,
		FontFace = Theme.Font.Mono,
		TextSize = Theme.TextSize.Small,
		TextXAlignment = Enum.TextXAlignment.Left,
		ClearTextOnFocus = false,
		LayoutOrder = 8,

		Create("UICorner") { CornerRadius = Theme.Radius.Small },
		Create("UIPadding") { PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10) },
	}
	filterBox.Parent = content

	local itemList = Widgets.Panel {
		name = "Items",
		size = UDim2.new(1, 0, 0, 0),
		transparency = 1,
		order = 9,
		list = { gap = 2 },
	}
	itemList.AutomaticSize = Enum.AutomaticSize.Y
	itemList.Parent = content

	local function renderItems()
		for _, child in ipairs(itemList:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		local needle = string.lower(filterBox.Text)
		local shown = 0

		for index, item in ipairs(Catalogue.All()) do
			local haystack = string.lower(item.id .. " " .. item.name .. " " .. item.brand .. " " .. item.family)
			if needle == "" or string.find(haystack, needle, 1, true) then
				shown += 1
				if shown > 40 then
					break
				end

				Widgets.ListRow {
					height = 26,
					order = index,
					onClick = function()
						api.request("admin/give", { itemId = item.id })
					end,

					Widgets.Text {
						text = string.format("%s   ·   %s", item.name, item.id),
						color = Theme.Color.TextMuted,
						font = Theme.Font.Mono,
						size = Theme.TextSize.Tiny,
						size2 = UDim2.fromScale(1, 1),
						truncate = true,
					},
				}.Parent = itemList
			end
		end
	end

	self._trove:Add(filterBox:GetPropertyChangedSignal("Text"):Connect(renderItems))
	renderItems()

	-- ── Cadre ─────────────────────────────────────────────────────────────

	local closeButton = Widgets.Button {
		text = "F4",
		variant = "ghost",
		textSize = Theme.TextSize.Tiny,
		size = UDim2.fromOffset(40, 26),
		position = UDim2.new(1, -50, 0, 9),
		onClick = function()
			self:Toggle()
		end,
	}

	self.frame = Widgets.Panel {
		name = "AdminConsole",
		size = UDim2.new(0, WIDTH, 1, -80),
		position = UDim2.fromOffset(24, 40),
		color = Theme.Color.Surface,
		radius = Theme.Radius.Medium,
		stroke = ACCENT,
		clip = true,

		Widgets.Panel {
			name = "Header",
			size = UDim2.new(1, 0, 0, HEADER),
			color = Theme.Color.SurfaceRaised,

			Create("Frame") {
				Name = "Stripe",
				Size = UDim2.new(1, 0, 0, 3),
				BackgroundColor3 = ACCENT,
				BorderSizePixel = 0,
			},
			Widgets.Text {
				text = "CONSOLE DE TEST",
				color = ACCENT,
				font = Theme.Font.Bold,
				size = Theme.TextSize.Small,
				size2 = UDim2.new(1, -70, 1, 0),
				position = UDim2.fromOffset(Theme.Space.LG, 0),
			},
			closeButton,
		},

		content,
	}

	self.gui = Create("ScreenGui") {
		Name = "KZAdmin",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		DisplayOrder = 500,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		Enabled = false,

		self.frame,
	}
	self.gui.Parent = player:WaitForChild("PlayerGui")
	self._trove:Add(self.gui)

	self._trove:Add(self.api.stateChanged:Connect(function()
		self:_refreshStatus()
	end))
	self:_refreshStatus()
end

function Console:_refreshStatus()
	local state = self.api.state
	local power = state.power or {}
	local image = state.image or {}

	self.statusLabel.Text = string.format(
		"jour %d  ·  %02d:%02d  ·  %d €  ·  énergie %d%%\n%d W / %d W  ·  %d/%d prises  ·  image %d%%  ·  %s",
		math.floor(state.day or 1),
		math.floor((state.clockMinutes or 0) / 60) % 24,
		math.floor(state.clockMinutes or 0) % 60,
		math.floor(state.money or 0),
		math.floor(state.energy or 0),
		math.floor(power.load or 0),
		math.floor(power.capacity or 0),
		math.floor(power.socketsUsed or 0),
		math.floor(power.socketsTotal or 0),
		math.floor((image.total or 0) * 100),
		state.isLive and "EN DIRECT" or "hors ligne"
	)
end

function Console:Toggle()
	self.visible = not self.visible
	self.gui.Enabled = self.visible

	if self.visible then
		UserInputService.MouseIconEnabled = true
	end
end

function Console:Destroy()
	self._trove:Clean()
end

return Console
