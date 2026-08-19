--!strict
--[[
	Window — une fenêtre de KZ OS : barre de titre, contenu, boutons, drag,
	redimensionnement, focus.

	La fenêtre ne sait pas où elle est affichée. Elle demande la position du
	curseur au contexte (`context.getPointer()`), qui la lui donne toujours
	dans le repère logique de l'écran (1280x720 par défaut). C'est ce qui
	permet au même code de fonctionner sur une dalle 3D vue de biais comme
	sur un ScreenGui plein écran, sans une seule ligne conditionnelle.
]]

local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent
local Create = require(Shared.Lib.Create)
local Signal = require(Shared.Lib.Signal)
local Trove = require(Shared.Lib.Trove)
local Theme = require(script.Parent.Theme)

local Window = {}
Window.__index = Window

local MIN_SIZE = Theme.Layout.WindowMinSize

--- Bouton de la barre de titre (réduire / agrandir / fermer).
local function createTitleBarButton(glyph: string, hoverColor: Color3, order: number)
	local button = Create("TextButton") {
		Name = glyph,
		Size = UDim2.fromOffset(Theme.Layout.TitleBarHeight, Theme.Layout.TitleBarHeight),
		BackgroundColor3 = hoverColor,
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = glyph,
		TextColor3 = Theme.Color.TextMuted,
		FontFace = Theme.Font.Regular,
		TextSize = Theme.TextSize.Small,
		LayoutOrder = order,
	}

	button.MouseEnter:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, {
			BackgroundTransparency = 0,
			TextColor3 = Theme.Color.Text,
		}):Play()
	end)

	button.MouseLeave:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, {
			BackgroundTransparency = 1,
			TextColor3 = Theme.Color.TextMuted,
		}):Play()
	end)

	return button
end

export type WindowProps = {
	title: string,
	icon: string?,
	size: Vector2?,
	position: Vector2?,
	resizable: boolean?,
	minSize: Vector2?,
}

function Window.new(manager, id: string, props: WindowProps)
	local self = setmetatable({}, Window)

	self._trove = Trove.new()
	self._manager = manager
	self._context = manager.context

	self.id = id
	self.title = props.title
	self.icon = props.icon or "?"
	self.resizable = props.resizable ~= false
	self.minSize = props.minSize or MIN_SIZE

	self.minimized = false
	self.maximized = false
	self.focused = false

	self.size = props.size or Vector2.new(720, 460)
	self.position = props.position or Vector2.new(120, 80)
	self._restoreSize = self.size
	self._restorePosition = self.position

	self.Closed = self._trove:Add(Signal.new())
	self.FocusChanged = self._trove:Add(Signal.new())
	self.MinimizedChanged = self._trove:Add(Signal.new())

	self:_build()

	return self
end

function Window:_build()
	local titleBarHeight = Theme.Layout.TitleBarHeight

	self.titleLabel = Create("TextLabel") {
		Name = "Title",
		Size = UDim2.new(1, -(titleBarHeight * 3) - Theme.Space.MD, 1, 0),
		Position = UDim2.fromOffset(Theme.Space.MD, 0),
		BackgroundTransparency = 1,
		Text = self.title,
		TextColor3 = Theme.Color.Text,
		FontFace = Theme.Font.Medium,
		TextSize = Theme.TextSize.Small,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}

	self.minimizeButton = createTitleBarButton("—", Theme.Color.SurfaceOverlay, 1)
	self.maximizeButton = createTitleBarButton("□", Theme.Color.SurfaceOverlay, 2)
	self.closeButton = createTitleBarButton("✕", Theme.Color.Danger, 3)

	self.titleBar = Create("Frame") {
		Name = "TitleBar",
		Size = UDim2.new(1, 0, 0, titleBarHeight),
		BackgroundColor3 = Theme.Color.SurfaceRaised,
		BorderSizePixel = 0,

		self.titleLabel,

		Create("Frame") {
			Name = "Buttons",
			Size = UDim2.new(0, titleBarHeight * 3, 1, 0),
			Position = UDim2.fromScale(1, 0),
			AnchorPoint = Vector2.new(1, 0),
			BackgroundTransparency = 1,

			Create("UIListLayout") {
				FillDirection = Enum.FillDirection.Horizontal,
				SortOrder = Enum.SortOrder.LayoutOrder,
			},

			self.minimizeButton,
			self.maximizeButton,
			self.closeButton,
		},
	}

	self.content = Create("Frame") {
		Name = "Content",
		Size = UDim2.new(1, 0, 1, -titleBarHeight),
		Position = UDim2.fromOffset(0, titleBarHeight),
		BackgroundColor3 = Theme.Color.Surface,
		BorderSizePixel = 0,
		ClipsDescendants = true,
	}

	self.resizeGrip = Create("TextButton") {
		Name = "ResizeGrip",
		Size = UDim2.fromOffset(Theme.Layout.ResizeGripSize, Theme.Layout.ResizeGripSize),
		Position = UDim2.fromScale(1, 1),
		AnchorPoint = Vector2.new(1, 1),
		BackgroundTransparency = 1,
		Text = "",
		Visible = self.resizable,
		ZIndex = 5,
	}

	self.stroke = Create("UIStroke") {
		Color = Theme.Color.Border,
		Thickness = 1,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}

	self.frame = Create("Frame") {
		Name = "Window_" .. self.id,
		Size = UDim2.fromOffset(self.size.X, self.size.Y),
		Position = UDim2.fromOffset(self.position.X, self.position.Y),
		BackgroundColor3 = Theme.Color.Surface,
		BorderSizePixel = 0,
		ClipsDescendants = true,

		Create("UICorner") { CornerRadius = Theme.Radius.Medium },
		self.stroke,
		self.titleBar,
		self.content,
		self.resizeGrip,
	}

	self._trove:Add(self.frame)

	self:_bindInteractions()
	self:_playOpenAnimation()
