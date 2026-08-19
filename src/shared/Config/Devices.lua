--!strict
--[[
	Devices — le catalogue du matériel.

	Tout objet branchable du jeu est décrit ici, et seulement ici. Ajouter
	une webcam à 900 € au catalogue ne demande aucune ligne de code : une
	entrée suffit, et elle apparaît en boutique, dans le mode construction,
	dans les sources de KZ Studio et dans le calcul de qualité d'image.

	`ports` : ce que l'appareil expose (sortie) ou réclame (entrée).
	`quality` : de 0 à 1, ce que l'appareil apporte à la note d'image ou de son.
]]

export type PortType = "usb" | "hdmi" | "xlr" | "jack" | "power" | "ethernet"

export type Device = {
	id: string,
	name: string,
	brand: string,
	category: "camera" | "microphone" | "computer" | "display" | "light" | "backdrop" | "capture" | "network",
	price: number,
	quality: number,
	-- Ports à brancher pour que l'appareil fonctionne.
	requires: { PortType },
	-- Ports que l'appareil offre aux autres.
	provides: { PortType },
	-- Watts consommés : la multiprise a une limite, et elle saute.
	power: number,
	-- Encombrement en studs, pour le mode construction.
	footprint: Vector2,
	description: string,
}

local Devices: { [string]: Device } = {
	webcam_basic = {
		id = "webcam_basic",
		name = "LifeCam 480",
		brand = "Genelux",
		category = "camera",
		price = 0,
		quality = 0.15,
		requires = { "usb" },
		provides = {},
		power = 2,
		footprint = Vector2.new(1, 1),
		description = "Elle était dans un carton au grenier. Elle fait le travail, si on est indulgent sur le mot travail.",
	},

	webcam_hd = {
		id = "webcam_hd",
		name = "StreamCam C7",
		brand = "Genelux",
		category = "camera",
		price = 120,
		quality = 0.45,
		requires = { "usb" },
		provides = {},
		power = 3,
		footprint = Vector2.new(1, 1),
		description = "La webcam que tout le monde a. Correcte partout, excellente nulle part.",
	},

	mic_headset = {
		id = "mic_headset",
		name = "Casque-micro G1",
		brand = "Genelux",
		category = "microphone",
		price = 0,
		quality = 0.2,
		requires = { "jack" },
		provides = {},
		power = 0,
		footprint = Vector2.new(1, 1),
		description = "Capte ta voix, ta respiration, ton clavier, et ton frère dans le couloir.",
	},

	mic_usb = {
		id = "mic_usb",
		name = "Podium USB",
		brand = "Auvox",
		category = "microphone",
		price = 95,
		quality = 0.5,
		requires = { "usb" },
		provides = {},
		power = 2,
		footprint = Vector2.new(1, 1),
		description = "Le micro qui a lancé mille podcasts. Le pied prend de la place sur le bureau.",
	},

	greenscreen_small = {
		id = "greenscreen_small",
		name = "Fond vert 1,5 m",
		brand = "Cadran",
		category = "backdrop",
		price = 60,
		quality = 0.4,
		requires = {},
		provides = {},
		power = 0,
		footprint = Vector2.new(5, 1),
		description = "Suffisant si tu ne bouges pas. Tu bougeras.",
	},

	greenscreen_large = {
		id = "greenscreen_large",
		name = "Fond vert 3 m sur pieds",
		brand = "Cadran",
		category = "backdrop",
		price = 210,
		quality = 0.8,
		requires = {},
		provides = {},
		power = 0,
		footprint = Vector2.new(10, 2),
		description = "Couvre largement le cadre. Encore faut-il avoir trois mètres de mur libre.",
	},

	light_ring = {
		id = "light_ring",
		name = "Anneau lumineux 12\"",
		brand = "Cadran",
		category = "light",
		price = 45,
		quality = 0.3,
		requires = { "power" },
		provides = {},
		power = 18,
		footprint = Vector2.new(2, 2),
		description = "Éclaire ton visage et te met deux donuts dans les yeux.",
	},

	light_softbox = {
		id = "light_softbox",
		name = "Softbox 60x60",
		brand = "Cadran",
		category = "light",
		price = 130,
		quality = 0.7,
		requires = { "power" },
		provides = {},
		power = 60,
		footprint = Vector2.new(3, 3),
		description = "Lumière douce et large. Prend la place d'un fauteuil.",
	},

	pc_hand_me_down = {
		id = "pc_hand_me_down",
		name = "Tour de récup",
		brand = "assemblage maison",
		category = "computer",
		price = 0,
		quality = 0.1,
		requires = { "power" },
		provides = { "usb", "hdmi", "jack" },
		power = 220,
		footprint = Vector2.new(2, 4),
		description = "Démarre en 90 secondes. Ventile comme un sèche-cheveux. Tiendra, probablement.",
	},

	pc_midrange = {
		id = "pc_midrange",
		name = "Atelier 5600",
		brand = "Novaris",
		category = "computer",
		price = 850,
		quality = 0.55,
		requires = { "power" },
		provides = { "usb", "hdmi", "jack", "ethernet" },
		power = 400,
		footprint = Vector2.new(2, 4),
		description = "Encode sans broncher. Ne t'empêchera plus de faire quoi que ce soit.",
	},

	monitor_24 = {
		id = "monitor_24",
		name = "Écran 24\" 1080p",
		brand = "Novaris",
		category = "display",
		price = 140,
		quality = 0.4,
		requires = { "hdmi", "power" },
		provides = {},
		power = 25,
		footprint = Vector2.new(4, 1),
		description = "Un écran. Le deuxième change plus ta vie que le premier ne l'a fait.",
	},
}

return Devices
