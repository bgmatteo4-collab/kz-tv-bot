--!strict
--[[
	Rundown — le vocabulaire d'une émission.

	MAQUETTE. Les segments existent comme données, mais rien ne les joue
	encore. Ce module fixe le catalogue de rubriques et leurs effets prévus,
	pour que la maquette du conducteur montre déjà les bons arbitrages.

	Chaque rubrique porte trois choses : un coût de préparation, une
	exigence de matériel ou de personnel, et un profil de réaction par
	segment d'audience. C'est ce dernier qui fait la profondeur — un débat
	technique enchante les fidèles et fait fuir les curieux, et aucun format
	ne plaît à tout le monde.
]]

export type SegmentKind =
	"intro" | "reaction" | "invite" | "debat" | "jeu" | "chat" | "appels" | "sujet" | "sponsor" | "conclusion"

export type SegmentType = {
	kind: SegmentKind,
	name: string,
	defaultMinutes: number,
	prepCost: number,
	description: string,
	risk: string,
	-- Réaction par segment d'audience, de -1 à 1.
	appeal: { [string]: number },
	requires: string?,
}

local Rundown = {}

Rundown.KindColor = {
	intro = Color3.fromRGB(96, 165, 250),
	reaction = Color3.fromRGB(232, 176, 88),
	invite = Color3.fromRGB(226, 130, 190),
	debat = Color3.fromRGB(168, 122, 236),
	jeu = Color3.fromRGB(74, 201, 126),
	chat = Color3.fromRGB(96, 200, 200),
	appels = Color3.fromRGB(255, 120, 100),
	sujet = Color3.fromRGB(150, 158, 176),
	sponsor = Color3.fromRGB(214, 168, 24),
	conclusion = Color3.fromRGB(120, 128, 148),
}

Rundown.Types = {
	{
		kind = "intro",
		name = "Générique et accueil",
		defaultMinutes = 5,
		prepCost = 1,
		description = "Le rituel d'ouverture. Court, identique chaque semaine, il installe l'habitude.",
		risk = "Le sauter désoriente les habitués.",
		appeal = { casual = 0.2, hardcore = 0.3, jeune = 0.1, donateur = 0.3, presse = 0.1 },
	},
	{
		kind = "reaction",
		name = "Réaction à l'actualité",
		defaultMinutes = 15,
		prepCost = 3,
		description = "Commenter ce qui vient de sortir. Demande d'avoir suivi, et se périme en deux jours.",
		risk = "Sans préparation, ça se voit immédiatement.",
		appeal = { casual = 0.4, hardcore = 0.2, jeune = 0.4, donateur = 0.1, presse = 0.2 },
	},
	{
		kind = "invite",
		name = "Interview d'un invité",
		defaultMinutes = 30,
		prepCost = 5,
		description = "Un invité apporte son audience. Il faut préparer ses questions, sinon il porte l'émission tout seul.",
		risk = "Deux publics incompatibles se déclarent la guerre dans le chat.",
		appeal = { casual = 0.5, hardcore = 0.3, jeune = 0.3, donateur = 0.4, presse = 0.6 },
		requires = "Table d'invités",
	},
	{
		kind = "debat",
		name = "Débat de fond",
		defaultMinutes = 25,
		prepCost = 4,
		description = "Le segment qui fidélise le plus et qui recrute le moins.",
		risk = "Les curieux décrochent au bout de six minutes.",
		appeal = { casual = -0.2, hardcore = 0.7, jeune = -0.3, donateur = 0.4, presse = 0.5 },
	},
	{
		kind = "jeu",
		name = "Jeu avec le chat",
		defaultMinutes = 20,
		prepCost = 2,
		description = "Faire participer la salle. Le moyen le plus fiable de réveiller une audience qui s'endort.",
		risk = "Ingérable au-delà d'un certain nombre de spectateurs.",
		appeal = { casual = 0.5, hardcore = 0.2, jeune = 0.6, donateur = 0.3, presse = -0.1 },
	},
	{
		kind = "chat",
		name = "Questions du chat",
		defaultMinutes = 15,
		prepCost = 1,
		description = "Lire et répondre. Presque aucune préparation, beaucoup de fidélisation.",
		risk = "Une seule mauvaise question peut faire dérailler dix minutes.",
		appeal = { casual = 0.3, hardcore = 0.5, jeune = 0.3, donateur = 0.6, presse = 0 },
	},
	{
		kind = "appels",
		name = "Appels du public",
		defaultMinutes = 20,
		prepCost = 3,
		description = "Prendre des gens en direct. Le segment le plus explosif du catalogue.",
		risk = "Soit un moment culte, soit un désastre en direct. Aucun intermédiaire.",
		appeal = { casual = 0.6, hardcore = 0.3, jeune = 0.5, donateur = 0.4, presse = 0.3 },
		requires = "Modérateur",
	},
	{
		kind = "sujet",
		name = "Sujet préparé",
		defaultMinutes = 18,
		prepCost = 6,
		description = "Un dossier monté à l'avance. Le plus cher en temps, et le seul qui grandit une chaîne.",
		risk = "Un sujet bâclé coûte plus qu'il ne rapporte.",
		appeal = { casual = 0.3, hardcore = 0.6, jeune = 0.2, donateur = 0.5, presse = 0.8 },
		requires = "Monteur",
	},
	{
		kind = "sponsor",
		name = "Séquence sponsorisée",
		defaultMinutes = 4,
		prepCost = 1,
		description = "Le passage obligé du contrat. Court, mais tout le monde le voit venir.",
		risk = "Chaque minute de plus coûte de la confiance.",
		appeal = { casual = -0.3, hardcore = -0.4, jeune = -0.2, donateur = -0.5, presse = 0 },
	},
	{
		kind = "conclusion",
		name = "Conclusion et au revoir",
		defaultMinutes = 6,
		prepCost = 1,
		description = "Remercier, annoncer la prochaine, laisser partir. Le moment où l'on fidélise ou pas.",
		risk = "Finir en retard fait partir les gens avant l'annonce.",
		appeal = { casual = 0.2, hardcore = 0.3, jeune = 0.1, donateur = 0.5, presse = 0.1 },
	},
}

function Rundown.GetType(kind: string): SegmentType?
	for _, entry in ipairs(Rundown.Types) do
		if entry.kind == kind then
			return entry :: any
		end
	end
	return nil
end

--- Un conducteur d'exemple, celui que montre la maquette.
Rundown.Example = {
	name = "LE POINT DU JEUDI",
	weekday = "jeudi",
	hour = "21:00",
	segments = {
		{ kind = "intro", name = "Générique", minutes = 5 },
		{ kind = "reaction", name = "L'actu de la semaine", minutes = 15 },
		{ kind = "sponsor", name = "Séquence partenaire", minutes = 4 },
		{ kind = "invite", name = "Invité — la relève du speedrun", minutes = 30 },
		{ kind = "debat", name = "Faut-il encore payer pour jouer ?", minutes = 25 },
		{ kind = "chat", name = "Vos questions", minutes = 15 },
		{ kind = "conclusion", name = "Au revoir", minutes = 6 },
	},
}

return Rundown
