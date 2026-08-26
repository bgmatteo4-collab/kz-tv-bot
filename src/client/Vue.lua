--!strict
--[[
	Vue — la bascule première / troisième personne.

	Cahier des charges §13.1 : les deux vues sont au choix du joueur. La
	troisième sert à circuler, la première à détailler — et c'est la première
	qui juge réellement la qualité d'un décor, puisqu'elle autorise à coller
	le nez dessus.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local TOUCHE = Enum.KeyCode.V

local Vue = {}

local joueur = Players.LocalPlayer
local enPremierePersonne = false

local function appliquer()
	if enPremierePersonne then
		joueur.CameraMode = Enum.CameraMode.LockFirstPerson
	else
		joueur.CameraMode = Enum.CameraMode.Classic
	end
end

--- Renvoie la vue active, pour l'afficher ailleurs sans la recalculer.
function Vue.estEnPremierePersonne(): boolean
	return enPremierePersonne
end

function Vue.basculer()
	enPremierePersonne = not enPremierePersonne
	appliquer()
end

function Vue.demarrer()
	appliquer()

	UserInputService.InputBegan:Connect(function(entree, capturee)
		if capturee then
			return
		end
		if entree.KeyCode == TOUCHE then
			Vue.basculer()
		end
	end)
end

Vue.TOUCHE = TOUCHE

return Vue
