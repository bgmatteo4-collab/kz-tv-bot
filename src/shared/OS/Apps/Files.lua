--!strict
--[[
	Fichiers — l'explorateur.

	Les clips enregistrés pendant les lives atterrissent ici comme de vrais
	fichiers, avec une taille et une date. Plus tard, on les glissera dans
	le logiciel de montage. Pour l'instant l'app prouve la navigation et
	sert de dépôt aux rushs.
]]

local Shared = script.Parent.Parent.Parent
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)
local Widgets = require(Shared.OS.Widgets)

local Files = {}

local SIDEBAR_WIDTH = 170

local FOLDERS = {
	{ id = "clips", name = "Clips", glyph = "◐" },
	{ id = "rushes", name = "Rushs", glyph = "▤" },
	{ id = "thumbnails", name = "Miniatures", glyph = "◨" },
	{ id = "contracts", name = "Contrats", glyph = "▦" },
}

local function formatSize(megabytes: number): string
	if megabytes >= 1024 then
		return string.format("%.1f Go", megabytes / 1024)
	end
	return string.format("%d Mo", math.round(megabytes))
end

function Files.mount(container: Frame, api): (() -> ())?
	local trove = Trove.new()

	local currentFolder = "clips"

	local fileList = Widgets.Scroll {
		size = UDim2.new(1, -SIDEBAR_WIDTH, 1, 0),
		position = UDim2.fromOffset(SIDEBAR_WIDTH, 0),
		padding = Theme.Space.MD,
		gap = 2,
	}

	local sidebar = Widgets.Panel {
		name = "Sidebar",
		size = UDim2.new(0, SIDEBAR_WIDTH, 1, 0),
		color = Theme.Color.SurfaceRaised,
		padding = Theme.Space.SM,
		list = { gap = 2 },
	}

	local renderFiles

	local function renderSidebar()
		for _, child in ipairs(sidebar:GetChildren()) do
			if child:IsA("GuiButton") then
				child:Destroy()
			end
		end

		for index, folder in ipairs(FOLDERS) do
			Widgets.ListRow {
				height = 32,
				order = index,
				selected = folder.id == currentFolder,
				onClick = function()
					currentFolder = folder.id
					renderSidebar()
					renderFiles()
				end,

				Widgets.Text {
					text = string.format("%s   %s", folder.glyph, folder.name),
					size = Theme.TextSize.Small,
					color = folder.id == currentFolder and Theme.Color.Text or Theme.Color.TextMuted,
					size2 = UDim2.fromScale(1, 1),
				},
			}.Parent = sidebar
		end
	end

	function renderFiles()
		fileList:ClearAllChildren()

		local files = (api.state.files and api.state.files[currentFolder]) or {}

		if #files == 0 then
			Widgets.Text {
				text = "Ce dossier est vide.",
				color = Theme.Color.TextDisabled,
				size = Theme.TextSize.Small,
				align = Enum.TextXAlignment.Center,
				size2 = UDim2.new(1, 0, 0, 60),
			}.Parent = fileList
			return
		end

		for index, file in ipairs(files) do
			Widgets.ListRow {
				height = 44,
				order = index,

				Widgets.Text {
					text = file.name,
					font = Theme.Font.Medium,
					size = Theme.TextSize.Small,
					size2 = UDim2.new(1, -90, 0, 16),
					truncate = true,
				},
				Widgets.Text {
					text = string.format("jour %d", file.day or 0),
					color = Theme.Color.TextDisabled,
					size = Theme.TextSize.Tiny,
					size2 = UDim2.new(1, -90, 0, 14),
					position = UDim2.fromOffset(0, 16),
				},
				Widgets.Text {
					text = formatSize(file.size or 0),
					color = Theme.Color.TextMuted,
					font = Theme.Font.Mono,
					size = Theme.TextSize.Tiny,
					align = Enum.TextXAlignment.Right,
					size2 = UDim2.new(0, 80, 1, 0),
					position = UDim2.new(1, -80, 0, 0),
				},
			}.Parent = fileList
		end
	end

	local root = Widgets.Panel {
		name = "FilesRoot",
		color = Theme.Color.Surface,

		sidebar,
		fileList,
	}
	root.Parent = container
	trove:Add(root)

	local function signature(): string
		local parts = {}
		for folder, entries in pairs(api.state.files or {}) do
			table.insert(parts, string.format("%s:%d", folder, #entries))
		end
		table.sort(parts)
		return table.concat(parts, ",")
	end

	local lastSignature = signature()

	renderSidebar()
	renderFiles()

	trove:Add(api.stateChanged:Connect(function()
		local current = signature()
		if current ~= lastSignature then
			lastSignature = current
			renderFiles()
		end
	end))

	return function()
		trove:Clean()
	end
end

return Files
