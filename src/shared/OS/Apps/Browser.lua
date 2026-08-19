--!strict
--[[
	Navigateur — le web de KZ OS.

	On n'achète plus dans une liste triée par catégorie : on va sur des
	sites. Chaque boutique a sa charte, sa mise en page et son ton, et le
	navigateur se contente de les afficher, avec une barre d'adresse, des
	favoris et un bouton retour.

	Ce module dessine donc volontairement SANS le thème de l'OS : une page
	web n'a aucune raison d'adopter les couleurs du système, et c'est
	précisément ce contraste qui donne l'impression d'un vrai navigateur.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Catalogue = require(Shared.Config.Catalogue)
local Placement = require(Shared.Config.Placement)
local ModelBuilder = require(Shared.Build.ModelBuilder)
local Websites = require(Shared.Content.Websites)

local Browser = {}

local CHROME_HEIGHT = 76
local TAB_HEIGHT = 34

local HOME = { id = "home", domain = "kzos://accueil" }
local ORDERS_DOMAIN = "colis-suivi.fr"

local ORDERS_THEME = {
	background = Color3.fromRGB(238, 240, 244),
	surface = Color3.fromRGB(255, 255, 255),
	text = Color3.fromRGB(26, 30, 38),
	muted = Color3.fromRGB(112, 120, 134),
	accent = Color3.fromRGB(210, 78, 42),
	onAccent = Color3.fromRGB(255, 255, 255),
	banner = Color3.fromRGB(38, 46, 60),
}

local HOME_THEME = {
	background = Color3.fromRGB(18, 20, 26),
	surface = Color3.fromRGB(28, 31, 40),
	text = Color3.fromRGB(232, 236, 245),
	muted = Color3.fromRGB(146, 155, 174),
	accent = Color3.fromRGB(96, 165, 250),
	onAccent = Color3.fromRGB(255, 255, 255),
	banner = Color3.fromRGB(14, 16, 22),
}

local function text(props: { [string]: any }): TextLabel
	return Create("TextLabel") {
		Name = props.name or "Text",
		BackgroundTransparency = 1,
		Text = props.text or "",
		TextColor3 = props.color,
		FontFace = props.font or Theme.Font.Regular,
		TextSize = props.size or 14,
		TextXAlignment = props.align or Enum.TextXAlignment.Left,
		TextYAlignment = props.alignY or Enum.TextYAlignment.Center,
		TextWrapped = props.wrapped or false,
		TextTruncate = props.truncate and Enum.TextTruncate.AtEnd or Enum.TextTruncate.None,
		Size = props.bounds or UDim2.new(1, 0, 0, 18),
		Position = props.position or UDim2.fromOffset(0, 0),
		LayoutOrder = props.order or 0,
		ZIndex = props.zIndex or 2,
	}
end

local function pill(label: string, background: Color3, foreground: Color3, order: number, onClick: (() -> ())?)
	local button = Create("TextButton") {
		Name = label,
		Size = UDim2.fromOffset(0, 24),
		AutomaticSize = Enum.AutomaticSize.X,
		BackgroundColor3 = background,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = label,
		TextColor3 = foreground,
		FontFace = Theme.Font.Medium,
		TextSize = 12,
		LayoutOrder = order,

		Create("UICorner") { CornerRadius = UDim.new(0, 4) },
		Create("UIPadding") {
			PaddingLeft = UDim.new(0, 10),
			PaddingRight = UDim.new(0, 10),
		},
	}

	if onClick then
		button.MouseButton1Click:Connect(onClick)
	end

	return button
end

--- Bouton d'achat d'un site. Il emprunte les couleurs de la boutique, pas
--- celles de l'OS : c'est ce détail qui vend l'illusion du site web.
local function buyButton(theme, label: string, enabled: boolean, onClick: () -> ())
	local background = enabled and theme.accent or theme.muted

	local button = Create("TextButton") {
		Name = "Buy",
		Size = UDim2.fromOffset(150, 32),
		BackgroundColor3 = background,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = label,
		TextColor3 = enabled and theme.onAccent or theme.surface,
		FontFace = Theme.Font.Bold,
		TextSize = 13,
		ZIndex = 3,

		Create("UICorner") { CornerRadius = UDim.new(0, 4) },
	}

	if enabled then
		button.MouseEnter:Connect(function()
			TweenService:Create(button, Theme.Motion.Instant, { BackgroundTransparency = 0.2 }):Play()
		end)
		button.MouseLeave:Connect(function()
			TweenService:Create(button, Theme.Motion.Instant, { BackgroundTransparency = 0 }):Play()
		end)
		button.MouseButton1Click:Connect(onClick)
	end

	return button
end

--- La photo produit.
---
--- Je ne peux pas fournir d'images, alors la fiche affiche mieux qu'une
--- photo : le VRAI modèle de l'objet, rendu en direct dans un
--- `ViewportFrame`, vu de trois quarts. Ce que le joueur regarde en
--- boutique est exactement ce qu'il recevra dans son carton — et le jour
--- où de vrais modèles 3D remplaceront les primitives, les fiches suivent
--- toutes seules.
local function productPreview(item, background: Color3): ViewportFrame
	local viewport = Create("ViewportFrame") {
		Name = "Preview",
		BackgroundColor3 = background,
		BorderSizePixel = 0,
		Ambient = Color3.fromRGB(160, 160, 168),
		LightColor = Color3.fromRGB(255, 250, 240),
		LightDirection = Vector3.new(-0.6, -1, -0.4),

		Create("UICorner") { CornerRadius = UDim.new(0, 4) },
	}

	local model = ModelBuilder.build(item, CFrame.new())
	model.Parent = viewport

	local camera = Instance.new("Camera")
	camera.FieldOfView = 32
	camera.Parent = viewport
	viewport.CurrentCamera = camera

	-- Cadrage automatique : on recule le long d'une diagonale jusqu'à ce que
	-- l'objet tienne dans le champ, quelle que soit sa taille. Une souris et
	-- une borne d'arcade occupent ainsi la même place sur la fiche.
	local size = Placement.GetSize(item)
	local radius = math.max(size.Magnitude, 0.4)
	local direction = Vector3.new(0.85, 0.5, 1).Unit

	camera.CFrame = CFrame.lookAt(direction * radius * 2.1, Vector3.zero)

	return viewport
end

local function specsOf(item): string
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

	return table.concat(specs, "  ·  ")
end

local function statusFor(item, money: number, ordered: boolean): (string, boolean)
	if ordered then
		return "Commande en cours", false
	end
	if money < item.price then
		return "Fonds insuffisants", false
	end
	return string.format("Commander — %d €", item.price), true
end

--- Fiche produit en grille : une vignette de couleur, un titre, un prix.
local function gridCard(site, item, money: number, ordered: boolean, onBuy: () -> ())
	local label, enabled = statusFor(item, money, ordered)

	local thumb = productPreview(item, site.theme.background)
	thumb.Size = UDim2.new(1, 0, 0, 62)

	text {
		text = string.upper(item.brand),
		color = site.theme.muted,
		font = Theme.Font.Bold,
		size = 11,
		align = Enum.TextXAlignment.Right,
		bounds = UDim2.new(1, -10, 0, 14),
		position = UDim2.fromOffset(0, 8),
		zIndex = 3,
	}.Parent = thumb

	return Create("Frame") {
		Name = item.id,
		BackgroundColor3 = site.theme.surface,
		BorderSizePixel = 0,

		Create("UICorner") { CornerRadius = UDim.new(0, 6) },
		Create("UIPadding") {
			PaddingTop = UDim.new(0, 12),
			PaddingBottom = UDim.new(0, 12),
			PaddingLeft = UDim.new(0, 14),
			PaddingRight = UDim.new(0, 14),
		},

		thumb,

		text {
			text = item.name,
			color = site.theme.text,
			font = Theme.Font.Bold,
			size = 16,
			bounds = UDim2.new(1, 0, 0, 20),
			position = UDim2.fromOffset(0, 72),
			truncate = true,
		},
		text {
			text = item.description,
			color = site.theme.muted,
			size = 12,
			wrapped = true,
			bounds = UDim2.new(1, 0, 0, 46),
			position = UDim2.fromOffset(0, 94),
			alignY = Enum.TextYAlignment.Top,
		},
		text {
			text = specsOf(item),
			color = site.theme.muted,
			font = Theme.Font.Mono,
			size = 10,
			bounds = UDim2.new(1, 0, 0, 14),
			position = UDim2.fromOffset(0, 142),
			truncate = true,
		},

		text {
			text = string.format("%d €", item.price),
			color = site.theme.text,
			font = Theme.Font.Bold,
			size = 22,
			bounds = UDim2.new(0.5, 0, 0, 30),
			position = UDim2.new(0, 0, 1, -32),
		},
		buyButton(site.theme, enabled and "Commander" or label, enabled, onBuy),
	}
end

--- Fiche produit en liste : plus dense, plus « place de marché ».
local function listRow(site, item, money: number, ordered: boolean, onBuy: () -> ())
	local label, enabled = statusFor(item, money, ordered)

	local thumb = productPreview(item, site.theme.background)
	thumb.Size = UDim2.fromOffset(72, 72)

	return Create("Frame") {
		Name = item.id,
		Size = UDim2.new(1, 0, 0, 96),
		BackgroundColor3 = site.theme.surface,
		BorderSizePixel = 0,

		Create("UICorner") { CornerRadius = UDim.new(0, 4) },
		Create("UIPadding") {
			PaddingTop = UDim.new(0, 12),
			PaddingBottom = UDim.new(0, 12),
			PaddingLeft = UDim.new(0, 14),
			PaddingRight = UDim.new(0, 14),
		},

		thumb,

		text {
			text = item.name,
			color = site.theme.text,
			font = Theme.Font.Bold,
			size = 15,
			bounds = UDim2.new(1, -260, 0, 19),
			position = UDim2.fromOffset(86, 0),
			truncate = true,
		},
		text {
			text = item.brand,
			color = site.theme.accent,
			font = Theme.Font.Medium,
			size = 11,
			bounds = UDim2.new(1, -260, 0, 14),
			position = UDim2.fromOffset(86, 20),
			truncate = true,
		},
		text {
			text = item.description,
			color = site.theme.muted,
			size = 12,
			wrapped = true,
			bounds = UDim2.new(1, -260, 0, 34),
			position = UDim2.fromOffset(86, 36),
			alignY = Enum.TextYAlignment.Top,
		},

		text {
			text = string.format("%d €", item.price),
			color = site.theme.text,
			font = Theme.Font.Bold,
			size = 20,
			align = Enum.TextXAlignment.Right,
			bounds = UDim2.new(0, 150, 0, 26),
			position = UDim2.new(1, -150, 0, 2),
		},
		buyButton(site.theme, enabled and "Commander" or label, enabled, onBuy),
	}
end

function Browser.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local page = "home"

	local addressLabel
	local page_ = Create("Frame") {
		Name = "Page",
		Size = UDim2.new(1, 0, 1, -CHROME_HEIGHT),
		Position = UDim2.fromOffset(0, CHROME_HEIGHT),
		BackgroundColor3 = HOME_THEME.background,
		BorderSizePixel = 0,
		ClipsDescendants = true,
	}

	local bookmarkBar = Create("Frame") {
		Name = "Bookmarks",
		Size = UDim2.new(1, 0, 0, TAB_HEIGHT),
		Position = UDim2.fromOffset(0, CHROME_HEIGHT - TAB_HEIGHT),
		BackgroundColor3 = Theme.Color.Surface,
		BorderSizePixel = 0,

		Create("UIListLayout") {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 6),
			SortOrder = Enum.SortOrder.LayoutOrder,
			VerticalAlignment = Enum.VerticalAlignment.Center,
		},
		Create("UIPadding") {
			PaddingLeft = UDim.new(0, 12),
			PaddingRight = UDim.new(0, 12),
		},
	}

	local navigate

	local function renderChrome()
		for _, child in ipairs(bookmarkBar:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		pill("★ Accueil", Theme.Color.SurfaceOverlay, Theme.Color.Text, 0, function()
			navigate("home")
		end).Parent = bookmarkBar

		for index, site in ipairs(Websites.All) do
			pill(site.name, Theme.Color.SurfaceRaised, Theme.Color.TextMuted, index, function()
				navigate("site:" .. site.id)
			end).Parent = bookmarkBar
		end

		pill("Suivi de colis", Theme.Color.SurfaceRaised, Theme.Color.TextMuted, 99, function()
			navigate("orders")
		end).Parent = bookmarkBar
	end

	-- ── Pages ─────────────────────────────────────────────────────────────

	local function pageScroll(theme): ScrollingFrame
		return Create("ScrollingFrame") {
			Name = "Content",
			Size = UDim2.fromScale(1, 1),
			BackgroundTransparency = 1,
			BorderSizePixel = 0,
			ScrollBarThickness = 6,
			ScrollBarImageColor3 = theme.muted,
			CanvasSize = UDim2.new(),
			AutomaticCanvasSize = Enum.AutomaticSize.Y,
			ScrollingDirection = Enum.ScrollingDirection.Y,
		}
	end

	local function banner(theme, title: string, tagline: string, notice: string)
		return Create("Frame") {
			Name = "Banner",
			Size = UDim2.new(1, 0, 0, 96),
			BackgroundColor3 = theme.banner,
			BorderSizePixel = 0,
			LayoutOrder = 0,

			Create("UIPadding") {
				PaddingLeft = UDim.new(0, 28),
				PaddingRight = UDim.new(0, 28),
				PaddingTop = UDim.new(0, 20),
			},

			text {
				text = title,
				color = Color3.new(1, 1, 1),
				font = Theme.Font.Bold,
				size = 26,
				bounds = UDim2.new(1, 0, 0, 30),
			},
			text {
				text = tagline,
				color = theme.accent,
				font = Theme.Font.Medium,
				size = 14,
				bounds = UDim2.new(1, 0, 0, 18),
				position = UDim2.fromOffset(0, 32),
			},
			text {
				text = notice,
				color = Color3.fromRGB(180, 186, 198),
				size = 11,
				bounds = UDim2.new(1, 0, 0, 16),
				position = UDim2.fromOffset(0, 54),
				truncate = true,
			},
		}
	end

	local function renderHome()
		page_.BackgroundColor3 = HOME_THEME.background

		local scroll = pageScroll(HOME_THEME)
		Create("UIListLayout") {
			Padding = UDim.new(0, 10),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = scroll
		Create("UIPadding") {
			PaddingTop = UDim.new(0, 24),
			PaddingBottom = UDim.new(0, 24),
			PaddingLeft = UDim.new(0, 28),
			PaddingRight = UDim.new(0, 28),
		}.Parent = scroll
		scroll.Parent = page_

		text {
			text = "Vos sites",
			color = HOME_THEME.text,
			font = Theme.Font.Bold,
			size = 22,
			bounds = UDim2.new(1, 0, 0, 30),
			order = 0,
		}.Parent = scroll

		for index, site in ipairs(Websites.All) do
			local card = Create("TextButton") {
				Name = site.id,
				Size = UDim2.new(1, 0, 0, 62),
				BackgroundColor3 = HOME_THEME.surface,
				BorderSizePixel = 0,
				AutoButtonColor = false,
				Text = "",
				LayoutOrder = index,

				Create("UICorner") { CornerRadius = UDim.new(0, 6) },
				Create("UIPadding") {
					PaddingLeft = UDim.new(0, 16),
					PaddingRight = UDim.new(0, 16),
					PaddingTop = UDim.new(0, 10),
				},

				Create("Frame") {
					Name = "Swatch",
					Size = UDim2.fromOffset(4, 42),
					Position = UDim2.fromOffset(-10, 0),
					BackgroundColor3 = site.theme.accent,
					BorderSizePixel = 0,
				},

				text {
					text = site.name,
					color = HOME_THEME.text,
					font = Theme.Font.Bold,
					size = 16,
					bounds = UDim2.new(1, -180, 0, 20),
				},
				text {
					text = site.tagline,
					color = HOME_THEME.muted,
					size = 12,
					bounds = UDim2.new(1, -180, 0, 16),
					position = UDim2.fromOffset(0, 21),
					truncate = true,
				},
				text {
					text = site.domain,
					color = HOME_THEME.accent,
					font = Theme.Font.Mono,
					size = 12,
					align = Enum.TextXAlignment.Right,
					bounds = UDim2.new(0, 170, 0, 42),
				},
			}

			card.MouseButton1Click:Connect(function()
				navigate("site:" .. site.id)
			end)
			card.MouseEnter:Connect(function()
				TweenService:Create(card, Theme.Motion.Instant, { BackgroundColor3 = Theme.Color.SurfaceOverlay }):Play()
			end)
			card.MouseLeave:Connect(function()
				TweenService:Create(card, Theme.Motion.Instant, { BackgroundColor3 = HOME_THEME.surface }):Play()
			end)

			card.Parent = scroll
		end
	end

	local function renderSite(site)
		page_.BackgroundColor3 = site.theme.background

		local scroll = pageScroll(site.theme)
		scroll.Parent = page_

		Create("UIListLayout") {
			Padding = UDim.new(0, 0),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = scroll

		banner(site.theme, site.name, site.tagline, site.notice).Parent = scroll

		local money = api.state.money or 0
		local ordered: { [string]: boolean } = {}
		for _, order in ipairs(api.state.orders or {}) do
			ordered[order.itemId] = true
		end

		local shelf = Create("Frame") {
			Name = "Shelf",
			Size = UDim2.new(1, 0, 0, 0),
			AutomaticSize = Enum.AutomaticSize.Y,
			BackgroundTransparency = 1,
			LayoutOrder = 1,

			Create("UIPadding") {
				PaddingTop = UDim.new(0, 20),
				PaddingBottom = UDim.new(0, 28),
				PaddingLeft = UDim.new(0, 24),
				PaddingRight = UDim.new(0, 24),
			},
		}
		shelf.Parent = scroll

		if site.layout == "grid" then
			Create("UIGridLayout") {
				CellSize = UDim2.new(0.5, -8, 0, 210),
				CellPadding = UDim2.fromOffset(16, 16),
				SortOrder = Enum.SortOrder.LayoutOrder,
			}.Parent = shelf
		else
			Create("UIListLayout") {
				Padding = UDim.new(0, 8),
				SortOrder = Enum.SortOrder.LayoutOrder,
			}.Parent = shelf
		end

		local count = 0
		for index, item in ipairs(Catalogue.All()) do
			if Websites.Sells(site, item) then
				count += 1
				local builder = site.layout == "grid" and gridCard or listRow
				local card = builder(site, item, money, ordered[item.id] == true, function()
					api.request("shop/order", { itemId = item.id })
				end)
				card.LayoutOrder = index
				card.Parent = shelf
			end
		end

		if count == 0 then
			text {
				text = "Rupture de stock sur l'ensemble du catalogue.",
				color = site.theme.muted,
				size = 14,
				align = Enum.TextXAlignment.Center,
				bounds = UDim2.new(1, 0, 0, 60),
			}.Parent = shelf
		end
	end

	local function renderOrders()
		page_.BackgroundColor3 = ORDERS_THEME.background

		local scroll = pageScroll(ORDERS_THEME)
		scroll.Parent = page_

		Create("UIListLayout") {
			Padding = UDim.new(0, 0),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = scroll

		banner(ORDERS_THEME, "Colis Suivi", "Vos livraisons en un coup d'oeil", "Suivi indicatif · Les horaires ne sont pas garantis").Parent =
			scroll

		local body = Create("Frame") {
			Name = "Body",
			Size = UDim2.new(1, 0, 0, 0),
			AutomaticSize = Enum.AutomaticSize.Y,
			BackgroundTransparency = 1,
			LayoutOrder = 1,

			Create("UIListLayout") { Padding = UDim.new(0, 8), SortOrder = Enum.SortOrder.LayoutOrder },
			Create("UIPadding") {
				PaddingTop = UDim.new(0, 20),
				PaddingBottom = UDim.new(0, 28),
				PaddingLeft = UDim.new(0, 24),
				PaddingRight = UDim.new(0, 24),
			},
		}
		body.Parent = scroll

		local orders = api.state.orders or {}
		local day = api.state.day or 1

		if #orders == 0 then
			text {
				text = "Aucun colis en cours d'acheminement.",
				color = ORDERS_THEME.muted,
				size = 14,
				align = Enum.TextXAlignment.Center,
				bounds = UDim2.new(1, 0, 0, 60),
			}.Parent = body
			return
		end

		for index, order in ipairs(orders) do
			local item = Catalogue.Get(order.itemId)
			local remaining = math.max(0, (order.arrivesDay or day) - day)
			local status = remaining <= 0 and "Prêt à être remis" or "En transit"

			Create("Frame") {
				Name = "Order",
				Size = UDim2.new(1, 0, 0, 66),
				BackgroundColor3 = ORDERS_THEME.surface,
				BorderSizePixel = 0,
				LayoutOrder = index,

				Create("UICorner") { CornerRadius = UDim.new(0, 4) },
				Create("UIPadding") {
					PaddingLeft = UDim.new(0, 16),
					PaddingRight = UDim.new(0, 16),
					PaddingTop = UDim.new(0, 12),
				},

				text {
					text = item and item.name or order.itemId,
					color = ORDERS_THEME.text,
					font = Theme.Font.Bold,
					size = 15,
					bounds = UDim2.new(1, -160, 0, 19),
					truncate = true,
				},
				text {
					text = string.format("%s · %s", item and item.brand or "—", status),
					color = remaining <= 0 and ORDERS_THEME.accent or ORDERS_THEME.muted,
					size = 12,
					bounds = UDim2.new(1, -160, 0, 16),
					position = UDim2.fromOffset(0, 21),
				},
				text {
					text = remaining <= 0 and "Livraison ce matin"
						or string.format("Arrivée jour %d", order.arrivesDay or day),
					color = ORDERS_THEME.text,
					font = Theme.Font.Medium,
					size = 13,
					align = Enum.TextXAlignment.Right,
					bounds = UDim2.new(0, 150, 0, 40),
					position = UDim2.new(1, -150, 0, 0),
				},
			}.Parent = body
		end
	end

	-- ── Navigation ────────────────────────────────────────────────────────

	function navigate(target: string)
		page = target
		page_:ClearAllChildren()

		if target == "orders" then
			addressLabel.Text = ORDERS_DOMAIN
			renderOrders()
			return
		end

		local siteId = string.match(target, "^site:(.+)$")
		if siteId then
			local site = Websites.Get(siteId)
			if site then
				addressLabel.Text = site.domain
				renderSite(site)
				return
			end
		end

		addressLabel.Text = HOME.domain
		renderHome()
	end

	addressLabel = text {
		name = "Address",
		text = HOME.domain,
		color = Theme.Color.Text,
		font = Theme.Font.Mono,
		size = Theme.TextSize.Small,
		bounds = UDim2.new(1, -230, 1, 0),
		position = UDim2.fromOffset(14, 0),
	}

	local balanceLabel = text {
		name = "Balance",
		text = "",
		color = Theme.Color.Text,
		font = Theme.Font.Bold,
		size = Theme.TextSize.Title,
		align = Enum.TextXAlignment.Right,
		bounds = UDim2.new(0, 140, 1, 0),
		position = UDim2.new(1, -152, 0, 0),
	}

	local backButton = Create("TextButton") {
		Name = "Back",
		Size = UDim2.fromOffset(32, 30),
		Position = UDim2.fromOffset(10, 6),
		BackgroundColor3 = Theme.Color.SurfaceRaised,
		BorderSizePixel = 0,
		AutoButtonColor = false,
		Text = "←",
		TextColor3 = Theme.Color.TextMuted,
		FontFace = Theme.Font.Bold,
		TextSize = 18,
		Create("UICorner") { CornerRadius = Theme.Radius.Small },
	}
	backButton.MouseButton1Click:Connect(function()
		navigate("home")
	end)

	local chrome = Create("Frame") {
		Name = "Chrome",
		Size = UDim2.new(1, 0, 0, CHROME_HEIGHT),
		BackgroundColor3 = Theme.Color.SurfaceRaised,
		BorderSizePixel = 0,

		backButton,

		Create("Frame") {
			Name = "AddressBar",
			Size = UDim2.new(1, -212, 0, 30),
			Position = UDim2.fromOffset(50, 6),
			BackgroundColor3 = Theme.Color.Desktop,
			BorderSizePixel = 0,

			Create("UICorner") { CornerRadius = Theme.Radius.Pill },
			addressLabel,
		},

		balanceLabel,
		bookmarkBar,
	}

	local root = Create("Frame") {
		Name = "BrowserRoot",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = Theme.Color.Desktop,
		BorderSizePixel = 0,

		chrome,
		page_,
	}
	root.Parent = container
	trove:Add(root)

	local function refreshBalance()
		balanceLabel.Text = string.format("%d €", api.state.money or 0)
	end

	--- L'horloge émet un changement d'état chaque seconde. Redessiner la
	--- page à chaque fois détruirait les boutons sous le curseur et
	--- remettrait le défilement à zéro. On ne recharge donc que si quelque
	--- chose de visible a réellement bougé.
	local function pageSignature(): string
		local parts = { tostring(api.state.money or 0) }
		for _, order in ipairs(api.state.orders or {}) do
			table.insert(parts, string.format("%s@%d", order.itemId, order.arrivesDay or 0))
		end
		table.insert(parts, tostring(api.state.day or 0))
		return table.concat(parts, ",")
	end

	local lastSignature = ""

	renderChrome()
	navigate("home")
	refreshBalance()
	lastSignature = pageSignature()

	trove:Add(api.stateChanged:Connect(function()
		refreshBalance()

		local signature = pageSignature()
		if signature ~= lastSignature then
			lastSignature = signature
			navigate(page)
		end
	end))

	return function()
		trove:Clean()
	end
end

return Browser
