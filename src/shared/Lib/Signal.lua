--!strict
--[[
	Signal — un événement maison, plus léger et plus rapide qu'un BindableEvent,
	et surtout capable de transporter des tables sans les recopier.

	local changed = Signal.new()
	local conn = changed:Connect(function(value) print(value) end)
	changed:Fire(42)
	conn:Disconnect()
]]

local Signal = {}
Signal.__index = Signal

local Connection = {}
Connection.__index = Connection

export type Connection = {
	Disconnect: (self: Connection) -> (),
	Connected: boolean,
}

function Connection.new(signal, callback)
	return setmetatable({
		_signal = signal,
		_callback = callback,
		Connected = true,
	}, Connection)
end

function Connection:Disconnect()
	if not self.Connected then
		return
	end
	self.Connected = false

	local listeners = self._signal._listeners
	for index, connection in ipairs(listeners) do
		if connection == self then
			table.remove(listeners, index)
			break
		end
	end
end

function Signal.new()
	return setmetatable({
		_listeners = {},
	}, Signal)
end

function Signal:Connect(callback: (...any) -> ()): Connection
	local connection = Connection.new(self, callback)
	table.insert(self._listeners, connection)
	return connection
end

--- Se déconnecte automatiquement après le premier déclenchement.
function Signal:Once(callback: (...any) -> ()): Connection
	local connection
	connection = self:Connect(function(...)
		connection:Disconnect()
		callback(...)
	end)
	return connection
end

function Signal:Fire(...)
	-- On itère sur une copie : un listener a le droit de se déconnecter pendant le Fire.
	local snapshot = table.clone(self._listeners)
	for _, connection in ipairs(snapshot) do
		if connection.Connected then
			task.spawn(connection._callback, ...)
		end
	end
end

function Signal:DisconnectAll()
	for _, connection in ipairs(table.clone(self._listeners)) do
		connection:Disconnect()
	end
end

function Signal:Destroy()
	self:DisconnectAll()
end

return Signal
