--!strict
--[[
	Net — les tuyaux client/serveur.

	Un seul RemoteEvent dans chaque sens, avec une route en premier argument.
	Multiplier les remotes ne sert à rien et complique la sécurité : ici il
	n'y a qu'une porte d'entrée à valider côté serveur.

	Règle du projet : le client n'envoie que des INTENTIONS ("je veux passer
	en direct"), jamais des résultats ("j'ai 4200 viewers"). Tout ce qui
	compte est calculé et validé par le serveur.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Net = {}

local FOLDER_NAME = "KZNet"

local function getFolder(): Folder
	if RunService:IsServer() then
		local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if not folder then
			folder = Instance.new("Folder")
			folder.Name = FOLDER_NAME
			folder.Parent = ReplicatedStorage
		end
		return folder
	end

	return ReplicatedStorage:WaitForChild(FOLDER_NAME) :: Folder
end

local function getRemote(name: string, className: string): any
	local folder = getFolder()

	if RunService:IsServer() then
		local remote = folder:FindFirstChild(name)
		if not remote then
			remote = Instance.new(className)
			remote.Name = name
			remote.Parent = folder
		end
		return remote
	end

	return folder:WaitForChild(name)
end

--- Serveur -> client : l'état du joueur a changé.
function Net.stateEvent(): RemoteEvent
	return getRemote("State", "RemoteEvent")
end

--- Client -> serveur : une intention du joueur.
function Net.requestEvent(): RemoteEvent
	return getRemote("Request", "RemoteEvent")
end

return Net
