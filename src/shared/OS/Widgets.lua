--!strict
--[[
	Widgets — la petite bibliothèque de composants de KZ OS.

	Les apps ne fabriquent jamais un TextLabel à la main : elles assemblent
	ces briques. C'est ce qui garantit qu'un bouton de la messagerie et un
	bouton du logiciel de stream ont exactement la même taille, la même
	animation de survol et le même son au clic.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent
local Create = require(Shared.Lib.Create)
local Theme = require(script.Parent.Theme)

local Widgets = {}

function Widgets.Text(props: { [string]: any })
	return Create("TextLabel") {
		BackgroundTransparency = 1,
		Text = props.text or "",
		TextColor3 = props.color or Theme.Color.Text,
		FontFace = props.font or Theme.Font.Regular,
		TextSize = props.size or Theme.TextSize.Body,
		TextXAlignment = props.align or Enum.TextXAlignment.Left,
		TextYAlignment = props.alignY or Enum.TextYAlignment.Center,
		TextWrapped = props.wrapped or false,
		TextTruncate = props.truncate and Enum.TextTruncate.AtEnd or Enum.TextTruncate.None,
		Size = props.size2 or UDim2.new(1, 0, 0, props.height or 20),
		Position = props.position or UDim2.fromOffset(0, 0),
		AutomaticSize = props.autoSize or Enum.AutomaticSize.None,
		LayoutOrder = props.order or 0,
		Name = props.name or "Text",
		ZIndex = props.zIndex or 1,
	}
end

function Widgets.Panel(props: { [string]: any })
	local panel = Create("Frame") {
		Name = props.name or "Panel",
		Size = props.size or UDim2.fromScale(1, 1),
		Position = props.position or UDim2.fromOffset(0, 0),
		AnchorPoint = props.anchor or Vector2.zero,
		BackgroundColor3 = props.color or Theme.Color.Surface,
		BackgroundTransparency = props.transparency or 0,
		BorderSizePixel = 0,
		LayoutOrder = props.order or 0,
		ClipsDescendants = props.clip or false,
		ZIndex = props.zIndex or 1,
	}

	if props.radius then
		Create("UICorner") { CornerRadius = props.radius }.Parent = panel
	end

	if props.stroke then
		Create("UIStroke") {
			Color = props.stroke,
			Thickness = 1,
			ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
		}.Parent = panel
	end

	if props.padding then
		local pad = props.padding
		Create("UIPadding") {
			PaddingTop = UDim.new(0, pad),
			PaddingBottom = UDim.new(0, pad),
			PaddingLeft = UDim.new(0, pad),
			PaddingRight = UDim.new(0, pad),
		}.Parent = panel
	end

	if props.list then
		Create("UIListLayout") {
			FillDirection = props.list.direction or Enum.FillDirection.Vertical,
			Padding = UDim.new(0, props.list.gap or Theme.Space.SM),
			SortOrder = Enum.SortOrder.LayoutOrder,
			HorizontalAlignment = props.list.alignX or Enum.HorizontalAlignment.Left,
			VerticalAlignment = props.list.alignY or Enum.VerticalAlignment.Top,
		}.Parent = panel
	end

	for _, child in ipairs(props) do
		if typeof(child) == "Instance" then
			child.Parent = panel
		end
	end

	return panel
end

function Widgets.Scroll(props: { [string]: any })
	local scroll = Create("ScrollingFrame") {
		Name = props.name or "Scroll",
		Size = props.size or UDim2.fromScale(1, 1),
		Position = props.position or UDim2.fromOffset(0, 0),
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		ScrollBarThickness = 4,
		ScrollBarImageColor3 = Theme.Color.Border,
		CanvasSize = UDim2.new(),
		AutomaticCanvasSize = Enum.AutomaticSize.Y,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		LayoutOrder = props.order or 0,
		ZIndex = props.zIndex or 1,
	}

	Create("UIListLayout") {
		Padding = UDim.new(0, props.gap or Theme.Space.XS),
		SortOrder = Enum.SortOrder.LayoutOrder,
	}.Parent = scroll

	if props.padding then
		Create("UIPadding") {
			PaddingTop = UDim.new(0, props.padding),
			PaddingBottom = UDim.new(0, props.padding),
			PaddingLeft = UDim.new(0, props.padding),
			PaddingRight = UDim.new(0, props.padding),
		}.Parent = scroll
	end

	for _, child in ipairs(props) do
		if typeof(child) == "Instance" then
			child.Parent = scroll
		end
	end

	return scroll
end

--- Bouton standard. `variant` : "primary", "ghost", "danger".
function Widgets.Button(props: { [string]: any })
	local variant = props.variant or "ghost"

	local palette = {
		primary = { idle = Theme.Color.Accent, hover = Theme.Color.AccentPressed, text = Color3.new(1, 1, 1) },
		ghost = { idle = Theme.Color.SurfaceRaised, hover = Theme.Color.SurfaceOverlay, text = Theme.Color.Text },
		danger = { idle = Theme.Color.Danger, hover = Color3.fromRGB(198, 70, 70), text = Color3.new(1, 1, 1) },
		live = { idle = Theme.Color.Live, hover = Color3.fromRGB(214, 44, 44), text = Color3.new(1, 1, 1) },
	}
	local colors = palette[variant] or palette.ghost

	local button = Create("TextButton") {
		Name = props.name or "Button",
		Size = props.size or UDim2.new(1, 0, 0, 34),
		Position = props.position or UDim2.fromOffset(0, 0),
		AnchorPoint = props.anchor or Vector2.zero,
		BackgroundColor3 = colors.idle,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = props.text or "",
		TextColor3 = colors.text,
		FontFace = props.font or Theme.Font.Medium,
		TextSize = props.textSize or Theme.TextSize.Small,
		LayoutOrder = props.order or 0,
		ZIndex = props.zIndex or 2,

		Create("UICorner") { CornerRadius = props.radius or Theme.Radius.Small },
	}

	button.MouseEnter:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { BackgroundColor3 = colors.hover }):Play()
	end)

	button.MouseLeave:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { BackgroundColor3 = colors.idle }):Play()
	end)

	-- Léger enfoncement au clic : c'est ce détail qui donne du "poids".
	button.MouseButton1Down:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { TextTransparency = 0.35 }):Play()
	end)

	button.MouseButton1Up:Connect(function()
		TweenService:Create(button, Theme.Motion.Instant, { TextTransparency = 0 }):Play()
	end)

	if props.onClick then
		button.MouseButton1Click:Connect(props.onClick)
	end

	return button
