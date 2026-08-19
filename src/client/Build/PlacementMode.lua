--!strict
--[[
	PlacementMode — poser un objet dans la pièce.

	Un fantôme translucide suit le curseur, s'aimante à la grille, tourne
	à la molette ou avec R, et devient rouge quand la surface visée ne
	convient pas. Le clic gauche envoie l'intention au serveur, qui reste
	seul juge de la validité finale.

	Les commandes s'affichent sur une étiquette accrochée au fantôme
	lui-même : c'est la seule façon de les montrer sans introduire le HUD
	flottant qu'on s'est interdit.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Catalogue = require(Shared.Config.Catalogue)
local Placement = require(Shared.Config.Placement)
local Trove = require(Shared.Lib.Trove)

local player = Players.LocalPlayer

local PlacementMode = {}
PlacementMode.__index = PlacementMode

local VALID_COLOR = Color3.fromRGB(90, 220, 130)
local INVALID_COLOR = Color3.fromRGB(230, 90, 90)

local function buildHintLabel(parent: BasePart, itemName: string)
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "PlacementHint"
	billboard.Size = UDim2.fromOffset(300, 54)
	billboard.StudsOffsetWorldSpace = Vector3.new(0, parent.Size.Y / 2 + 2, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = parent
	billboard.Parent = parent

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1, 0, 0, 22)
	title.BackgroundTransparency = 1
	title.Text = itemName
	title.TextColor3 = Color3.new(1, 1, 1)
	title.TextSize = 17
	title.Font = Enum.Font.GothamBold
	title.TextStrokeTransparency = 0.4
	title.Parent = billboard

	local controls = Instance.new("TextLabel")
	controls.Name = "Controls"
	controls.Size = UDim2.new(1, 0, 0, 18)
	controls.Position = UDim2.fromOffset(0, 24)
	controls.BackgroundTransparency = 1
	controls.Text = "clic gauche : poser   ·   R : tourner   ·   clic droit : annuler"
	controls.TextColor3 = Color3.fromRGB(210, 214, 224)
	controls.TextSize = 13
	controls.Font = Enum.Font.Gotham
	controls.TextStrokeTransparency = 0.5
	controls.Parent = billboard

	return billboard
end

--- `onConfirm(x, y, z, yaw)` part vers le serveur ; `onFinish` referme le
--- mode quel que soit le dénouement.
function PlacementMode.start(uid: number, itemId: string, onConfirm, onFinish)
	local item = Catalogue.Get(itemId)
	if not item then
		onFinish()
		return nil
	end

	local self = setmetatable({}, PlacementMode)
	self._trove = Trove.new()
	self.item = item
	self.uid = uid
	self.yaw = 0
	self.valid = false
	self.position = Vector3.zero

	local size = Placement.GetSize(item)

	local ghost = Instance.new("Part")
	ghost.Name = "PlacementGhost"
	ghost.Size = size
	ghost.Anchored = true
	ghost.CanCollide = false
	-- Sans CanQuery à false, le fantôme s'accrocherait à lui-même : le
	-- raycast le toucherait avant le sol.
	ghost.CanQuery = false
	ghost.Transparency = 0.45
	ghost.Material = Enum.Material.SmoothPlastic
	ghost.Color = VALID_COLOR
	ghost.Parent = workspace
	self.ghost = self._trove:Add(ghost)

	buildHintLabel(ghost, item.name)

	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { ghost, player.Character :: any }
	self._params = params

	self._trove:Add(RunService.RenderStepped:Connect(function()
		self:_update()
	end))

	self._trove:Add(UserInputService.InputBegan:Connect(function(input, gameProcessed)
		if gameProcessed then
			return
		end

		if input.UserInputType == Enum.UserInputType.MouseButton1 then
			if self.valid then
				onConfirm(self.position.X, self.position.Y, self.position.Z, self.yaw)
				self:Destroy()
				onFinish()
			end
		elseif input.UserInputType == Enum.UserInputType.MouseButton2 then
			self:Destroy()
			onFinish()
		elseif input.KeyCode == Enum.KeyCode.R then
			self.yaw = (self.yaw + Placement.RotationStep) % 360
		end
	end))

	self._trove:Add(UserInputService.InputChanged:Connect(function(input, gameProcessed)
		if gameProcessed then
			return
		end
		if input.UserInputType == Enum.UserInputType.MouseWheel then
			self.yaw = (self.yaw + Placement.RotationStep * math.sign(input.Position.Z)) % 360
		end
	end))

	UserInputService.MouseIconEnabled = true

	return self
end

function PlacementMode:_update()
	local camera = workspace.CurrentCamera
	local character = player.Character
	if not camera or not character then
		return
	end

	-- Le personnage bouge : on rafraîchit le filtre à chaque image, sinon
	-- le fantôme se colle au joueur dès qu'il passe devant.
	self._params.FilterDescendantsInstances = { self.ghost, character }

	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)
	local result = workspace:Raycast(ray.Origin, ray.Direction * Placement.MaxReach, self._params)

	if not result then
		self:_setValid(false)
		return
	end

	local size = self.ghost.Size
	local normal = result.Normal
	local position

	if self.item.surface == "wall" then
		-- Adossé à la paroi : on décolle de la moitié de l'épaisseur, et
		-- l'objet regarde vers l'intérieur de la pièce.
		position = result.Position + normal * (size.Z / 2)
		self.yaw = math.deg(math.atan2(normal.X, normal.Z))
	else
		position = result.Position + Vector3.new(0, size.Y / 2, 0)
	end

	local snapped = Placement.SnapToGrid(position)
	self.position = snapped
	self.ghost.CFrame = Placement.ToCFrame(snapped.X, snapped.Y, snapped.Z, self.yaw)

	self:_setValid(Placement.AcceptsSurface(self.item, normal))
end

function PlacementMode:_setValid(valid: boolean)
	if self.valid == valid then
		return
	end
	self.valid = valid
	self.ghost.Color = valid and VALID_COLOR or INVALID_COLOR
end

function PlacementMode:Destroy()
	self._trove:Clean()
end

return PlacementMode
