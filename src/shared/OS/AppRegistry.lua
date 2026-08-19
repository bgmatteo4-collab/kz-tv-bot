--!strict
--[[
	AppRegistry — le catalogue des logiciels installables sur KZ OS.

	Une app n'est pas un écran de plus : c'est un palier de progression.
	Chaque entrée déclare sa condition de déblocage, et le dock ne montre
	QUE ce qui est débloqué. Le joueur ne sait pas qu'une plateforme RH
	existe tant qu'il n'a pas d'employés — il la découvre par un mail.

	Ajouter une app = ajouter un module dans OS/Apps et une ligne ici.
]]

local Apps = script.Parent.Apps
local Dev = require(script.Parent.Parent.Config.Dev)

export type AppDefinition = {
	id: string,
	name: string,
	glyph: string,
	-- Une ou deux lettres pour l'icône du bureau. On n'utilise pas le
	-- glyphe Unicode : rien ne garantit que la police du client le
	-- contienne, et une icône invisible rend l'application inaccessible.
	monogram: string?,
	accent: Color3?,
	defaultSize: Vector2?,
	minSize: Vector2?,
	pinned: boolean?,
	-- Reçoit l'état du joueur, renvoie true si l'icône doit apparaître.
	unlock: (state: any) -> boolean,
	-- Construit le contenu de la fenêtre. Peut renvoyer une fonction de
	-- nettoyage, appelée à la fermeture.
	mount: (container: Frame, api: any) -> (() -> ())?,
}

local function always(): boolean
	return true
end

--- Les maquettes sont visibles tant que le prototypage est actif, ou une
--- fois la condition réelle atteinte. On peut donc les regarder tout de
--- suite sans casser la courbe de progression prévue.
local function prototypeOr(condition: (any) -> boolean)
	return function(state: any): boolean
		return Dev.PrototypesEnabled or condition(state)
	end
end

--- Beaucoup de déblocages suivent la même forme : "à partir de N abonnés",
--- "à partir de N employés". On factorise pour que le catalogue reste lisible.
local function requiresStat(statName: string, threshold: number)
	return function(state: any): boolean
		if not state or not state.stats then
			return false
		end
		return (state.stats[statName] or 0) >= threshold
	end
end

local registry: { AppDefinition } = {
	{
		id = "studio",
		name = "KZ Studio",
		glyph = "◉",
		monogram = "KZ",
		accent = Color3.fromRGB(255, 61, 61),
		defaultSize = Vector2.new(860, 520),
		minSize = Vector2.new(640, 400),
		pinned = true,
		unlock = always,
		mount = require(Apps.Studio).mount,
	},
	{
		id = "mail",
		name = "Courrier",
		glyph = "✉",
		monogram = "@",
		accent = Color3.fromRGB(96, 165, 250),
		defaultSize = Vector2.new(820, 500),
		minSize = Vector2.new(560, 340),
		pinned = true,
		unlock = always,
		mount = require(Apps.Mail).mount,
	},
	{
		id = "browser",
		name = "Navigateur",
		glyph = "◍",
		monogram = "Web",
		accent = Color3.fromRGB(74, 201, 126),
		defaultSize = Vector2.new(1000, 620),
		minSize = Vector2.new(700, 440),
		pinned = true,
		unlock = always,
		mount = require(Apps.Browser).mount,
	},
	{
		id = "layout",
		name = "Aménagement",
		glyph = "◱",
		monogram = "Am",
		accent = Color3.fromRGB(230, 173, 66),
		defaultSize = Vector2.new(760, 520),
		minSize = Vector2.new(520, 360),
		pinned = true,
		unlock = always,
		mount = require(Apps.Layout).mount,
	},
	{
		id = "files",
		name = "Fichiers",
		glyph = "▤",
		monogram = "Fi",
		accent = Color3.fromRGB(230, 173, 66),
		defaultSize = Vector2.new(760, 460),
		unlock = always,
		mount = require(Apps.Files).mount,
	},
	{
		id = "analytics",
		name = "Analytique",
		glyph = "◧",
		monogram = "An",
		accent = Color3.fromRGB(74, 201, 126),
		defaultSize = Vector2.new(880, 540),
		-- Inutile tant qu'il n'y a rien à analyser : arrive au 3e live.
		unlock = requiresStat("streamsCompleted", 3),
		mount = require(Apps.Placeholder).mount,
	},
	{
		id = "company",
		name = "Gestion",
		glyph = "▣",
		monogram = "RH",
		defaultSize = Vector2.new(900, 560),
		-- La plateforme d'entreprise : n'existe pas pour un streamer solo.
		unlock = requiresStat("employees", 1),
		mount = require(Apps.Placeholder).mount,
	},
	{
		id = "rundown",
		name = "Conducteur",
		glyph = "☰",
		monogram = "Cd",
		accent = Color3.fromRGB(168, 122, 236),
		defaultSize = Vector2.new(1060, 640),
		minSize = Vector2.new(820, 480),
		-- Composer une émission n'a de sens qu'avec un vrai décor.
		unlock = prototypeOr(requiresStat("venueTier", 3)),
		mount = require(Apps.RundownApp).mount,
	},
	{
		id = "control",
		name = "Régie",
		glyph = "◨",
		monogram = "Rg",
		accent = Color3.fromRGB(255, 61, 61),
		defaultSize = Vector2.new(1120, 660),
		minSize = Vector2.new(900, 520),
		-- La régie suppose plusieurs caméras, donc un vrai plateau.
		unlock = prototypeOr(requiresStat("venueTier", 4)),
		mount = require(Apps.Control).mount,
	},
}

local AppRegistry = {}

function AppRegistry.GetAll(): { AppDefinition }
	return registry
end

function AppRegistry.Get(id: string): AppDefinition?
	for _, app in ipairs(registry) do
		if app.id == id then
			return app
		end
	end
	return nil
end

--- Les apps visibles dans le dock pour cet état de joueur, dans l'ordre
--- du catalogue (qui est aussi l'ordre de déblocage).
function AppRegistry.GetUnlocked(state: any): { AppDefinition }
	local unlocked = {}
	for _, app in ipairs(registry) do
		if app.unlock(state) then
			table.insert(unlocked, app)
		end
	end
	return unlocked
end

return AppRegistry
