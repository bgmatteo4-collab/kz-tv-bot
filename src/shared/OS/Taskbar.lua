--!strict
--[[
	Taskbar — la barre des tâches.

	À gauche le menu, au centre les apps débloquées, à droite l'horloge et
	les indicateurs. La barre est le seul endroit de l'OS qui reste visible
	en permanence : c'est donc elle qui porte l'information vitale (es-tu en
	direct ? quelle heure est-il en jeu ?), puisqu'on s'est interdit tout
	HUD flottant.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(script.Parent.Theme)
local Widgets = require(script.Parent.Widgets)
local AppRegistry = require(script.Parent.AppRegistry)

local Taskbar = {}
Taskbar.__index = Taskbar

local BUTTON_SIZE = 36

function Taskbar.new(os)
	local self = setmetatable({}, Taskbar)

	self._trove = Trove.new()
	self.os = os
	self._buttons = {}

	self:_build()
	self:Refresh()

	return self
end

function Taskbar:_build()
	self.appContainer = Widgets.Panel {
		name = "Apps",
		size = UDim2.new(1, -320, 1, 0),
		position = UDim2.fromOffset(150, 0),
		transparency = 1,
		list = { direction = Enum.FillDirection.Horizontal, gap = Theme.Space.XS, alignY = Enum.VerticalAlignment.Center },
	}

	self.clockLabel = Widgets.Text {
		name = "Clock",
		text = "--:--",
		font = Theme.Font.Mono,
		size = Theme.TextSize.Small,
		align = Enum.TextXAlignment.Right,
		size2 = UDim2.new(0, 70, 1, 0),
		position = UDim2.new(1, -Theme.Space.MD - 70, 0, 0),
	}

	self.dayLabel = Widgets.Text {
		name = "Day",
		text = "jour 1",
		color = Theme.Color.TextDisabled,
		size = Theme.TextSize.Tiny,
		align = Enum.TextXAlignment.Right,
		size2 = UDim2.new(0, 70, 1, 0),
		position = UDim2.new(1, -Theme.Space.MD - 150, 0, 0),
	}

	-- Le voyant "EN DIRECT". Il pulse : un élément statique se fait oublier,
	-- et oublier qu'on est en direct doit rester possible mais coûteux.
	self.liveDot = Create("Frame") {
		Name = "LiveDot",
		Size = UDim2.fromOffset(8, 8),
		Position = UDim2.fromOffset(0, 0),
		AnchorPoint = Vector2.new(0, 0.5),
		BackgroundColor3 = Theme.Color.Live,
		BorderSizePixel = 0,
		Create("UICorner") { CornerRadius = Theme.Radius.Pill },
	}

	self.liveBadge = Widgets.Panel {
		name = "LiveBadge",
		size = UDim2.fromOffset(96, 24),
		position = UDim2.new(1, -Theme.Space.MD - 230, 0.5, 0),
		anchor = Vector2.new(0, 0.5),
		color = Theme.Color.SurfaceOverlay,
		radius = Theme.Radius.Small,
		padding = Theme.Space.SM,

		self.liveDot,
		Widgets.Text {
			text = "EN DIRECT",
			color = Theme.Color.Live,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, -14, 1, 0),
			position = UDim2.fromOffset(14, 0),
		},
	}
	self.liveBadge.Visible = false

	self.frame = Widgets.Panel {
		name = "Taskbar",
		size = UDim2.new(1, 0, 0, Theme.Layout.TaskbarHeight),
		position = UDim2.new(0, 0, 1, 0),
		anchor = Vector2.new(0, 1),
		color = Theme.Color.SurfaceRaised,
		zIndex = Theme.ZIndex.Taskbar,

		Widgets.Text {
			name = "Brand",
			text = Theme.Name,
			color = Theme.Color.TextMuted,
			font = Theme.Font.Bold,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(0, 120, 1, 0),
			position = UDim2.fromOffset(Theme.Space.LG, 0),
		},

		self.appContainer,
		self.liveBadge,
		self.dayLabel,
		self.clockLabel,
	}

	-- Un liseré clair sur l'arête haute : sépare la barre du bureau sans
	-- dessiner une ligne franche, qui ferait "site web" plutôt qu'OS.
	Create("Frame") {
		Name = "TopEdge",
		Size = UDim2.new(1, 0, 0, 1),
		BackgroundColor3 = Theme.Color.Border,
		BorderSizePixel = 0,
		ZIndex = Theme.ZIndex.Taskbar + 1,
	}.Parent = self.frame

	self._trove:Add(self.frame)
	self._trove:Add(self:_startLivePulse())
end

function Taskbar:_startLivePulse()
	local running = true

	task.spawn(function()
		while running do
			if self.liveBadge.Visible then
				TweenService:Create(self.liveDot, TweenInfo.new(0.6), { BackgroundTransparency = 0.6 }):Play()
				task.wait(0.7)
				TweenService:Create(self.liveDot, TweenInfo.new(0.6), { BackgroundTransparency = 0 }):Play()
				task.wait(0.7)
			else
				task.wait(0.5)
			end
		end
	end)

	return function()
		running = false
	end
end

--- Un bouton d'app dans la barre. Le liseré du bas indique qu'elle tourne.
function Taskbar:_createAppButton(app, order: number)
	local indicator = Create("Frame") {
		Name = "Running",
		Size = UDim2.fromOffset(16, 2),
		Position = UDim2.new(0.5, 0, 1, -3),
		AnchorPoint = Vector2.new(0.5, 1),
		BackgroundColor3 = app.accent or Theme.Color.Accent,
		BorderSizePixel = 0,
		Visible = false,
		ZIndex = Theme.ZIndex.Taskbar + 2,
		Create("UICorner") { CornerRadius = Theme.Radius.Pill },
	}

	local button = Widgets.Button {
		name = app.id,
		text = app.glyph,
		variant = "ghost",
		textSize = Theme.TextSize.Title,
		size = UDim2.fromOffset(BUTTON_SIZE, BUTTON_SIZE),
		order = order,
		radius = Theme.Radius.Small,
		onClick = function()
			self.os:ToggleApp(app.id)
		end,
	}
	button.BackgroundTransparency = 1
	button.ZIndex = Theme.ZIndex.Taskbar + 1
	indicator.Parent = button

	return button, indicator
end

--- Reconstruit la barre : appelé quand une app se débloque.
function Taskbar:Refresh()
	for _, entry in pairs(self._buttons) do
		entry.button:Destroy()
	end
	table.clear(self._buttons)

	for index, app in ipairs(AppRegistry.GetUnlocked(self.os.state)) do
		local button, indicator = self:_createAppButton(app, index)
		button.Parent = self.appContainer
		self._buttons[app.id] = { button = button, indicator = indicator }
	end

	self:UpdateRunningIndicators()
end

function Taskbar:UpdateRunningIndicators()
	for id, entry in pairs(self._buttons) do
		local window = self.os.windows:GetWindow(id)
		entry.indicator.Visible = window ~= nil
		entry.indicator.BackgroundTransparency = (window and not window.minimized) and 0 or 0.55
	end
end

function Taskbar:SetClock(text: string, day: number)
	self.clockLabel.Text = text
	self.dayLabel.Text = string.format("jour %d", day)
end

function Taskbar:SetLive(live: boolean)
	self.liveBadge.Visible = live
end

function Taskbar:Destroy()
	self._trove:Clean()
end

return Taskbar
