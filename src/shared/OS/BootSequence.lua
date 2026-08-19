--!strict
--[[
	BootSequence — le démarrage de KZ OS.

	On a choisi un OS vivant : la machine met du temps à démarrer, et ce
	temps dépend du matériel. Sur la tour de récup du début, le boot dure
	une vingtaine de secondes et le joueur les subit. C'est ce qui donne
	un sens concret à l'achat d'un meilleur PC — pas une ligne de stat,
	une attente en moins.

	Le boot ne bloque pas le jeu : le joueur peut se lever et aller faire
	autre chose pendant que ça charge. C'est même conseillé.
]]

local TweenService = game:GetService("TweenService")

local Shared = script.Parent.Parent
local Trove = require(Shared.Lib.Trove)
local Theme = require(script.Parent.Theme)
local Widgets = require(script.Parent.Widgets)

local BootSequence = {}

-- Le POST, dans l'esprit d'un vieux BIOS. Chaque ligne a un coût en temps :
-- les lignes lentes sont celles qui dépendent vraiment du matériel.
local POST_LINES = {
	{ text = "Novaris BIOS v2.14 — (C) Novaris Systems", delay = 0.05 },
	{ text = "", delay = 0.02 },
	{ text = "Détection processeur ......... OK", delay = 0.12 },
	{ text = "Test mémoire ................. %d Mo OK", delay = 0.45, slow = true },
	{ text = "Détection stockage ........... OK", delay = 0.3, slow = true },
	{ text = "Périphériques USB ............ %d détecté(s)", delay = 0.2 },
	{ text = "Interface réseau ............. OK", delay = 0.15 },
	{ text = "", delay = 0.05 },
	{ text = "Démarrage de KZ OS...", delay = 0.4, slow = true },
}

export type BootOptions = {
	-- 0 = tour de récup, 1 = machine haut de gamme.
	hardwareQuality: number,
	usbDevices: number,
	memoryMB: number,
}

--- Lance le boot dans `parent`. Renvoie une fonction à appeler pour
--- interrompre proprement (le joueur éteint l'écran en plein démarrage).
function BootSequence.play(parent: Frame, options: BootOptions, onComplete: () -> ())
	local trove = Trove.new()

	-- Un matériel médiocre multiplie les temps d'attente par presque 3.
	local slowdown = 1 + (1 - math.clamp(options.hardwareQuality, 0, 1)) * 1.8

	local logLabel = Widgets.Text {
		name = "Log",
		text = "",
		color = Color3.fromRGB(190, 200, 190),
		font = Theme.Font.Mono,
		size = Theme.TextSize.Small,
		size2 = UDim2.fromScale(1, 1),
		alignY = Enum.TextYAlignment.Top,
	}

	local logoLabel = Widgets.Text {
		name = "Logo",
		text = Theme.Name,
		font = Theme.Font.Bold,
		size = Theme.TextSize.Display,
		align = Enum.TextXAlignment.Center,
		size2 = UDim2.fromScale(1, 1),
	}
	logoLabel.TextTransparency = 1

	local screen = Widgets.Panel {
		name = "BootScreen",
		color = Color3.fromRGB(6, 7, 9),
		zIndex = Theme.ZIndex.BootScreen,
		padding = Theme.Space.XXL,

		logLabel,
		logoLabel,
	}
	screen.Parent = parent
	trove:Add(screen)

	local cancelled = false

	task.spawn(function()
		local lines = {}

		for _, line in ipairs(POST_LINES) do
			if cancelled then
				return
			end

			local text = line.text
			if string.find(text, "%%d") then
				if string.find(text, "Mo") then
					text = string.format(text, options.memoryMB)
				else
					text = string.format(text, options.usbDevices)
				end
			end

			table.insert(lines, text)
			logLabel.Text = table.concat(lines, "\n")

			task.wait(line.delay * (line.slow and slowdown or 1))
		end

		if cancelled then
			return
		end

		-- Fondu du log vers le logo.
		TweenService:Create(logLabel, Theme.Motion.Normal, { TextTransparency = 1 }):Play()
		task.wait(0.2)
		TweenService:Create(logoLabel, Theme.Motion.Slow, { TextTransparency = 0 }):Play()
		task.wait(0.9 * slowdown)

		if cancelled then
			return
		end

		local fade = TweenService:Create(screen, Theme.Motion.Slow, { BackgroundTransparency = 1 })
		TweenService:Create(logoLabel, Theme.Motion.Normal, { TextTransparency = 1 }):Play()
		fade:Play()
		fade.Completed:Wait()

		if not cancelled then
			onComplete()
		end
		trove:Clean()
	end)

	return function()
		cancelled = true
		trove:Clean()
	end
end

return BootSequence
