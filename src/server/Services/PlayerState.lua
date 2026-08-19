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

		-- Le matériel posé dans la pièce. Les sources de KZ Studio en
		-- découlent directement : rien ici, rien là-bas.
		devices = {
			{ id = "pc_handmedown", connected = true },
			{ id = "cam_attic", connected = true },
			{ id = "desk_family", connected = true },
			{ id = "chair_kitchen", connected = true },
			-- Le casque-micro est là, mais pas branché. Personne ne le
			-- signalera au joueur : c'est le chat qui s'en chargera.
			{ id = "mic_headset", connected = false },
		},

		scenes = {
			{ id = "main", name = "Scène principale" },
			{ id = "brb", name = "Pause" },
		},
		activeSceneId = "main",

		isLive = false,
		viewers = 0,
		streamElapsed = 0,
		bitrate = 0,
		droppedFrames = 0,

		-- Commandes passées et pas encore livrées.
		orders = {},
		-- Objets possédés mais pas encore installés dans la pièce.
		inventory = {},
		-- Objets installés : { uid, itemId, x, y, z, yaw }
		placed = {},
		-- Compteur d'identifiants d'objets, jamais réutilisé.
		nextUid = 1,

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
