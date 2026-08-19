--!strict
--[[
	DesktopIcons — les raccourcis posés sur le bureau.

	La barre des tâches ne suffisait pas : ses boutons étaient de simples
	caractères Unicode sur un fond transparent, donc invisibles dès que la
	police ne contient pas le glyphe. On ne lançait plus rien.

	Ici une icône est une tuile pleine et colorée avec un monogramme en
	lettres normales. Ça se voit de loin sur une dalle 3D, ça ne dépend
	d'aucun caractère exotique, et c'est de toute façon ce qu'on attend
	d'un bureau.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(script.Parent.Theme)
local AppRegistry = require(script.Parent.AppRegistry)

local DesktopIcons = {}
DesktopIcons.__index = DesktopIcons

local TILE = 58
local CELL_WIDTH = 92
local CELL_HEIGHT = 96
local MARGIN = 20

function DesktopIcons.new(os)
	local self = setmetatable({}, DesktopIcons)

	self._trove = Trove.new()
	self.os = os

	self.frame = Create("Frame") {
		Name = "DesktopIcons",
		Size = UDim2.new(0, CELL_WIDTH * 2, 1, -Theme.Layout.TaskbarHeight - MARGIN * 2),
		Position = UDim2.fromOffset(MARGIN, MARGIN),
		BackgroundTransparency = 1,
		ZIndex = Theme.ZIndex.Desktop + 1,

		Create("UIGridLayout") {
			CellSize = UDim2.fromOffset(CELL_WIDTH, CELL_HEIGHT),
			CellPadding = UDim2.fromOffset(0, 4),
			FillDirectionMaxCells = 1,
			SortOrder = Enum.SortOrder.LayoutOrder,
		},
	}

	self._trove:Add(self.frame)
	self:Refresh()

	return self
end

local function monogramOf(app): string
	if app.monogram then
		return app.monogram
	end

	-- Repli : les deux premières lettres du nom, en capitales.
	return string.upper(string.sub(app.name, 1, 2))
end

function DesktopIcons:_createIcon(app, order: number)
	local accent = app.accent or Theme.Color.Accent

	local tile = Create("Frame") {
		Name = "Tile",
		Size = UDim2.fromOffset(TILE, TILE),
		Position = UDim2.new(0.5, 0, 0, 0),
		AnchorPoint = Vector2.new(0.5, 0),
		BackgroundColor3 = accent,
		BorderSizePixel = 0,
		ZIndex = Theme.ZIndex.Desktop + 2,

		Create("UICorner") { CornerRadius = UDim.new(0, 14) },
		Create("UIGradient") {
			Color = ColorSequence.new(accent, accent:Lerp(Color3.new(0, 0, 0), 0.35)),
			Rotation = 70,
		},
		Create("UIStroke") {
			Color = Color3.new(1, 1, 1),
			Transparency = 0.85,
			Thickness = 1,
		},

		Create("TextLabel") {
			Name = "Monogram",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			Text = monogramOf(app),
			TextColor3 = Color3.new(1, 1, 1),
			FontFace = Theme.Font.Bold,
			TextSize = 22,
			ZIndex = Theme.ZIndex.Desktop + 3,
		},
	}

	local button = Create("TextButton") {
		Name = app.id,
		Size = UDim2.fromOffset(CELL_WIDTH, CELL_HEIGHT),
		BackgroundColor3 = Theme.Color.SurfaceRaised,
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = "",
		LayoutOrder = order,
		ZIndex = Theme.ZIndex.Desktop + 1,

		Create("UICorner") { CornerRadius = Theme.Radius.Medium },

		tile,

		Create("TextLabel") {
			Name = "Label",
			Size = UDim2.new(1, -8, 0, 28),
			Position = UDim2.fromOffset(4, TILE + 6),
			BackgroundTransparency = 1,
			Text = app.name,
			TextColor3 = Theme.Color.Text,
			FontFace = Theme.Font.Medium,
			TextSize = Theme.TextSize.Tiny,
			TextWrapped = true,
			TextYAlignment = Enum.TextYAlignment.Top,
			ZIndex = Theme.ZIndex.Desktop + 2,
		},
	}

	button.MouseEnter:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { BackgroundTransparency = 0.75 }):Play()
	end)
	button.MouseLeave:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { BackgroundTransparency = 1 }):Play()
	end)

	button.MouseButton1Click:Connect(function()
		self.os:OpenApp(app.id)
	end)

	return button
end

--- Reconstruit la grille. Appelé quand une application se débloque : une
--- nouvelle icône apparaît alors sur le bureau, ce qui est exactement la
--- façon dont on veut annoncer une progression.
function DesktopIcons:Refresh()
	for _, child in ipairs(self.frame:GetChildren()) do
		if child:IsA("GuiButton") then
			child:Destroy()
		end
	end

	for index, app in ipairs(AppRegistry.GetUnlocked(self.os.state)) do
		self:_createIcon(app, index).Parent = self.frame
	end
end

function DesktopIcons:Destroy()
	self._trove:Clean()
end

return DesktopIcons
