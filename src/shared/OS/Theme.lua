--!strict
--[[
	Theme — les jetons de design de KZ OS.

	Règle du projet : AUCUNE couleur, AUCUNE marge, AUCUNE durée d'animation
	n'est écrite en dur ailleurs que dans ce fichier. Tout passe par ici.
	C'est ce qui fait qu'un OS a l'air cohérent plutôt que bricolé, et ça
	nous permettra de vendre des thèmes (clair, rétro, "gamer RGB") plus
	tard sans toucher une seule ligne d'app.
]]

local Theme = {}

Theme.Name = "KZ OS"
Theme.Version = "0.1"

-- Les surfaces vont de la plus profonde (le bureau) à la plus proche
-- (une popup au-dessus d'une fenêtre). Plus c'est proche, plus c'est clair :
-- c'est ce qui donne la sensation de profondeur sans dessiner d'ombres.
Theme.Color = {
	Desktop = Color3.fromRGB(14, 16, 22),
	Surface = Color3.fromRGB(24, 27, 35),
	SurfaceRaised = Color3.fromRGB(32, 36, 46),
	SurfaceOverlay = Color3.fromRGB(41, 46, 58),

	Border = Color3.fromRGB(52, 58, 72),
	BorderFocused = Color3.fromRGB(88, 101, 128),

	Text = Color3.fromRGB(232, 236, 245),
	TextMuted = Color3.fromRGB(146, 155, 174),
	TextDisabled = Color3.fromRGB(94, 102, 118),

	Accent = Color3.fromRGB(96, 165, 250),
	AccentPressed = Color3.fromRGB(69, 134, 216),

	Success = Color3.fromRGB(74, 201, 126),
	Warning = Color3.fromRGB(230, 173, 66),
	Danger = Color3.fromRGB(233, 92, 92),

	-- Le rouge du bouton "EN DIRECT". Volontairement plus saturé que Danger :
	-- quand il s'allume, le joueur doit le voir du coin de l'oeil.
	Live = Color3.fromRGB(255, 61, 61),

	Shadow = Color3.fromRGB(0, 0, 0),
}

--- Résout une police par son nom, avec repli. Les polices Builder ne sont
--- pas présentes sur toutes les versions du client, et une seule police
--- manquante suffirait à empêcher tout l'OS de se charger.
local function font(name: string, fallback: Enum.Font): Font
	local ok, value = pcall(function()
		return (Enum.Font :: any)[name]
	end)

	if ok and value then
		return Font.fromEnum(value)
	end

	return Font.fromEnum(fallback)
end

Theme.Font = {
	Regular = font("BuilderSans", Enum.Font.Gotham),
	Medium = font("BuilderSansMedium", Enum.Font.GothamMedium),
	Bold = font("BuilderSansExtraBold", Enum.Font.GothamBold),
	-- Le monospace sert au BIOS, aux logs et aux chiffres qui défilent :
	-- une largeur fixe évite que les compteurs tremblent en changeant.
	Mono = font("Code", Enum.Font.RobotoMono),
}

Theme.TextSize = {
	Tiny = 11,
	Small = 13,
	Body = 15,
	Title = 18,
	Heading = 24,
	Display = 34,
}

-- Échelle d'espacement en multiples de 4. Utiliser autre chose que ces
-- valeurs est la façon la plus rapide de rendre une interface "presque bien".
Theme.Space = {
	XS = 4,
	SM = 8,
	MD = 12,
	LG = 16,
	XL = 24,
	XXL = 32,
}

Theme.Radius = {
	Small = UDim.new(0, 4),
	Medium = UDim.new(0, 8),
	Large = UDim.new(0, 12),
	Pill = UDim.new(1, 0),
}

Theme.Layout = {
	TaskbarHeight = 44,
	TitleBarHeight = 32,
	WindowMinSize = Vector2.new(320, 200),
	ResizeGripSize = 14,
	-- Résolution logique de l'écran d'ordinateur. Toute l'UI est dessinée
	-- dans ce repère puis projetée sur la dalle 3D, donc une fenêtre de
	-- 640x400 fait toujours la même taille relative quel que soit le moniteur.
	ScreenResolution = Vector2.new(1280, 720),
}

-- Les courbes d'animation. C'est ce qui sépare une UI qui "claque" d'une UI
-- qui a l'air molle. Sortie rapide, entrée douce.
Theme.Motion = {
	Instant = TweenInfo.new(0.08, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
	Fast = TweenInfo.new(0.15, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
	Normal = TweenInfo.new(0.24, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
	Slow = TweenInfo.new(0.4, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
	-- Pour les fenêtres qui s'ouvrent : un léger dépassement donne du poids.
	Pop = TweenInfo.new(0.22, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
}

Theme.ZIndex = {
	Desktop = 1,
	WindowBase = 10, -- les fenêtres s'empilent à partir d'ici
	WindowMax = 900,
	Taskbar = 950,
	Notification = 970,
	Modal = 990,
	BootScreen = 1000,
}

return Theme
