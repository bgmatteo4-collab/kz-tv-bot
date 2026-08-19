--!strict
--[[
	Emails — le contenu de la boîte de réception.

	C'est ici que vit le ton du jeu : réaliste-satirique. Rien n'est
	caricatural ; c'est drôle parce que c'est vrai. Les mails servent aussi
	de tutoriel diégétique — le joueur n'ouvre jamais un panneau d'aide,
	il lit son courrier.

	Un mail peut proposer des `choices`. Chaque choix porte des `effects`
	appliqués par le serveur, jamais par le client.
]]

export type EmailChoice = {
	label: string,
	reply: string,
	effects: { [string]: any }?,
}

export type Email = {
	id: string,
	sender: string,
	address: string,
	subject: string,
	preview: string,
	body: { string },
	day: number,
	unread: boolean,
	choices: { EmailChoice }?,
}

local Emails: { Email } = {
	{
		id = "welcome",
		sender = "Twitchy",
		address = "ne-pas-repondre@twitchy.tv",
		subject = "Bienvenue sur Twitchy ! Ta chaîne est prête 🎉",
		preview = "Félicitations, tu fais maintenant partie des 9,4 millions de créateurs...",
		day = 1,
		unread = true,
		body = {
			"Salut !",
			"",
			"Félicitations, tu fais maintenant partie des 9,4 millions de créateurs actifs sur Twitchy. Ta chaîne est en ligne et prête à accueillir ta communauté.",
			"",
			"Pour lancer ton premier direct, ouvre KZ Studio, vérifie que ta caméra et ton micro apparaissent bien dans la liste des sources, puis clique sur PASSER EN DIRECT.",
			"",
			"Petit conseil de la part de l'équipe : la régularité prime sur la qualité. Streame tous les jours, même quand tu n'en as pas envie. Surtout quand tu n'en as pas envie.",
			"",
			"L'équipe Twitchy",
			"",
			"— Ce message est automatique. L'adresse d'envoi n'est pas surveillée. Pour contacter le support, consultez notre centre d'aide, puis notre forum, puis notre communauté Discord, puis débrouillez-vous.",
		},
	},

	{
		id = "roommate_noise",
		sender = "Maman",
		address = "cathy.dubreuil@wanadoo.fr",
		subject = "le bruit",
		preview = "mon chéri j'ai entendu crier hier vers 2h du matin, tout va bien ?",
		day = 2,
		unread = true,
		body = {
			"mon chéri",
			"",
			"j'ai entendu crier hier vers 2h du matin, tout va bien ? ton père voulait monter voir mais je lui ai dit de te laisser tranquille",
			"",
			"il dit que tu devrais quand même penser à envoyer des CV. je lui ai dit que c'était un vrai métier maintenant. il a fait son bruit avec la bouche.",
			"",
			"tu descends manger ce soir ?",
			"",
			"bisous",
		},
		choices = {
			{
				label = "Descendre manger (perd un créneau de stream)",
				reply = "oui je descends, à ce soir",
				effects = { energy = 15, familyTrust = 10, slotsLost = 1 },
			},
			{
				label = "Répondre plus tard (tu oublieras)",
				reply = "",
				effects = { familyTrust = -5 },
			},
		},
	},

	{
		id = "sponsor_brainfuel",
		sender = "Kevin Marchetti — BRAIN-FUEL",
		address = "k.marchetti@brainfuel-performance.io",
		subject = "Collaboration rémunérée — BRAIN-FUEL x ta chaîne",
		preview = "On suit ton travail depuis un moment et on kiffe vraiment ce que tu fais...",
		day = 4,
		unread = true,
		body = {
			"Yo !",
			"",
			"On suit ton travail depuis un moment et on kiffe vraiment ce que tu fais. Ton énergie correspond parfaitement aux valeurs de BRAIN-FUEL.",
			"",
			"On te propose un partenariat : 3 mentions par live, 4 lives par semaine, pendant un mois. 400 € versés à 60 jours.",
			"",
			"Ce qu'on attend de toi :",
			"— boire la canette à l'écran, visible, logo face caméra",
			"— dire \"BRAIN-FUEL, le carburant de ceux qui vont vite\" à voix haute",
			"— ne pas mentionner que le goût pastèque a été retiré du marché en Belgique",
			"",
			"Dis-moi si ça te parle, on est plusieurs sur le coup.",
			"",
			"Kevin",
			"Head of Creator Synergy",
		},
		choices = {
			{
				label = "Accepter — 400 € et un mois de mentions",
				reply = "Ça marche Kevin, on y va.",
				effects = { money = 400, sponsorContract = "brainfuel", audienceTrust = -12 },
			},
			{
				label = "Négocier — demander le double",
				reply = "Salut Kevin, merci pour la proposition. Sur ce volume de mentions je serais plutôt sur 800 €.",
				effects = { negotiation = "brainfuel" },
			},
			{
				label = "Refuser",
				reply = "Merci mais je vais passer.",
				effects = { audienceTrust = 4 },
			},
		},
	},

	{
		id = "viewer_wall",
		sender = "Thibault_92",
		address = "thibault.leroux92@gmail.com",
		subject = "quelques retours constructifs sur ta chaîne (long désolé)",
		preview = "Salut, alors déjà je précise que je dis ça en bien hein...",
		day = 6,
		unread = true,
		body = {
			"Salut,",
			"",
			"alors déjà je précise que je dis ça en bien hein, je regarde depuis le début et j'aime beaucoup ce que tu fais, mais je me permets quelques retours constructifs parce que je pense que tu peux vraiment percer si tu corriges deux trois trucs.",
			"",
			"1) Ton cadrage est trop serré. On voit pas assez ta pièce. Les gens aiment voir la pièce.",
			"2) Ton cadrage est trop large depuis que tu l'as changé. On voit ton mur. C'est vide.",
			"3) Tu dis \"du coup\" 34 fois par heure. J'ai compté sur le live de mardi.",
			"4) Le jeu auquel tu joues est mort. Tu devrais jouer à autre chose.",
			"5) Ne change pas de jeu par contre, c'est ce qui fait ton identité.",
			"",
			"Voilà, je dis ça avec bienveillance, je suis pas là pour casser. Continue comme ça mais change des trucs.",
			"",
			"Thibault",
			"(je peux être modérateur si tu veux, j'ai de l'expérience)",
		},
	},
}

return Emails
