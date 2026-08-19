--!strict
--[[
	WindowManager — le gestionnaire de fenêtres de KZ OS.

	Il possède la pile de fenêtres (l'ordre Z), décide qui a le focus, et
	relaie l'ouverture des apps. Une app n'instancie jamais sa fenêtre
	elle-même : elle demande au manager, qui applique les règles (une seule
	instance ? déjà ouverte ? cascade de position ?).
]]

local Shared = script.Parent.Parent
local Signal = require(Shared.Lib.Signal)
local Trove = require(Shared.Lib.Trove)
local Theme = require(script.Parent.Theme)
local Window = require(script.Parent.Window)

local WindowManager = {}
WindowManager.__index = WindowManager

--- `context` doit fournir :
---   getPointer() -> Vector2? : position du curseur dans le repère logique
---   os : la référence à l'instance de KZ OS (pour que les apps y accèdent)
function WindowManager.new(container: Frame, context)
	local self = setmetatable({}, WindowManager)

	self._trove = Trove.new()
	self.container = container
	self.context = context

	self.windows = {} :: { any }
	self.focusedWindow = nil
	self._manipulating = false
	self._cascadeIndex = 0

	self.WindowOpened = self._trove:Add(Signal.new())
	self.WindowClosed = self._trove:Add(Signal.new())
	self.FocusChanged = self._trove:Add(Signal.new())

	return self
end

--- Vrai pendant qu'une fenêtre est déplacée ou redimensionnée. Le reste de
--- l'OS s'en sert pour ne pas déclencher de survols pendant le geste.
function WindowManager:IsManipulating(): boolean
	return self._manipulating
end

function WindowManager:_setManipulating(value: boolean)
	self._manipulating = value
end

--- Décale chaque nouvelle fenêtre pour qu'elles ne s'empilent pas
--- exactement au même endroit.
function WindowManager:_nextCascadePosition(size: Vector2): Vector2
	local screen = Theme.Layout.ScreenResolution
	local step = 28
	local offset = self._cascadeIndex * step

	self._cascadeIndex = (self._cascadeIndex + 1) % 8

	local base = Vector2.new((screen.X - size.X) / 2, (screen.Y - size.Y) / 2 - Theme.Layout.TaskbarHeight / 2)
	local position = base + Vector2.new(offset - step * 3.5, offset - step * 3.5)

	return Vector2.new(math.max(0, position.X), math.max(0, position.Y))
end

function WindowManager:GetWindow(id: string)
	for _, window in ipairs(self.windows) do
		if window.id == id then
			return window
		end
	end
	return nil
end

function WindowManager:OpenWindow(id: string, props)
	local existing = self:GetWindow(id)
	if existing then
		existing:SetMinimized(false)
		existing:Focus()
		return existing
	end

	props = props or {}
	local size = props.size or Vector2.new(720, 460)
	props.size = size
	props.position = props.position or self:_nextCascadePosition(size)

	local window = Window.new(self, id, props)
	window.frame.Parent = self.container

	table.insert(self.windows, window)

	window.Closed:Connect(function()
		self:_removeWindow(window)
	end)

	self:FocusWindow(window)
	self.WindowOpened:Fire(window)

	return window
end

function WindowManager:_removeWindow(window)
	for index, stored in ipairs(self.windows) do
		if stored == window then
			table.remove(self.windows, index)
			break
		end
	end

	if self.focusedWindow == window then
		self.focusedWindow = nil
		self:_focusTopMost()
	end

	self.WindowClosed:Fire(window)
end

--- La pile Z est simplement l'ordre du tableau : le dernier élément est
--- au premier plan. On réassigne les ZIndex à chaque changement de focus,
--- ce qui reste trivial tant qu'on a moins de quelques dizaines de fenêtres.
function WindowManager:FocusWindow(window)
	if not window or window.minimized then
		return
	end

	if self.focusedWindow == window then
		return
	end

	for index, stored in ipairs(self.windows) do
		if stored == window then
			table.remove(self.windows, index)
			break
		end
	end
	table.insert(self.windows, window)

	if self.focusedWindow then
		self.focusedWindow:_setFocusState(false)
	end

	self.focusedWindow = window
	window:_setFocusState(true)

	self:_restack()
	self.FocusChanged:Fire(window)
end

function WindowManager:_focusTopMost()
	for index = #self.windows, 1, -1 do
		local window = self.windows[index]
		if not window.minimized then
			self:FocusWindow(window)
			return
		end
	end

	if self.focusedWindow then
		self.focusedWindow:_setFocusState(false)
		self.focusedWindow = nil
		self.FocusChanged:Fire(nil)
	end
end

function WindowManager:_restack()
	local base = Theme.ZIndex.WindowBase
	local step = 10

	for index, window in ipairs(self.windows) do
		local zIndex = math.min(base + (index - 1) * step, Theme.ZIndex.WindowMax)
		window.frame.ZIndex = zIndex
	end
end

function WindowManager:CloseAll()
	for _, window in ipairs(table.clone(self.windows)) do
		window:Destroy()
	end
	table.clear(self.windows)
	self.focusedWindow = nil
end

function WindowManager:Destroy()
	self:CloseAll()
	self._trove:Clean()
end

return WindowManager
