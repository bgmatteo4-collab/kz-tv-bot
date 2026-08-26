--!strict
--[[
	Le client — point d'entrée.

	v0.1 : rien à piloter, rien à afficher en jeu. Le client ne fait que deux
	choses — offrir les deux vues, et instrumenter la mesure.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Partage = ReplicatedStorage:WaitForChild("Partage")
local Dev = require(Partage.Config.Dev)

local Diagnostic = require(script.Diagnostic)
local Vue = require(script.Vue)

Vue.demarrer()

if Dev.DiagnosticActif then
	Diagnostic.demarrer()
end
