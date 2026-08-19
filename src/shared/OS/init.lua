--!strict
--[[
	KZOS — l'instance d'un système d'exploitation.

	Un objet KZOS, c'est un ordinateur allumé. Le jeu peut en avoir
	plusieurs en même temps (ton PC de stream, le portable du salon, la
	régie du plateau) : chacun a son propre gestionnaire de fenêtres, ses
	apps installées et son état de boot.

	L'OS ne sait pas comment il est affiché. Il dessine dans un cadre de
	1280x720 logiques et laisse le "mount" (dalle 3D ou ScreenGui) s'occuper
	de la projection. C'est ce qui permet au même OS de tourner sur un
	moniteur vu de biais dans la chambre et sur le mur d'écrans de la régie.
]]

local Shared = script.Parent
local Create = require(Shared.Lib.Create)
local Signal = require(Shared.Lib.Signal)
local Trove = require(Shared.Lib.Trove)

local Theme = require(script.Theme)
local Widgets = require(script.Widgets)
local WindowManager = require(script.WindowManager)
local AppRegistry = require(script.AppRegistry)
local Taskbar = require(script.Taskbar)
local BootSequence = require(script.BootSequence)

local KZOS = {}
KZOS.__index = KZOS

export type MountContext = {
	-- Position du curseur dans le repère logique de l'écran, ou nil si le
	-- curseur ne pointe pas la dalle.
	getPointer: () -> Vector2?,
}

--- `root` : le Frame de 1280x720 dans lequel l'OS se dessine.
--- `context` : fourni par le mount (projection du curseur).
--- `api` : le pont vers le jeu (état répliqué + envoi d'intentions au serveur).
function KZOS.new(root: Frame, context: MountContext, api)
	local self = setmetatable({}, KZOS)

	self._trove = Trove.new()
	self.root = root
	self.context = context
	self.api = api
	self.state = api.state

	self.booted = false
	self.AppOpened = self._trove:Add(Signal.new())

	self:_build()
	self:_boot()

	return self
end

function KZOS:_build()
	-- Le fond du bureau. Un dégradé plutôt qu'une couleur plate : sur une
	-- dalle 3D, un aplat parfaitement uniforme a l'air d'une texture morte.
	self.desktop = Widgets.Panel {
		name = "Desktop",
		color = Theme.Color.Desktop,
		zIndex = Theme.ZIndex.Desktop,
	}

	Create("UIGradient") {
		Color = ColorSequence.new(
			Color3.fromRGB(20, 23, 32),
			Color3.fromRGB(11, 12, 17)
		),
		Rotation = 115,
	}.Parent = self.desktop

	self.windowLayer = Widgets.Panel {
		name = "Windows",
		transparency = 1,
		size = UDim2.new(1, 0, 1, -Theme.Layout.TaskbarHeight),
	}

	self.desktop.Parent = self.root
	self.windowLayer.Parent = self.root
	self._trove:Add(self.desktop)
	self._trove:Add(self.windowLayer)

	self.windows = WindowManager.new(self.windowLayer, {
		getPointer = self.context.getPointer,
		os = self,
	})
	self._trove:Add(self.windows)

	self.taskbar = Taskbar.new(self)
	self.taskbar.frame.Parent = self.root
	self._trove:Add(self.taskbar)

	self._trove:Add(self.windows.WindowOpened:Connect(function()
		self.taskbar:UpdateRunningIndicators()
	end))
	self._trove:Add(self.windows.WindowClosed:Connect(function()
		self.taskbar:UpdateRunningIndicators()
	end))
	self._trove:Add(self.windows.FocusChanged:Connect(function()
		self.taskbar:UpdateRunningIndicators()
	end))

	-- L'état vient du serveur ; l'OS se contente d'y réagir.
	self._trove:Add(self.api.stateChanged:Connect(function()
		self.state = self.api.state
		self.taskbar:Refresh()
		self.taskbar:SetLive(self.state.isLive == true)
		self:_updateClock()
	end))

	self:_updateClock()
end

function KZOS:_updateClock()
	local minutes = self.state.clockMinutes or (9 * 60)
	local day = self.state.day or 1

	self.taskbar:SetClock(string.format("%02d:%02d", math.floor(minutes / 60) % 24, minutes % 60), day)
end

function KZOS:_boot()
	local hardware = self.state.hardwareQuality or 0.1

	self._cancelBoot = BootSequence.play(self.root, {
		hardwareQuality = hardware,
		usbDevices = self.state.usbDeviceCount or 0,
		memoryMB = self.state.memoryMB or 4096,
	}, function()
		self.booted = true
		-- KZ Studio s'ouvre tout seul au démarrage : c'est le logiciel que
		-- le joueur lance en premier tous les jours, autant l'admettre.
		self:OpenApp("studio")
	end)
end

function KZOS:OpenApp(id: string)
	if not self.booted then
		return nil
	end

	local app = AppRegistry.Get(id)
	if not app then
		warn(string.format("[KZ OS] app inconnue : %s", id))
		return nil
	end

	if not app.unlock(self.state) then
		return nil
	end

	local existing = self.windows:GetWindow(id)
	if existing then
		existing:SetMinimized(false)
		existing:Focus()
		return existing
	end

	local window = self.windows:OpenWindow(id, {
		title = app.name,
		icon = app.glyph,
		size = app.defaultSize,
		minSize = app.minSize,
	})

	local cleanup = app.mount(window.content, self.api)
	if cleanup then
		window.Closed:Connect(cleanup)
	end

	self.taskbar:UpdateRunningIndicators()
	self.AppOpened:Fire(id)

	return window
end

--- Clic sur l'icône de la barre : ouvre, réduit ou restaure selon l'état.
--- C'est le comportement attendu d'une barre des tâches, et s'en écarter
--- se remarque immédiatement.
function KZOS:ToggleApp(id: string)
	local window = self.windows:GetWindow(id)

	if not window then
		self:OpenApp(id)
		return
	end

	if window.minimized then
		window:SetMinimized(false)
	elseif self.windows.focusedWindow == window then
		window:SetMinimized(true)
	else
		window:Focus()
	end

	self.taskbar:UpdateRunningIndicators()
end

function KZOS:CloseApp(id: string)
	local window = self.windows:GetWindow(id)
	if window then
		window:Close()
	end
end

function KZOS:Destroy()
	if self._cancelBoot then
		self._cancelBoot()
	end
	self._trove:Clean()
end

return KZOS
