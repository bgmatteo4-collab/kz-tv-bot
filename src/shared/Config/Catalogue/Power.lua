--!strict
--[[
	Famille "power" — l'alimentation électrique.

	On a choisi de ne pas faire tirer les câbles de données à la main :
	poser un appareil à portée de la machine le branche. En revanche
	l'électricité se gère, et c'est elle qui porte toute la tension
	technique du jeu.

	Chaque prise a une puissance, chaque multiprise a un plafond, et
	dépasser ce plafond fait tout sauter — de préférence en plein direct.

	Ces objets sont invisibles à l'image : ils ne comptent pas dans le
	score de cohérence de style, personne ne juge une multiprise.
]]

return {
	{
		id = "power_strip_basic",
		name = "Multiprise 4 prises",
		brand = "générique",
		family = "power",
		category = "strip",
		style = "sobre",
		tier = 1,
		price = 12,
		sockets = 4,
		maxWatts = 2300,
		power = 0,
		surface = "floor",
		footprint = Vector2.new(1.2, 0.4),
		height = 0.2,
		visible = false,
		description = "Quatre prises et un interrupteur qui s'éteint quand on tape dedans avec le pied.",
	},
	{
		id = "power_strip_large",
		name = "Bloc 8 prises parafoudre",
		brand = "Voltek",
		family = "power",
		category = "strip",
		style = "pro",
		tier = 2,
		price = 45,
		sockets = 8,
		maxWatts = 3500,
		power = 0,
		surface = "floor",
		footprint = Vector2.new(1.8, 0.5),
		height = 0.2,
		visible = false,
		description = "Huit prises, protection contre les surtensions, et assez de marge pour ne plus y penser pendant un moment.",
	},
	{
		id = "power_extension",
		name = "Rallonge 5 m",
		brand = "générique",
		family = "power",
		category = "extension",
		style = "sobre",
		tier = 1,
		price = 15,
		reach = 5,
		maxWatts = 2300,
		power = 0,
		surface = "floor",
		footprint = Vector2.new(0.5, 0.5),
		height = 0.2,
		visible = false,
		description = "Permet d'alimenter un objet loin de la prise murale. Le plus petit achat qui débloque le plus de dispositions.",
	},
	{
		id = "power_ups",
		name = "Onduleur 900 VA",
		brand = "Voltek",
		family = "power",
		category = "ups",
		style = "pro",
		tier = 3,
		price = 320,
		sockets = 4,
		maxWatts = 900,
		holdSeconds = 420,
		power = 0,
		surface = "floor",
		footprint = Vector2.new(1, 1.4),
		height = 1,
		visible = false,
		description = "Une batterie qui prend le relais quand le courant saute. Ne sert absolument à rien jusqu'au soir où il sauve deux heures de direct.",
	},
	{
		id = "power_circuit_upgrade",
		name = "Ligne électrique dédiée",
		brand = "Voltek",
		family = "power",
		category = "circuit",
		style = "pro",
		tier = 3,
		price = 850,
		maxWatts = 7000,
		power = 0,
		surface = "wall",
		footprint = Vector2.new(1.2, 0.4),
		height = 1.6,
		visible = false,
		description = "Un électricien tire une ligne séparée jusqu'au studio. Cher, invisible, et le seul moyen de faire tourner un plateau complet.",
	},
}