end

function Window:_playOpenAnimation()
	local targetSize = UDim2.fromOffset(self.size.X, self.size.Y)

	self.frame.Size = UDim2.fromOffset(self.size.X * 0.92, self.size.Y * 0.92)
	self.frame.BackgroundTransparency = 1

	TweenService:Create(self.frame, Theme.Motion.Pop, { Size = targetSize }):Play()
	TweenService:Create(self.frame, Theme.Motion.Fast, { BackgroundTransparency = 0 }):Play()
end

function Window:_bindInteractions()
	local trove = self._trove

	trove:Add(self.closeButton.MouseButton1Click:Connect(function()
		self:Close()
	end))

	trove:Add(self.minimizeButton.MouseButton1Click:Connect(function()
		self:SetMinimized(true)
	end))

	trove:Add(self.maximizeButton.MouseButton1Click:Connect(function()
		self:ToggleMaximize()
	end))

	-- Cliquer n'importe où dans la fenêtre la met au premier plan.
	trove:Add(self.frame.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			self:Focus()
		end
	end))

	trove:Add(self.titleBar.InputBegan:Connect(function(input)
		if input.UserInputType ~= Enum.UserInputType.MouseButton1 then
			return
		end
		self:_beginDrag()
	end))

	-- Double-clic sur la barre de titre : agrandir / restaurer.
	local lastTitleClick = 0
	trove:Add(self.titleBar.InputEnded:Connect(function(input)
		if input.UserInputType ~= Enum.UserInputType.MouseButton1 then
			return
		end
		local now = os.clock()
		if now - lastTitleClick < 0.35 then
			self:ToggleMaximize()
			lastTitleClick = 0
		else
			lastTitleClick = now
		end
	end))

	trove:Add(self.resizeGrip.InputBegan:Connect(function(input)
		if input.UserInputType ~= Enum.UserInputType.MouseButton1 then
			return
		end
		self:_beginResize()
	end))
end

--- Boucle de manipulation partagée par le drag et le resize : tant que le
--- bouton reste enfoncé, on applique `apply(delta)` à chaque frame.
function Window:_beginPointerLoop(apply: (Vector2) -> ())
	local origin = self._context.getPointer()
	if not origin then
		return
	end

	local connections = {}

	local stop
	stop = function()
		for _, connection in ipairs(connections) do
			connection:Disconnect()
		end
		table.clear(connections)
		self._manager:_setManipulating(false)
		-- On se retire du trove : sans ça, chaque drag y laisserait une
		-- fonction morte de plus pour toute la vie de la fenêtre.
		self._trove:Remove(stop)
	end

	self._manager:_setManipulating(true)

	table.insert(connections, RunService.RenderStepped:Connect(function()
		local current = self._context.getPointer()
		if current then
			apply(current - origin)
		end
	end))

	table.insert(connections, UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			stop()
		end
	end))

	self._trove:Add(stop)
