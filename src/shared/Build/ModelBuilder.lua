--!strict
--[[
	ModelBuilder — fabrique un objet à partir de primitives.

	Une boîte unique par objet, c'était lisible et c'était laid. Ici chaque
	catégorie a une recette : un bureau est un plateau et deux piètements,
	une lampe est un trépied, un pied et une source, une plante est un pot
	et des sphères. Rien qu'avec des parts, un cylindre et une sphère, on
	passe de « cube gris » à « objet reconnaissable ».

	Le même module sert au serveur pour construire l'objet réel et au
	client pour afficher le fantôme du mode construction : les deux ne
	peuvent donc pas diverger.

	Le jour où de vrais modèles 3D existeront, seule la fonction `build`
	changera — tout le reste du jeu l'appelle sans savoir ce qu'il y a
	dedans.
]]

local Placement = require(script.Parent.Parent.Config.Placement)
local Styles = require(script.Parent.Parent.Config.Styles)

local ModelBuilder = {}

type Palette = { base: Color3, accent: Color3, light: Color3 }

local DARK = Color3.fromRGB(26, 26, 32)
local SCREEN_OFF = Color3.fromRGB(8, 9, 12)
local METAL = Color3.fromRGB(96, 100, 110)

local function paletteOf(item): Palette
	local style = item.style and Styles.Get(item.style)
	if style then
		return {
			base = style.palette[1],
			accent = style.palette[2] or style.palette[1],
			light = style.palette[3] or style.palette[1],
		}
	end
	return { base = METAL, accent = METAL, light = METAL }
end

--- Une pièce du modèle. `offset` est exprimé dans le repère de l'objet,
--- donc l'objet entier suit sa rotation sans calcul supplémentaire.
local function piece(
	model: Model,
	name: string,
	size: Vector3,
	offset: CFrame,
	color: Color3,
	material: Enum.Material?,
	shape: Enum.PartType?
): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.Shape = shape or Enum.PartType.Block
	part.Anchored = true
	part.CanCollide = false
	part.CanQuery = false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	-- On mémorise le repère local : c'est ce qui permet de déplacer tout le
	-- modèle d'un bloc, sans le reconstruire, quand le fantôme suit le
	-- curseur.
	part:SetAttribute("LocalCFrame", offset)
	part.CFrame = offset
	part.Parent = model
	return part
end

-- ── Recettes ──────────────────────────────────────────────────────────────
-- Chaque recette reçoit le modèle, les dimensions hors tout de l'objet et sa
-- palette, et pose ses pièces autour de l'origine du modèle.

local recipes: { [string]: (Model, Vector3, Palette, any) -> () } = {}

recipes.desk = function(model, size, palette)
	local topThickness = 0.35
	piece(model, "Top", Vector3.new(size.X, topThickness, size.Z),
		CFrame.new(0, size.Y / 2 - topThickness / 2, 0), palette.base, Enum.Material.Wood)

	local legInset = 0.6
	for _, side in ipairs({ -1, 1 }) do
		piece(model, "Leg", Vector3.new(0.4, size.Y - topThickness, size.Z - legInset * 2),
			CFrame.new(side * (size.X / 2 - 0.4), -topThickness / 2, 0), DARK, Enum.Material.Metal)
	end

	-- Traverse arrière : c'est ce détail qui fait qu'un bureau ne ressemble
	-- plus à une table basse posée sur deux planches.
	piece(model, "Brace", Vector3.new(size.X - 1.6, 0.3, 0.3),
		CFrame.new(0, -size.Y / 4, -size.Z / 2 + 0.5), DARK, Enum.Material.Metal)
end

recipes.chair = function(model, size, palette)
	local seatY = -size.Y / 6
	piece(model, "Seat", Vector3.new(size.X, 0.45, size.Z * 0.9),
		CFrame.new(0, seatY, 0), palette.accent, Enum.Material.Fabric)
	piece(model, "Back", Vector3.new(size.X * 0.9, size.Y * 0.55, 0.35),
		CFrame.new(0, seatY + size.Y * 0.32, size.Z / 2 - 0.3), palette.accent, Enum.Material.Fabric)
	piece(model, "Pole", Vector3.new(0.45, size.Y * 0.4, 0.45),
		CFrame.new(0, seatY - size.Y * 0.24, 0), METAL, Enum.Material.Metal)
	piece(model, "Base", Vector3.new(size.X * 0.95, 0.25, size.Z * 0.95),
		CFrame.new(0, -size.Y / 2 + 0.15, 0), DARK, Enum.Material.Metal, Enum.PartType.Cylinder)
