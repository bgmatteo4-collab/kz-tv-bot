--!strict
--[[
	Courrier — la boîte de réception.

	Deux volets : la liste à gauche, la lecture à droite. Les mails ne sont
	pas des notifications : ce sont des conversations avec des conséquences.
	Répondre à un sponsor, c'est signer un contrat.
]]

local Shared = script.Parent.Parent.Parent
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)
local Emails = require(Shared.Content.Emails)

local Mail = {}

local LIST_WIDTH = 300

local function buildRow(email, isSelected: boolean, onSelect: () -> ())
	local unreadDot = Create("Frame") {
		Name = "Unread",
		Size = UDim2.fromOffset(7, 7),
		Position = UDim2.new(1, 0, 0, 4),
		AnchorPoint = Vector2.new(1, 0),
		BackgroundColor3 = Theme.Color.Accent,
		BorderSizePixel = 0,
		Visible = email.unread,

		Create("UICorner") { CornerRadius = Theme.Radius.Pill },
	}

	return Widgets.ListRow {
		height = 62,
		selected = isSelected,
		onClick = onSelect,

		unreadDot,

		Widgets.Text {
			text = email.sender,
			font = email.unread and Theme.Font.Bold or Theme.Font.Medium,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, -14, 0, 16),
			truncate = true,
		},
		Widgets.Text {
			text = email.subject,
			color = email.unread and Theme.Color.Text or Theme.Color.TextMuted,
			size = Theme.TextSize.Small,
			size2 = UDim2.new(1, 0, 0, 16),
			position = UDim2.fromOffset(0, 17),
			truncate = true,
		},
		Widgets.Text {
			text = email.preview,
			color = Theme.Color.TextDisabled,
			size = Theme.TextSize.Tiny,
			size2 = UDim2.new(1, 0, 0, 14),
			position = UDim2.fromOffset(0, 34),
			truncate = true,
		},
	}
end

function Mail.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local state = {
		emails = table.clone(Emails),
		selectedId = nil :: string?,
	}

	local listScroll = Widgets.Scroll {
		size = UDim2.new(0, LIST_WIDTH, 1, 0),
		padding = Theme.Space.SM,
		gap = 2,
	}

	local readingPane = Widgets.Panel {
		name = "Reading",
		size = UDim2.new(1, -LIST_WIDTH - 1, 1, 0),
		position = UDim2.fromOffset(LIST_WIDTH + 1, 0),
		color = Theme.Color.Surface,
	}

	local renderList, renderReading

	function renderReading()
		readingPane:ClearAllChildren()

		local email
		for _, candidate in ipairs(state.emails) do
			if candidate.id == state.selectedId then
				email = candidate
				break
			end
		end

		if not email then
			Widgets.Text {
				text = "Aucun message sélectionné",
				color = Theme.Color.TextDisabled,
				align = Enum.TextXAlignment.Center,
				size2 = UDim2.fromScale(1, 1),
			}.Parent = readingPane
			return
		end

		local header = Widgets.Panel {
			size = UDim2.new(1, 0, 0, 74),
			color = Theme.Color.Surface,
			padding = Theme.Space.LG,

			Widgets.Text {
				text = email.subject,
				font = Theme.Font.Bold,
				size = Theme.TextSize.Title,
				size2 = UDim2.new(1, 0, 0, 24),
				truncate = true,
			},
			Widgets.Text {
				text = string.format("%s  <%s>  ·  jour %d", email.sender, email.address, email.day),
				color = Theme.Color.TextMuted,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, 0, 0, 16),
				position = UDim2.fromOffset(0, 28),
				truncate = true,
			},
		}
		header.Parent = readingPane

		Widgets.Panel {
			name = "HeaderRule",
			size = UDim2.new(1, 0, 0, 1),
			position = UDim2.fromOffset(0, 74),
			color = Theme.Color.Border,
		}.Parent = readingPane

		local body = Widgets.Scroll {
			size = UDim2.new(1, 0, 1, -75),
			position = UDim2.fromOffset(0, 75),
			padding = Theme.Space.LG,
			gap = 0,
		}
		body.Parent = readingPane

		for index, line in ipairs(email.body) do
			Widgets.Text {
				text = line,
				color = Theme.Color.TextMuted,
				size = Theme.TextSize.Body,
				wrapped = true,
				size2 = UDim2.new(1, -Theme.Space.SM, 0, 0),
				autoSize = Enum.AutomaticSize.Y,
				height = 20,
				order = index,
				alignY = Enum.TextYAlignment.Top,
			}.Parent = body
		end

		if email.choices then
			local actions = Widgets.Panel {
				size = UDim2.new(1, -Theme.Space.SM, 0, 0),
				color = Theme.Color.Surface,
				order = #email.body + 1,
				list = { gap = Theme.Space.SM },
			}
			actions.AutomaticSize = Enum.AutomaticSize.Y
			actions.Parent = body

			Widgets.Text {
				text = "RÉPONDRE",
				color = Theme.Color.TextDisabled,
				font = Theme.Font.Bold,
				size = Theme.TextSize.Tiny,
				size2 = UDim2.new(1, 0, 0, 26),
				order = 0,
				alignY = Enum.TextYAlignment.Bottom,
			}.Parent = actions

			for index, choice in ipairs(email.choices) do
				Widgets.Button {
					text = choice.label,
					variant = index == 1 and "primary" or "ghost",
					order = index,
					onClick = function()
						-- Le client ne fait qu'annoncer l'intention : c'est le
						-- serveur qui valide le choix et applique les effets.
						api.request("mail/answer", { emailId = email.id, choiceIndex = index })
					end,
				}.Parent = actions
			end
		end
	end

	function renderList()
		listScroll:ClearAllChildren()

		Create("UIListLayout") {
			Padding = UDim.new(0, 2),
			SortOrder = Enum.SortOrder.LayoutOrder,
		}.Parent = listScroll

		Create("UIPadding") {
			PaddingTop = UDim.new(0, Theme.Space.SM),
			PaddingLeft = UDim.new(0, Theme.Space.SM),
			PaddingRight = UDim.new(0, Theme.Space.SM),
		}.Parent = listScroll

		for index, email in ipairs(state.emails) do
			local row = buildRow(email, email.id == state.selectedId, function()
				state.selectedId = email.id
				email.unread = false
				renderList()
				renderReading()
			end)
			row.LayoutOrder = index
			row.Parent = listScroll
		end
	end

	local root = Widgets.Panel {
		name = "MailRoot",
		color = Theme.Color.Desktop,

		listScroll,
		Widgets.Panel {
			size = UDim2.new(0, 1, 1, 0),
			position = UDim2.fromOffset(LIST_WIDTH, 0),
			color = Theme.Color.Border,
			name = "Separator",
		},
		readingPane,
	}
	root.Parent = container
	trove:Add(root)

	renderList()
	renderReading()

	return function()
		trove:Clean()
	end
end

return Mail
