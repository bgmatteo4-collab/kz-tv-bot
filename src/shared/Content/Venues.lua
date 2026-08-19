--!strict
--[[
	Venues — les lieux que l'on peut occuper.

	MAQUETTE. Rien n'est encore jouable : ce module existe pour fixer le
	vocabulaire et montrer à quoi ressemblera la décision. Les plans sont
	décrits comme des rectangles en mètres, ce qui suffit à dessiner une vue
	de dessus et servira de base au vrai système de cloisons.

	La chambre et l'appartement sont subis. À partir du local, on choisit —
	et c'est la première vraie décision d'entreprise du jeu : un hangar pas
	cher mais à l'autre bout de la ville, ou un plateau de bureaux propre et
	hors de prix.
]]

export type Zone = {
	name: string,
	-- Rectangle en mètres, origine en bas à gauche du plan.
	x: number,
	y: number,
	width: number,
	depth: number,
	kind: "plateau" | "regie" | "montage" | "detente" | "stockage" | "bureau" | "public" | "libre",
}

export type Venue = {
	id: string,
	name: string,
	district: string,
	tier: number,
	rent: number,
	deposit: number,
	area: number,
	ceiling: number,
	-- Dimensions du plan, en mètres.
	planWidth: number,
	planDepth: number,
	zones: { Zone },
	perks: { string },
	flaws: { string },
	pitch: string,
	available: boolean,
}