end

recipes.display = function(model, size, palette, item)
	piece(model, "Bezel", Vector3.new(size.X, size.Y, 0.28), CFrame.new(), DARK)
	-- La dalle est une pièce distincte : c'est elle que le jeu tague pour
	-- y projeter KZ OS, et elle doit rester plate et bien orientée.
	local screen = piece(model, "Screen", Vector3.new(size.X - 0.35, size.Y - 0.35, 0.12),
		CFrame.new(0, 0, -0.18), SCREEN_OFF)
	screen.Name = "Screen"

	piece(model, "Neck", Vector3.new(0.7, size.Y * 0.35, 0.5),
		CFrame.new(0, -size.Y / 2 - size.Y * 0.16, 0.1), DARK, Enum.Material.Metal)
	piece(model, "Foot", Vector3.new(size.X * 0.4, 0.22, 1.4),
		CFrame.new(0, -size.Y / 2 - size.Y * 0.33, 0.1), DARK, Enum.Material.Metal)

	if item.style == "gamer" then
		piece(model, "Accent", Vector3.new(size.X * 0.5, 0.1, 0.1),
			CFrame.new(0, -size.Y / 2 + 0.12, -0.16), palette.accent, Enum.Material.Neon)
	end
end

recipes.computer = function(model, size, palette, item)
	piece(model, "Case", size, CFrame.new(), DARK, Enum.Material.Metal)
	piece(model, "Front", Vector3.new(size.X * 0.9, size.Y * 0.9, 0.1),
		CFrame.new(0, 0, -size.Z / 2 - 0.02), Color3.fromRGB(18, 18, 22))

	-- Un panneau vitré qui laisse voir l'intérieur : c'est ce qui distingue
	-- une tour de gamer d'un carton posé debout.
	if item.style == "gamer" or item.style == "pro" then
		piece(model, "Glass", Vector3.new(0.12, size.Y * 0.8, size.Z * 0.8),
			CFrame.new(-size.X / 2 - 0.02, 0, 0), Color3.fromRGB(40, 44, 56), Enum.Material.Glass)
		piece(model, "Glow", Vector3.new(0.08, size.Y * 0.55, 0.4),
			CFrame.new(-size.X / 2 + 0.1, 0, 0), palette.accent, Enum.Material.Neon)
	end

	for _, side in ipairs({ -1, 1 }) do
		piece(model, "Foot", Vector3.new(0.3, 0.25, size.Z * 0.7),
			CFrame.new(side * (size.X / 2 - 0.3), -size.Y / 2 - 0.1, 0), DARK)
	end
end

recipes.camera = function(model, size, palette)
	piece(model, "Body", Vector3.new(size.X, size.Y * 0.7, size.Z * 0.8),
		CFrame.new(0, size.Y * 0.15, 0), DARK)
	-- Le cylindre de Roblox pointe vers son axe X : on le couche pour en
	-- faire un objectif tourné vers l'avant.
	piece(model, "Lens", Vector3.new(0.5, size.X * 0.7, size.X * 0.7),
		CFrame.new(0, size.Y * 0.15, -size.Z * 0.45) * CFrame.Angles(0, math.rad(90), 0),
		Color3.fromRGB(14, 16, 24), Enum.Material.Glass, Enum.PartType.Cylinder)
	piece(model, "Stand", Vector3.new(size.X * 0.7, size.Y * 0.35, size.Z * 0.5),
		CFrame.new(0, -size.Y * 0.32, 0), METAL, Enum.Material.Metal)
end

