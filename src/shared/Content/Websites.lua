--!strict
--[[
	Websites — les boutiques en ligne du jeu.

	Une liste unique triée par catégorie, c'était une base de données, pas
	une boutique. Ici chaque marque a son site, avec sa charte, son ton et
	sa mise en page : on ne commande pas une softbox chez un revendeur de
	matériel de tournage comme on commande une guirlande sur une place de
	marché.

	Ça sert aussi la satire : le mastodonte qui vend tout et n'importe
	quoi, la marque gaming qui hurle, le revendeur pro austère, la brocante
	en ligne au design de 2009.

	Un site sélectionne des objets du catalogue par marque et/ou par
	famille. Ajouter une boutique ne demande donc aucune ligne de logique.
]]

export type Theme = {
	background: Color3,
	surface: Color3,
	text: Color3,
	muted: Color3,
	accent: Color3,
	onAccent: Color3,
	banner: Color3,
}

export type Website = {
	id: string,
	domain: string,
	name: string,
	tagline: string,
	notice: string,
	layout: "grid" | "list",
	theme: Theme,
	brands: { string }?,
	families: { string }?,
}

local Websites: { Website } = {
	{
		id = "kliknbuy",
		domain = "kliknbuy.fr",
		name = "KlikNBuy",
		tagline = "Tout. Tout de suite. À peu près.",
		notice = "Livraison offerte dès 0 € d'achat · 4,7★ sur 1 203 402 avis dont 800 000 vérifiés",
		layout = "list",
		brands = { "Genelux", "générique" },
		theme = {
			background = Color3.fromRGB(245, 245, 242),
			surface = Color3.fromRGB(255, 255, 255),
			text = Color3.fromRGB(28, 30, 34),
			muted = Color3.fromRGB(112, 116, 124),
			accent = Color3.fromRGB(245, 152, 32),
			onAccent = Color3.fromRGB(30, 22, 8),
			banner = Color3.fromRGB(24, 34, 52),
		},
	},

	{
		id = "novaris",
		domain = "novaris.fr",
		name = "NOVARIS",
		tagline = "Informatique et affichage professionnel",
		notice = "Garantie 3 ans sur site · Devis entreprise sous 24 h",
		layout = "grid",
		brands = { "Novaris" },
		theme = {
			background = Color3.fromRGB(244, 247, 251),
			surface = Color3.fromRGB(255, 255, 255),
			text = Color3.fromRGB(20, 28, 42),
			muted = Color3.fromRGB(104, 118, 140),
			accent = Color3.fromRGB(28, 96, 210),
			onAccent = Color3.fromRGB(255, 255, 255),
			banner = Color3.fromRGB(14, 34, 66),
		},
	},

	{
		id = "cadran",
		domain = "cadran-pro.fr",
		name = "Cadran Pro",
		tagline = "Matériel de tournage et de plateau",
		notice = "Réservé aux professionnels · Location possible sur demande",
		layout = "grid",
		brands = { "Cadran", "Orell" },
		theme = {
			background = Color3.fromRGB(30, 31, 34),
			surface = Color3.fromRGB(41, 43, 48),
			text = Color3.fromRGB(238, 238, 236),
			muted = Color3.fromRGB(150, 152, 158),
			accent = Color3.fromRGB(226, 196, 118),
			onAccent = Color3.fromRGB(28, 24, 14),
			banner = Color3.fromRGB(18, 19, 22),
		},
	},

	{
		id = "auvox",
		domain = "auvox-audio.com",
		name = "Auvox",
		tagline = "Le son, d'abord.",
		notice = "Écoute comparative en magasin · Retour 30 jours",
		layout = "list",
		brands = { "Auvox" },
		theme = {
			background = Color3.fromRGB(24, 28, 34),
			surface = Color3.fromRGB(34, 39, 47),
			text = Color3.fromRGB(232, 238, 246),
			muted = Color3.fromRGB(140, 150, 164),
			accent = Color3.fromRGB(92, 200, 178),
			onAccent = Color3.fromRGB(10, 30, 28),
			banner = Color3.fromRGB(16, 20, 26),
		},
	},

	{
		id = "lumen",
		domain = "lumen.gg",
		name = "LUMEN",
		tagline = "Ta pièce, ta lumière, ton ambiance.",
		notice = "Application mobile requise pour certaines fonctions · Compte obligatoire",
		layout = "grid",
		brands = { "Lumen" },
		theme = {
			background = Color3.fromRGB(12, 10, 20),
			surface = Color3.fromRGB(24, 20, 40),
			text = Color3.fromRGB(240, 236, 255),
			muted = Color3.fromRGB(150, 140, 190),
			accent = Color3.fromRGB(168, 92, 255),
			onAccent = Color3.fromRGB(255, 255, 255),
			banner = Color3.fromRGB(48, 18, 92),
		},
	},

	{
		id = "fibre",
		domain = "fibre-and-co.fr",
		name = "Fibre & Co",
		tagline = "Mobilier durable, fabriqué en Europe",
		notice = "Livraison sur rendez-vous · Reprise de l'ancien meuble",
		layout = "grid",
		brands = { "Fibre & Co" },
		theme = {
			background = Color3.fromRGB(248, 244, 236),
			surface = Color3.fromRGB(255, 253, 249),
			text = Color3.fromRGB(48, 40, 32),
			muted = Color3.fromRGB(134, 122, 106),
			accent = Color3.fromRGB(122, 138, 88),
			onAccent = Color3.fromRGB(255, 255, 255),
			banner = Color3.fromRGB(88, 74, 58),
		},
	},

	{
		id = "hexar",
		domain = "hexar.gg",
		name = "HEXAR",
		tagline = "DOMINE TON SETUP.",
		notice = "RGB 16,7 M de couleurs · Édition limitée en permanence depuis 2019",
		layout = "grid",
		brands = { "Hexar" },
		theme = {
			background = Color3.fromRGB(10, 10, 14),
			surface = Color3.fromRGB(22, 22, 30),
			text = Color3.fromRGB(240, 240, 248),
			muted = Color3.fromRGB(138, 138, 156),
			accent = Color3.fromRGB(226, 42, 92),
			onAccent = Color3.fromRGB(255, 255, 255),
			banner = Color3.fromRGB(28, 8, 24),
		},
	},

	{
		id = "voltek",
		domain = "voltek-elec.fr",
		name = "Voltek Électricité",
		tagline = "Distribution et protection électrique",
		notice = "Conforme NF C 15-100 · Fiche technique fournie",
		layout = "list",
		families = { "power" },
		theme = {
			background = Color3.fromRGB(240, 240, 236),
			surface = Color3.fromRGB(252, 252, 250),
			text = Color3.fromRGB(34, 34, 32),
			muted = Color3.fromRGB(118, 118, 112),
			accent = Color3.fromRGB(214, 168, 24),
			onAccent = Color3.fromRGB(30, 26, 8),
			banner = Color3.fromRGB(52, 52, 48),
		},
	},

	{
		id = "letroc",
		domain = "letroc.fr",
		name = "LeTroc",
		tagline = "Occasion, vintage, et trucs bizarres",
		notice = "Entre particuliers · Remise en main propre conseillée · Aucune garantie",
		layout = "list",
		brands = { "brocante" },
		theme = {
			background = Color3.fromRGB(236, 238, 230),
			surface = Color3.fromRGB(250, 250, 244),
			text = Color3.fromRGB(38, 42, 36),
			muted = Color3.fromRGB(120, 126, 114),
			accent = Color3.fromRGB(96, 138, 76),
			onAccent = Color3.fromRGB(255, 255, 255),
			banner = Color3.fromRGB(70, 92, 60),
		},
	},
}

local WebsitesModule = {}

WebsitesModule.All = Websites

function WebsitesModule.Get(id: string): Website?
	for _, site in ipairs(Websites) do
		if site.id == id then
			return site
		end
	end
	return nil
end

local function contains(list: { string }?, value: string?): boolean
	if not list then
		return true
	end
	for _, entry in ipairs(list) do
		if entry == value then
			return true
		end
	end
	return false
end

--- Le site vend-il cet objet ? Un objet fourni au départ n'est jamais en
--- vente : il est déjà là, et le proposer permettrait d'en empiler.
function WebsitesModule.Sells(site: Website, item: any): boolean
	if item.price <= 0 then
		return false
	end
	return contains(site.brands, item.brand) and contains(site.families, item.family)
end

return WebsitesModule