local Venues: { Venue } = {
	{
		id = "bedroom",
		name = "La chambre",
		district = "chez tes parents",
		tier = 1,
		rent = 0,
		deposit = 0,
		area = 14,
		ceiling = 2.5,
		planWidth = 4,
		planDepth = 3.5,
		zones = {
			{ name = "Setup", x = 0, y = 2.2, width = 2.6, depth = 1.3, kind = "plateau" },
			{ name = "Lit", x = 2.8, y = 0.4, width = 1, depth = 2.2, kind = "detente" },
		},
		perks = { "Loyer nul", "Personne à prévenir" },
		flaws = { "Aucune isolation", "Le bruit traverse", "Deux mètres de mur libre" },
		pitch = "Ça a commencé ici pour tout le monde, et ça suffit plus longtemps qu'on ne croit.",
		available = true,
	},

	{
		id = "studio_flat",
		name = "Studio 26 m²",
		district = "quartier de la gare",
		tier = 2,
		rent = 540,
		deposit = 1080,
		area = 26,
		ceiling = 2.6,
		planWidth = 6.2,
		planDepth = 4.2,
		zones = {
			{ name = "Plateau", x = 0.3, y = 2.4, width = 3.2, depth = 1.6, kind = "plateau" },
			{ name = "Montage", x = 3.8, y = 2.4, width = 2.1, depth = 1.6, kind = "montage" },
			{ name = "Vie", x = 0.3, y = 0.3, width = 5.6, depth = 1.8, kind = "detente" },
		},
		perks = { "Tu es enfin chez toi", "Voisins prévenus", "Fibre" },
		flaws = { "Le lit est dans le champ", "Un seul mur exploitable" },
		pitch = "Le premier lieu où personne ne frappe à la porte pour te dire de baisser le son.",
		available = true,
	},

	{
		id = "shop_front",
		name = "Ancien commerce",
		district = "rue Berthelot",
		tier = 3,
		rent = 1250,
		deposit = 3750,
		area = 64,
		ceiling = 3.2,
		planWidth = 8,
		planDepth = 8,
		zones = {
			{ name = "Plateau", x = 0.4, y = 4.4, width = 4.6, depth = 3.2, kind = "plateau" },
			{ name = "Régie", x = 5.4, y = 4.4, width = 2.2, depth = 3.2, kind = "regie" },
			{ name = "Montage", x = 0.4, y = 2.2, width = 3, depth = 1.8, kind = "montage" },
			{ name = "Détente", x = 3.8, y = 2.2, width = 3.8, depth = 1.8, kind = "detente" },
			{ name = "Stock", x = 0.4, y = 0.4, width = 7.2, depth = 1.4, kind = "stockage" },
		},
		perks = { "Vitrine sur rue", "Rideau métallique", "Arrière-boutique" },
		flaws = { "Vitrine plein sud", "Aucune isolation phonique", "Chauffage électrique" },
		pitch = "Une ancienne boutique de téléphonie. La vitrine est un cadeau et un problème : lumière gratuite le matin, impossible à filmer l'après-midi.",
		available = true,
	},

	{
		id = "office_floor",
		name = "Plateau de bureaux",
		district = "zone d'activité nord",
		tier = 3,
		rent = 1900,
		deposit = 5700,
		area = 95,
		ceiling = 2.8,
		planWidth = 12,
		planDepth = 8,
		zones = {
			{ name = "Plateau", x = 0.5, y = 4.5, width = 6, depth = 3, kind = "plateau" },
			{ name = "Régie", x = 7, y = 4.5, width = 2.4, depth = 3, kind = "regie" },
			{ name = "Bureaux", x = 9.8, y = 4.5, width = 1.7, depth = 3, kind = "bureau" },
			{ name = "Montage", x = 0.5, y = 2.4, width = 4, depth = 1.7, kind = "montage" },
			{ name = "Détente", x = 5, y = 2.4, width = 3.4, depth = 1.7, kind = "detente" },
			{ name = "Stock", x = 8.8, y = 2.4, width = 2.7, depth = 1.7, kind = "stockage" },
			{ name = "Libre", x = 0.5, y = 0.5, width = 11, depth = 1.5, kind = "libre" },
		},
		perks = { "Cloisons déjà posées", "Faux plafond technique", "Parking" },
		flaws = { "Aucun caractère", "Loyer élevé", "À vingt minutes du centre" },
		pitch = "Propre, fonctionnel, et d'une tristesse absolue. Tout le travail de décoration reste à faire, mais rien ne s'y oppose.",
		available = true,
	},

	{
		id = "warehouse",
		name = "Hangar 210 m²",
		district = "ancienne friche",
		tier = 4,
		rent = 2400,
		deposit = 7200,
		area = 210,
		ceiling = 5.5,
		planWidth = 15,
		planDepth = 14,
		zones = {
			{ name = "Plateau principal", x = 0.6, y = 7.5, width = 8, depth = 6, kind = "plateau" },
			{ name = "Gradins", x = 9, y = 7.5, width = 5.4, depth = 6, kind = "public" },
			{ name = "Régie", x = 0.6, y = 4.5, width = 3.4, depth = 2.5, kind = "regie" },
			{ name = "Montage", x = 4.4, y = 4.5, width = 4, depth = 2.5, kind = "montage" },
			{ name = "Bureaux", x = 8.8, y = 4.5, width = 5.6, depth = 2.5, kind = "bureau" },
			{ name = "Loges", x = 0.6, y = 2, width = 4.4, depth = 2, kind = "detente" },
			{ name = "Stock", x = 5.4, y = 2, width = 9, depth = 2, kind = "stockage" },
		},
		perks = { "5,5 m sous plafond", "Accueil du public possible", "Quai de livraison" },
		flaws = { "Écho terrible", "Aucun chauffage", "Quartier désert le soir" },
		pitch = "Le volume est là, tout le reste est à construire. C'est le seul lieu où un événement avec du public devient possible.",
		available = true,
	},
}

local VenuesModule = {}

VenuesModule.All = Venues

function VenuesModule.Get(id: string): Venue?
	for _, venue in ipairs(Venues) do
		if venue.id == id then
			return venue
		end
	end
	return nil
end

--- Couleur d'une zone sur le plan. Le code couleur doit rester le même
--- partout dans le jeu : c'est lui que le joueur apprendra.
VenuesModule.ZoneColor = {
	plateau = Color3.fromRGB(226, 92, 92),
	regie = Color3.fromRGB(96, 165, 250),
	montage = Color3.fromRGB(168, 122, 236),
	detente = Color3.fromRGB(232, 176, 88),
	stockage = Color3.fromRGB(128, 136, 150),
	bureau = Color3.fromRGB(96, 200, 160),
	public = Color3.fromRGB(236, 130, 190),
	libre = Color3.fromRGB(90, 96, 110),
}

return VenuesModule