recipes.microphone = function(model, size, palette)
	piece(model, "Base", Vector3.new(size.X * 0.9, 0.2, size.X * 0.9),
		CFrame.new(0, -size.Y / 2 + 0.1, 0), DARK, Enum.Material.Metal, Enum.PartType.Cylinder)
	piece(model, "Pole", Vector3.new(0.18, size.Y * 0.55, 0.18),
		CFrame.new(0, -size.Y * 0.12, 0), METAL, Enum.Material.Metal)
	piece(model, "Capsule", Vector3.new(size.X * 0.6, size.X * 0.6, size.X * 0.6),
		CFrame.new(0, size.Y * 0.3, 0), palette.accent, Enum.Material.Metal, Enum.PartType.Ball)
	piece(model, "Grille", Vector3.new(size.X * 0.65, 0.12, size.X * 0.65),
		CFrame.new(0, size.Y * 0.3, 0), Color3.fromRGB(150, 152, 160), Enum.Material.DiamondPlate)
end

recipes.streamdeck = function(model, size, palette, item)
	-- Légèrement incliné vers le joueur, comme un vrai boîtier.
	local body = CFrame.Angles(math.rad(-18), 0, 0)
	piece(model, "Body", Vector3.new(size.X, 0.5, size.Z), body, DARK, Enum.Material.Metal)

	local keys = item.keys or 6
	local columns = keys <= 6 and 3 or (keys <= 15 and 5 or 8)
	local rows = math.ceil(keys / columns)
	local keyW = (size.X - 0.4) / columns
	local keyD = (size.Z - 0.3) / rows

	for index = 0, keys - 1 do
		local column = index % columns
		local row = math.floor(index / columns)
		piece(
			model,
			"Key",
			Vector3.new(keyW * 0.82, 0.12, keyD * 0.82),
			body * CFrame.new(
				-size.X / 2 + 0.2 + keyW * (column + 0.5),
				0.3,
				-size.Z / 2 + 0.15 + keyD * (row + 0.5)
			),
			index % 3 == 0 and palette.accent or Color3.fromRGB(52, 56, 66),
			Enum.Material.Neon
		)
	end
end

recipes.key = function(model, size, palette, item)
	-- Trépied : trois pieds inclinés, un mât, une source.
	for index = 0, 2 do
		local angle = math.rad(index * 120)
		piece(model, "Leg", Vector3.new(0.16, size.Y * 0.5, 0.16),
			CFrame.new(math.sin(angle) * 0.7, -size.Y * 0.28, math.cos(angle) * 0.7)
				* CFrame.Angles(math.rad(12) * math.cos(angle), angle, math.rad(-12) * math.sin(angle)),
			DARK, Enum.Material.Metal)
	end

	piece(model, "Mast", Vector3.new(0.2, size.Y * 0.45, 0.2),
		CFrame.new(0, size.Y * 0.05, 0), METAL, Enum.Material.Metal)

	local head = item.id == "light_ring" and "ring" or "box"

	if head == "ring" then
		piece(model, "Ring", Vector3.new(0.35, size.X * 1.6, size.X * 1.6),
			CFrame.new(0, size.Y * 0.34, 0) * CFrame.Angles(0, math.rad(90), 0),
			Color3.fromRGB(250, 248, 240), Enum.Material.Neon, Enum.PartType.Cylinder)
		piece(model, "Hole", Vector3.new(0.4, size.X * 0.9, size.X * 0.9),
			CFrame.new(0, size.Y * 0.34, 0) * CFrame.Angles(0, math.rad(90), 0),
			DARK, Enum.Material.SmoothPlastic, Enum.PartType.Cylinder)
	else
		piece(model, "Diffuser", Vector3.new(size.X * 1.5, size.X * 1.5, 0.3),
			CFrame.new(0, size.Y * 0.3, -0.1), Color3.fromRGB(252, 250, 244), Enum.Material.Neon)
		piece(model, "Housing", Vector3.new(size.X * 1.6, size.X * 1.6, 0.35),
			CFrame.new(0, size.Y * 0.3, 0.15), DARK, Enum.Material.Metal)
	end
end

recipes.led = function(model, size, palette, item)
	if item.category == "led" and item.id == "led_hexagons" then
		-- Neuf pastilles en nid d'abeille, faute de vrai hexagone.
		for index = 0, 8 do
			local column = index % 3
			local row = math.floor(index / 3)
			local stagger = (row % 2 == 0) and 0 or size.X / 6
			piece(model, "Cell", Vector3.new(0.2, size.X / 3.4, size.X / 3.4),
				CFrame.new(
					-size.X / 3 + column * (size.X / 3) + stagger,
					-size.Y / 3 + row * (size.Y / 3),
					0
				) * CFrame.Angles(0, math.rad(90), 0),
				palette.accent, Enum.Material.Neon, Enum.PartType.Cylinder)
		end
		return
	end

	piece(model, "Tube", size, CFrame.new(), palette.accent, Enum.Material.Neon)
