--!strict
--[[
	PlayerState — l'état d'un joueur, propriété exclusive du serveur.

	Ce module ne connaît rien de l'interface. Il détient les chiffres, les
	fait évoluer, et notifie. Toute la logique de jeu qu'on écrira ensuite
	(simulation d'audience, économie, fatigue) se branchera ici.
]]

local Signal = require(game:GetService("ReplicatedStorage").Shared.Lib.Signal)

local PlayerState = {}
PlayerState.__index = PlayerState

--- L'état de départ : la chambre chez les parents, une tour de récup, une
--- webcam trouvée au grenier, et personne qui regarde.
local function defaultState()
	return {
		day = 1,
		-- Minutes depuis minuit. La journée de jeu avance par créneaux.
		clockMinutes = 9 * 60,

		money = 120,
		energy = 100,

		-- Vitesse d'écoulement du temps, réglable par le joueur.
		-- 1 minute réelle = timeScale minutes de jeu. 0 met en pause.
		timeScale = 10,

		stats = {
			streamsCompleted = 0,
			employees = 0,
			-- 1 = chambre, 2 = appartement, 3 = local, 4 = plateau.
			venueTier = 1,
			subscribers = 0,
		},

		-- Qualité de la machine : pilote la lenteur du boot et le risque de
		-- plantage. 0 = tour de récup, 1 = station haut de gamme.
		hardwareQuality = 0.1,
		memoryMB = 4096,
		usbDeviceCount = 1,

		scenes = {
			{ id = "main", name = "Scène principale" },
			{ id = "brb", name = "Pause" },
		},
		activeSceneId = "main",

		-- Secondes restantes de coupure de courant. Zéro le reste du temps.
		blackoutRemaining = 0,

		isLive = false,
		viewers = 0,
		streamElapsed = 0,
		bitrate = 0,
		droppedFrames = 0,

		-- Commandes passées et pas encore livrées.
		orders = {},
		-- Objets possédés mais pas encore installés dans la pièce. Le
		-- casque-micro commence au carton : tant qu'il n'est pas posé, KZ
		-- Studio l'affiche en rouge et le direct part sans son.
		inventory = {
			{ uid = 100, itemId = "mic_headset" },
		},
		-- Objets installés : { uid, itemId, x, y, z, yaw }
		--
		-- Le matériel de départ est déjà posé plutôt que codé dans le décor :
		-- il passe par le même constructeur que tout le reste, et le joueur
		-- peut le déplacer comme n'importe quel meuble.
		placed = {
			-- Contre le mur du fond, tourné vers le joueur. Les hauteurs sont
			-- des centres d'objet : un bureau de 2,6 studs de haut a son
			-- centre à 1,3.
			{ uid = 101, itemId = "desk_family", x = -1, y = 1.3, z = -5.4, yaw = 180 },
			{ uid = 102, itemId = "chair_kitchen", x = -1, y = 1.6, z = -2.9, yaw = 0 },
			{ uid = 103, itemId = "pc_handmedown", x = -4.4, y = 0.95, z = -5, yaw = 0 },
			{ uid = 104, itemId = "monitor_starter", x = -1, y = 4.1, z = -6, yaw = 180 },
			-- La webcam est posée sur le moniteur, comme chez tout le monde.
			{ uid = 105, itemId = "cam_attic", x = -1, y = 5.2, z = -6, yaw = 180 },
			{ uid = 106, itemId = "kb_membrane", x = -1, y = 2.68, z = -4.8, yaw = 180 },
			{ uid = 107, itemId = "mouse_basic", x = 0.4, y = 2.7, z = -4.8, yaw = 180 },
		},
		-- Compteur d'identifiants d'objets, jamais réutilisé. Il démarre
		-- au-dessus des identifiants du matériel de départ.
		nextUid = 200,

		files = {
			clips = {},
			rushes = {},
			thumbnails = {},
			contracts = {},
		},

		answeredEmails = {},
	}
end

function PlayerState.new(player: Player)
	local self = setmetatable({}, PlayerState)

	self.player = player
	self.data = defaultState()
	self.Changed = Signal.new()

	return self
end

function PlayerState:Get()
	return self.data
end

--- Applique une modification et notifie. Passer par cette méthode plutôt
--- que de muter `data` directement garantit que le client est toujours
--- resynchronisé — c'est la seule discipline à tenir dans ce fichier.
function PlayerState:Update(mutator: (any) -> ())
	mutator(self.data)
	self.Changed:Fire(self.data)
end

function PlayerState:Destroy()
	self.Changed:Destroy()
end

return PlayerState
