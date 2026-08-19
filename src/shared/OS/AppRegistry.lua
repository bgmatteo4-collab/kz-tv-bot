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

export type AppDefinition = {
	id: string,
	name: string,
	glyph: string,
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
		accent = Color3.fromRGB(96, 165, 250),
		defaultSize = Vector2.new(820, 500),
		minSize = Vector2.new(560, 340),
		pinned = true,
		unlock = always,
		mount = require(Apps.Mail).mount,
	},
	{
		id = "shop",
		name = "Marché",
		glyph = "⌂",
		accent = Color3.fromRGB(74, 201, 126),
		defaultSize = Vector2.new(900, 560),
		minSize = Vector2.new(640, 400),
		pinned = true,
		unlock = always,
		mount = require(Apps.Shop).mount,
	},
	{
		id = "layout",
		name = "Aménagement",
		glyph = "◱",
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
		accent = Color3.fromRGB(230, 173, 66),
		defaultSize = Vector2.new(760, 460),
		unlock = always,
		mount = require(Apps.Files).mount,
	},
	{
		id = "analytics",
		name = "Analytique",
		glyph = "◧",
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
		defaultSize = Vector2.new(900, 560),
		-- La plateforme d'entreprise : n'existe pas pour un streamer solo.
		unlock = requiresStat("employees", 1),
		mount = require(Apps.Placeholder).mount,
	},
	{
		id = "rundown",
		name = "Conducteur",
		glyph = "☰",
		defaultSize = Vector2.new(900, 560),
		-- Composer une émission n'a de sens qu'avec un vrai décor.
		unlock = requiresStat("venueTier", 3),
		mount = require(Apps.Placeholder).mount,
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
