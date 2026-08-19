--!strict
--[[
	ScreenSurface — projette KZ OS sur une dalle 3D.

	C'est la pièce qui rend le projet possible : une SurfaceGui calibrée
	pour que son canvas fasse exactement la résolution logique de l'OS
	(1280x720 par défaut), quelle que soit la taille physique de l'écran
	dans le monde. L'OS dessine en pixels, la dalle s'occupe du reste.

	`LightInfluence = 0` est le détail qui change tout : l'écran émet sa
	propre lumière au lieu de subir celle de la pièce. Sans ça, un moniteur
	dans une chambre sombre a l'air d'un poster gris.

	La fonction `getPointer` convertit la position de la souris à l'écran
	en coordonnées sur la dalle, en passant par un raycast. C'est ce qui
	permet de cliquer et de glisser des fenêtres sur un écran vu de biais.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Shared")
local Create = require(Shared.Lib.Create)
local Trove = require(Shared.Lib.Trove)
local Theme = require(Shared.OS.Theme)

local ScreenSurface = {}
ScreenSurface.__index = ScreenSurface

local player = Players.LocalPlayer

function ScreenSurface.new(screenPart: BasePart, face: Enum.NormalId?)
	local self = setmetatable({}, ScreenSurface)

	self._trove = Trove.new()
	self.part = screenPart
	self.face = face or Enum.NormalId.Front

	local resolution = Theme.Layout.ScreenResolution

	-- On calibre à partir de la largeur : la hauteur suit si la dalle
	-- respecte le ratio 16:9. Un écran au mauvais ratio étire l'interface,
	-- ce qui se voit immédiatement et se corrige dans Studio.
	local pixelsPerStud = resolution.X / screenPart.Size.X

	self.root = Create("Frame") {
		Name = "OSRoot",
		Size = UDim2.fromOffset(resolution.X, resolution.Y),
		BackgroundColor3 = Color3.new(0, 0, 0),
		BorderSizePixel = 0,
		ClipsDescendants = true,
	}

	self.gui = Create("SurfaceGui") {
		Name = "KZOS",
		Adornee = screenPart,
		Face = self.face,
		SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud,
		PixelsPerStud = pixelsPerStud,
		LightInfluence = 0,
		AlwaysOnTop = false,
		MaxDistance = 90,
		-- Indispensable. Par défaut, une GUI créée par script utilise le
		-- comportement "Global" : le ZIndex est comparé à l'échelle de tout
		-- l'écran, donc le cadre d'une fenêtre (ZIndex 10) se dessine
		-- PAR-DESSUS son propre contenu (ZIndex 1). Les fenêtres
		-- apparaissent alors vides. En "Sibling", le ZIndex n'est comparé
		-- qu'entre frères et soeurs, ce qui est le comportement attendu.
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,

		self.root,
	}
	self.gui.Parent = player:WaitForChild("PlayerGui")

	self._trove:Add(self.gui)

	self._raycastParams = RaycastParams.new()
	self._raycastParams.FilterType = Enum.RaycastFilterType.Include
	self._raycastParams.FilterDescendantsInstances = { screenPart }

	return self
end

--- Position du curseur dans le repère logique de l'écran, ou nil si le
--- joueur ne pointe pas la dalle.
function ScreenSurface:GetPointer(): Vector2?
	local camera = Workspace.CurrentCamera
	if not camera then
		return nil
	end

	local mouse = UserInputService:GetMouseLocation()
	local ray = camera:ViewportPointToRay(mouse.X, mouse.Y)

	local result = Workspace:Raycast(ray.Origin, ray.Direction * 200, self._raycastParams)
	if not result then
		return nil
	end

	-- Du monde vers l'espace local de la dalle, puis vers ses UV.
	local localPoint = self.part.CFrame:PointToObjectSpace(result.Position)
	local size = self.part.Size

	local u = (localPoint.X + size.X / 2) / size.X
	local v = (size.Y / 2 - localPoint.Y) / size.Y

	local resolution = Theme.Layout.ScreenResolution
	return Vector2.new(u * resolution.X, v * resolution.Y)
end

--- Éteint la dalle quand le joueur est loin : une SurfaceGui active coûte
--- cher, et il y en aura beaucoup dans une régie.
function ScreenSurface:SetActive(active: boolean)
	self.gui.Enabled = active
end

function ScreenSurface:Destroy()
	self._trove:Clean()
end

return ScreenSurface