end

--- Ligne sélectionnable d'une liste (un mail, une source, un fichier).
function Widgets.ListRow(props: { [string]: any })
	local row = Create("TextButton") {
		Name = props.name or "Row",
		Size = UDim2.new(1, 0, 0, props.height or 56),
		BackgroundColor3 = Theme.Color.SurfaceRaised,
		BackgroundTransparency = props.selected and 0 or 1,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = "",
		LayoutOrder = props.order or 0,

		Create("UICorner") { CornerRadius = Theme.Radius.Small },
		Create("UIPadding") {
			PaddingLeft = UDim.new(0, Theme.Space.MD),
			PaddingRight = UDim.new(0, Theme.Space.MD),
			PaddingTop = UDim.new(0, Theme.Space.SM),
			PaddingBottom = UDim.new(0, Theme.Space.SM),
		},
	}

	local selected = props.selected or false

	row.MouseEnter:Connect(function()
		if not selected then
			TweenService:Create(row, Theme.Motion.Instant, { BackgroundTransparency = 0.5 }):Play()
		end
	end)

	row.MouseLeave:Connect(function()
		if not selected then
			TweenService:Create(row, Theme.Motion.Instant, { BackgroundTransparency = 1 }):Play()
		end
	end)

	if props.onClick then
		row.MouseButton1Click:Connect(props.onClick)
	end

	for _, child in ipairs(props) do
		if typeof(child) == "Instance" then
			child.Parent = row
		end
	end

	return row
end

function Widgets.Divider(vertical: boolean?)
	return Create("Frame") {
		Name = "Divider",
		Size = vertical and UDim2.new(0, 1, 1, 0) or UDim2.new(1, 0, 0, 1),
		BackgroundColor3 = Theme.Color.Border,
		BorderSizePixel = 0,
	}
end

return Widgets