end

recipes.object = function(model, size, palette, item)
	if item.category == "object" and (item.id == "plant_small" or item.id == "plant_large") then
		local potHeight = size.Y * 0.35
		piece(model, "Pot", Vector3.new(size.X * 0.7, potHeight, size.X * 0.7),
			CFrame.new(0, -size.Y / 2 + potHeight / 2, 0),
			Color3.fromRGB(168, 108, 78), Enum.Material.Slate, Enum.PartType.Cylinder)

		local leaf = Color3.fromRGB(76, 124, 72)
		piece(model, "Foliage", Vector3.new(size.X * 0.95, size.Y * 0.55, size.X * 0.95),
			CFrame.new(0, size.Y * 0.08, 0), leaf, Enum.Material.Grass, Enum.PartType.Ball)
		piece(model, "FoliageTop", Vector3.new(size.X * 0.6, size.X * 0.6, size.X * 0.6),
			CFrame.new(size.X * 0.15, size.Y * 0.34, -size.X * 0.1), leaf, Enum.Material.Grass, Enum.PartType.Ball)
		return
	end

	if item.id == "arcade_cabinet" then
		piece(model, "Cabinet", Vector3.new(size.X, size.Y, size.Z), CFrame.new(), palette.base, Enum.Material.Wood)
		piece(model, "Marquee", Vector3.new(size.X * 0.9, size.Y * 0.14, 0.2),
			CFrame.new(0, size.Y * 0.36, -size.Z / 2 - 0.05), palette.accent, Enum.Material.Neon)
		piece(model, "Screen", Vector3.new(size.X * 0.75, size.Y * 0.3, 0.15),
			CFrame.new(0, size.Y * 0.12, -size.Z / 2 - 0.02), SCREEN_OFF)
		piece(model, "Panel", Vector3.new(size.X * 0.95, 0.3, size.Z * 0.4),
			CFrame.new(0, -size.Y * 0.1, -size.Z / 2 + 0.6) * CFrame.Angles(math.rad(-20), 0, 0),
			DARK, Enum.Material.Metal)
		piece(model, "Stick", Vector3.new(0.16, 0.7, 0.16),
			CFrame.new(-size.X * 0.2, -size.Y * 0.02, -size.Z / 2 + 0.6), Color3.fromRGB(210, 60, 60))
		return
	end

	-- Objet générique : un volume principal et un socle, ce qui suffit à ne
	-- plus ressembler à un cube posé au sol.
	piece(model, "Body", Vector3.new(size.X, size.Y * 0.85, size.Z),
		CFrame.new(0, size.Y * 0.075, 0), palette.base, Enum.Material.Wood)
	piece(model, "Base", Vector3.new(size.X * 1.05, size.Y * 0.12, size.Z * 1.05),
		CFrame.new(0, -size.Y * 0.44, 0), DARK)
end

recipes.wall = function(model, size, palette)
	piece(model, "Frame", Vector3.new(size.X, size.Y, math.max(size.Z, 0.16)), CFrame.new(), DARK, Enum.Material.Wood)
	piece(model, "Print", Vector3.new(size.X - 0.4, size.Y - 0.4, 0.08),
		CFrame.new(0, 0, -math.max(size.Z, 0.16) / 2 - 0.02), palette.accent)
end

recipes.acoustic = function(model, size, palette)
	-- Une grille de carreaux plutôt qu'un panneau plein : c'est la texture
	-- qui rend l'acoustique reconnaissable au premier coup d'oeil.
	local columns, rows = 3, 2
	local tileW = size.X / columns
	local tileH = size.Y / rows

	for column = 0, columns - 1 do
		for row = 0, rows - 1 do
			piece(model, "Tile", Vector3.new(tileW * 0.9, tileH * 0.9, math.max(size.Z, 0.3)),
				CFrame.new(
					-size.X / 2 + tileW * (column + 0.5),
					-size.Y / 2 + tileH * (row + 0.5),
					0
				),
				(column + row) % 2 == 0 and palette.base or palette.accent,
				Enum.Material.Fabric)
		end
	end