end

function Window:_beginDrag()
	if self.maximized then
		-- Comportement Windows : tirer une fenêtre agrandie la restaure,
		-- en la recentrant sous le curseur.
		local pointer = self._context.getPointer()
		self:ToggleMaximize()
		if pointer then
			self.position = Vector2.new(pointer.X - self.size.X / 2, math.max(0, pointer.Y - Theme.Layout.TitleBarHeight / 2))
			self:_applyPosition()
		end
	end

	local startPosition = self.position

	self:_beginPointerLoop(function(delta)
		self.position = startPosition + delta
		self:_clampToScreen()
		self:_applyPosition()
	end)
end

function Window:_beginResize()
	if self.maximized then
		return
	end

	local startSize = self.size

	self:_beginPointerLoop(function(delta)
		self.size = Vector2.new(
			math.max(self.minSize.X, startSize.X + delta.X),
			math.max(self.minSize.Y, startSize.Y + delta.Y)
		)
		self:_applySize()
	end)
end

--- On garde toujours la barre de titre attrapable : une fenêtre poussée
--- hors de l'écran qu'on ne peut plus récupérer est un classique du genre.
function Window:_clampToScreen()
	local screen = Theme.Layout.ScreenResolution
	local margin = 60

	self.position = Vector2.new(
		math.clamp(self.position.X, -self.size.X + margin, screen.X - margin),
		math.clamp(self.position.Y, 0, screen.Y - Theme.Layout.TaskbarHeight - Theme.Layout.TitleBarHeight)
	)
end

function Window:_applyPosition()
	self.frame.Position = UDim2.fromOffset(math.round(self.position.X), math.round(self.position.Y))
end

function Window:_applySize()
	self.frame.Size = UDim2.fromOffset(math.round(self.size.X), math.round(self.size.Y))
end

function Window:SetTitle(title: string)
	self.title = title
	self.titleLabel.Text = title
end

function Window:Focus()
	self._manager:FocusWindow(self)
end

function Window:_setFocusState(focused: boolean)
	if self.focused == focused then
		return
	end
	self.focused = focused

	TweenService:Create(self.stroke, Theme.Motion.Fast, {
		Color = focused and Theme.Color.BorderFocused or Theme.Color.Border,
	}):Play()

	TweenService:Create(self.titleBar, Theme.Motion.Fast, {
		BackgroundColor3 = focused and Theme.Color.SurfaceRaised or Theme.Color.Surface,
	}):Play()

	self.titleLabel.TextColor3 = focused and Theme.Color.Text or Theme.Color.TextMuted

	self.FocusChanged:Fire(focused)
end

function Window:SetMinimized(minimized: boolean)
	if self.minimized == minimized then
		return
	end
	self.minimized = minimized

	self.frame.Visible = not minimized
	self.MinimizedChanged:Fire(minimized)

	if minimized then
		self._manager:_focusTopMost()
	else
		self:Focus()
	end
end

function Window:ToggleMaximize()
	local screen = Theme.Layout.ScreenResolution

	if self.maximized then
		self.size = self._restoreSize
		self.position = self._restorePosition
		self.maximized = false
		self.resizeGrip.Visible = self.resizable
		self.maximizeButton.Text = "□"
	else
		self._restoreSize = self.size
		self._restorePosition = self.position
		self.size = Vector2.new(screen.X, screen.Y - Theme.Layout.TaskbarHeight)
		self.position = Vector2.zero
		self.maximized = true
		self.resizeGrip.Visible = false
		self.maximizeButton.Text = "❐"
	end

	TweenService:Create(self.frame, Theme.Motion.Fast, {
		Size = UDim2.fromOffset(self.size.X, self.size.Y),
		Position = UDim2.fromOffset(self.position.X, self.position.Y),
	}):Play()
end

function Window:Close()
	if self._closing then
		return
	end
	self._closing = true

	local shrink = TweenService:Create(self.frame, Theme.Motion.Fast, {
		Size = UDim2.fromOffset(self.size.X * 0.94, self.size.Y * 0.94),
		BackgroundTransparency = 1,
	})
	shrink:Play()
	shrink.Completed:Wait()

	self.Closed:Fire()
	self:Destroy()
end

function Window:Destroy()
	self._trove:Clean()
end

return Window