end

recipes.backdrop = function(model, size, palette)
	local green = Color3.fromRGB(46, 178, 84)
	piece(model, "Cloth", Vector3.new(size.X, size.Y, 0.2), CFrame.new(), green, Enum.Material.Fabric)
	piece(model, "BarTop", Vector3.new(size.X + 0.6, 0.22, 0.22),
		CFrame.new(0, size.Y / 2 + 0.1, 0), METAL, Enum.Material.Metal)
	for _, side in ipairs({ -1, 1 }) do
		piece(model, "Post", Vector3.new(0.2, size.Y, 0.2),
			CFrame.new(side * (size.X / 2 + 0.2), 0, 0), METAL, Enum.Material.Metal)
	end
end

recipes.storage = function(model, size, palette)
	piece(model, "Shell", size, CFrame.new(), palette.base, Enum.Material.Wood)
	piece(model, "Inner", Vector3.new(size.X - 0.5, size.Y - 0.5, size.Z - 0.3),
		CFrame.new(0, 0, -0.2), Color3.fromRGB(30, 28, 30))
	piece(model, "Divider", Vector3.new(0.16, size.Y - 0.5, size.Z - 0.3),
		CFrame.new(0, 0, -0.2), palette.base, Enum.Material.Wood)
	piece(model, "Shelf", Vector3.new(size.X - 0.5, 0.16, size.Z - 0.3),
		CFrame.new(0, 0, -0.2), palette.base, Enum.Material.Wood)
end

recipes.guest = function(model, size, palette)
	piece(model, "Seat", Vector3.new(size.X, 0.5, size.Z * 0.8),
		CFrame.new(0, -size.Y * 0.1, 0), palette.accent, Enum.Material.Fabric)
	piece(model, "Back", Vector3.new(size.X, size.Y * 0.6, 0.4),
		CFrame.new(0, size.Y * 0.2, size.Z / 2 - 0.25), palette.accent, Enum.Material.Fabric)
	for _, side in ipairs({ -1, 1 }) do
		piece(model, "Arm", Vector3.new(0.4, size.Y * 0.4, size.Z * 0.75),
			CFrame.new(side * (size.X / 2 - 0.2), size.Y * 0.05, 0), palette.base, Enum.Material.Fabric)
	end
end

-- ── Assemblage ────────────────────────────────────────────────────────────

--- Construit l'objet complet, positionné et orienté. Les recettes
--- travaillent dans le repère local : on applique le repère monde à la fin,
--- ce qui garde chaque recette lisible.
function ModelBuilder.build(item: any, worldCFrame: CFrame): Model
	local model = Instance.new("Model")
	model.Name = item.id

	local size = Placement.GetSize(item)
	local palette = paletteOf(item)

	local recipe = recipes[item.category]
	if not recipe then
		-- Familles sans recette dédiée : un volume simple, mais teinté par
		-- le style plutôt que gris.
		piece(model, "Body", size, CFrame.new(), palette.base)
	else
		recipe(model, size, palette, item)
	end

	ModelBuilder.setPivot(model, worldCFrame)

	return model
end

--- Replace un modèle déjà construit. Chaque pièce retrouve sa position à
--- partir du repère local mémorisé à sa création : pas de reconstruction,
--- pas de dérive après mille déplacements.
function ModelBuilder.setPivot(model: Model, worldCFrame: CFrame)
	for _, part in ipairs(model:GetChildren()) do
		if part:IsA("BasePart") then
			local localCFrame = part:GetAttribute("LocalCFrame")
			if typeof(localCFrame) == "CFrame" then
				part.CFrame = worldCFrame * localCFrame
			end
		end
	end
end

--- Le fantôme du mode construction : le même objet, translucide et teinté.
function ModelBuilder.buildGhost(item: any, worldCFrame: CFrame, color: Color3): Model
	local model = ModelBuilder.build(item, worldCFrame)

	for _, part in ipairs(model:GetDescendants()) do
		if part:IsA("BasePart") then
			part.Transparency = 0.5
			part.Color = color
			part.Material = Enum.Material.SmoothPlastic
			part.CanQuery = false
		end
	end

	return model
end

return ModelBuilder
