/**
 * La description complète du serveur Kayzx TV.
 *
 * C'est le seul fichier à modifier pour changer le serveur : le déploiement le lit et
 * applique les différences. On peut le relancer autant de fois qu'on veut, il met à jour
 * au lieu de dupliquer.
 *
 * Les clés sont en français pour que ce fichier reste modifiable sans être développeur.
 * Une « clé » (cle) est un identifiant interne, jamais affiché : elle sert à retrouver un
 * salon d'un déploiement à l'autre, même après l'avoir renommé.
 */

/** La palette du pack de stream. Ne pas inventer de couleur ici : tout vient de la DA. */
export const couleurs = {
  teal:       0x1e5b57,   // forest teal   — la communauté
  tealProfond:0x123a38,
  tealNeon:   0x3fd3c2,
  miel:       0xe0a93b,   // honey gold    — le direct et les matchs
  mielClair:  0xf2c97a,
  corail:     0xb9533f,   // corail        — le staff
  chene:      0x8a5a36,   // chêne         — le gaming
  papier:     0xf1ece3,
  nuit:       0x0f1519,
};

/** Un univers = une couleur de bandeau de carte. */
export const univers = {
  communaute: { couleur: couleurs.teal,   bandeau: '#1E5B57' },
  direct:     { couleur: couleurs.miel,   bandeau: '#E0A93B' },
  gaming:     { couleur: couleurs.chene,  bandeau: '#8A5A36' },
  staff:      { couleur: couleurs.corail, bandeau: '#B9533F' },
};

export const serveur = {
  nom: 'Kayzx TV',
  // Publics tous les deux : ils n'ouvrent aucun accès, seul le token en donne.
  id: '1565430915746762923',            // le serveur Discord
  application: '1565431264855466074',   // l'application du bot
  // Le salon où Discord envoie ses propres messages système (arrivées, boosts).
  salonSysteme: 'bienvenue',
  salonRegles: 'reglement',
  // Niveau de vérification : 'moyen' = compte Discord de plus de 5 minutes.
  verification: 'moyen',
};

/**
 * Les rôles, du plus haut au plus bas. L'ordre du tableau EST la hiérarchie.
 * Le rôle du bot n'est pas listé : Discord le crée à l'invitation et il doit rester
 * au-dessus de tout le reste (à faire glisser à la main une seule fois).
 */
export const roles = [
  { cle: 'proprietaire', nom: 'Kayzx',          couleur: couleurs.miel,        affiche: true,  pouvoirs: ['administrateur'] },
  { cle: 'administration',nom: 'Administration',couleur: couleurs.corail,      affiche: true,  pouvoirs: ['moderer', 'gererSalons', 'gererRoles', 'gererMessages', 'mentionnerTous'] },
  { cle: 'moderation',   nom: 'Modération',     couleur: couleurs.teal,        affiche: true,  pouvoirs: ['moderer', 'gererMessages'] },
  { cle: 'regie',        nom: 'Régie',          couleur: couleurs.chene,       affiche: true,  pouvoirs: ['gererMessages', 'mentionnerTous'] },
  { cle: 'intervenant',  nom: 'Intervenant',    couleur: couleurs.tealNeon,    affiche: true,  pouvoirs: [], temporaire: true,
    note: 'Donné par le bot le temps d\'une diffusion, retiré à la fin.' },
  { cle: 'enDirect',     nom: 'En direct',      couleur: couleurs.miel,        affiche: true,  pouvoirs: [], automatique: true },
  { cle: 'clippeur',     nom: 'Clippeur',       couleur: couleurs.mielClair,   affiche: true,  pouvoirs: [] },
  { cle: 'abonneTwitch', nom: 'Abonné Twitch',  couleur: couleurs.tealProfond, affiche: true,  pouvoirs: [],
    note: 'Synchronisé par l\'intégration Twitch native de Discord, pas par le bot.' },
  { cle: 'membre',       nom: 'Membre',         couleur: null,                 affiche: false, pouvoirs: [] },
  { cle: 'quarantaine',  nom: 'En quarantaine', couleur: couleurs.nuit,        affiche: false, pouvoirs: [] },
];

/** Choisis par le membre dans #les-roles. Personne n'est mentionné sans l'avoir demandé. */
export const rolesNotification = [
  { cle: 'pingLive',      nom: 'Ping Live',      emoji: '🔴', texte: 'Quand le live démarre' },
  { cle: 'pingMatch',     nom: 'Ping Match',     emoji: '⚽', texte: 'Avant chaque match diffusé' },
  { cle: 'pingEvenement', nom: 'Ping Événement', emoji: '🎉', texte: 'Tournois, soirées, annonces importantes' },
];

/** Centres d'intérêt : filtrent les annonces et servent à trouver des joueurs. */
export const rolesInteret = [
  { cle: 'football',  nom: 'Football',  emoji: '⚽' },
  { cle: 'mma',       nom: 'MMA',       emoji: '🥊' },
  { cle: 'gta',       nom: 'GTA',       emoji: '🚗' },
  { cle: 'roblox',    nom: 'Roblox',    emoji: '🧱' },
  { cle: 'eafc',      nom: 'EA FC',     emoji: '🎮' },
  { cle: 'minecraft', nom: 'Minecraft', emoji: '⛏️' },
];

/**
 * Les catégories et leurs salons.
 *
 * acces : 'tous'    → @everyone voit (en lecture seule)
 *         'membre'  → il faut le rôle Membre
 *         'staff'   → Modération et au-dessus, caché pour les autres
 *
 * type  : 'texte' | 'annonce' | 'vocal' | 'conference' | 'hub' | 'journal'
 *         'journal' = texte où personne n'écrit, pas même l'administration.
 *         'hub'     = vocal qui crée un salon à la demande quand on s'y connecte.
 */
export const categories = [
  {
    cle: 'accueil', nom: '📌 ・ A C C U E I L', univers: 'communaute', acces: 'tous',
    salons: [
      { cle: 'bienvenue', nom: '👋・bienvenue', type: 'texte', lectureSeule: true,
        sujet: 'Commence ici.',
        carte: {
          intro: 'Bienvenue sur le Discord de **Kayzx TV**. Ici on suit les lives, on regarde les matchs ensemble et on joue.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Lis le règlement', texte: 'Il tient sur une image, ça prend trente secondes.' },
            { type: 'num', symbole: '2', titre: 'Choisis tes rôles', texte: 'Dans #les-roles, pour être prévenu de ce qui t\'intéresse — et de rien d\'autre.' },
            { type: 'plus', symbole: '★', titre: 'Présente-toi', texte: 'Un message dans #general suffit. On ne mord pas.' },
          ],
          ailleurs: [['Une question, un souci', '#tickets'], ['Les liens de la chaîne', '#liens']],
          note: 'Le bouton ci-dessous débloque tout le serveur.',
          bouton: { texte: 'J\'ai lu le règlement', donne: 'membre' },
        } },
      { cle: 'reglement', nom: '📜・règlement', type: 'texte', lectureSeule: true,
        sujet: 'Six règles, et elles tiennent sur une carte.',
        carte: {
          intro: 'Six règles. Elles valent pour tout le monde, à toute heure.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Respect', texte: 'Pas d\'insulte, pas de moquerie, pas de harcèlement. Jamais.' },
            { type: 'num', symbole: '2', titre: 'Français', texte: 'Pour que tout le monde suive, et que les modos puissent lire.' },
            { type: 'non', symbole: '✕', titre: 'Pas de pub', texte: 'Aucun lien ni chaîne à promouvoir, même en message privé.' },
            { type: 'non', symbole: '✕', titre: 'Pas de contenu sensible', texte: 'Ni spoil, ni image choquante, ni sujet qui dérape.' },
            { type: 'non', symbole: '✕', titre: 'Pas de spam', texte: 'Ni majuscules en rafale, ni même message en boucle.' },
            { type: 'plus', symbole: '♥', titre: 'Respecte les modos', texte: 'Ils sont bénévoles. Leur décision ne se négocie pas en public.' },
          ],
          note: 'Un rappel, puis une exclusion temporaire, puis un bannissement. C\'est aussi simple que ça.',
        } },
      { cle: 'annonces', nom: '📣・annonces', type: 'annonce', lectureSeule: true, botSeul: true,
        sujet: 'Tout l\'officiel, publié par la chaîne.',
        carte: {
          intro: 'Les annonces officielles de **Kayzx TV**. Publiées par la chaîne, jamais par un particulier.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Lecture seule', texte: 'Personne n\'écrit ici. Les réactions en emoji sont ouvertes.' },
            { type: 'plus', symbole: '★', titre: 'Être prévenu', texte: 'Prends le rôle qui t\'intéresse dans #les-roles. Pas de mention non désirée.' },
          ],
          ailleurs: [['En discuter', '#general'], ['Le calendrier', '#programme']],
        } },
      { cle: 'lesRoles', nom: '🎭・les-rôles', type: 'texte', lectureSeule: true,
        sujet: 'Choisis ce dont tu veux être prévenu.',
        carte: {
          intro: 'Choisis tes rôles. Ils décident de **ce dont tu es prévenu** et de ce qu\'on te propose.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Les notifications', texte: 'Live, matchs, événements. Tu ne seras mentionné que pour ce que tu coches.' },
            { type: 'num', symbole: '2', titre: 'Tes centres d\'intérêt', texte: 'Foot, MMA, tes jeux. Ça sert aussi à te trouver des coéquipiers.' },
            { type: 'plus', symbole: '★', titre: 'Modifiable à tout moment', texte: 'Reviens ici quand tu veux, rien n\'est définitif.' },
          ],
          note: 'Les menus sont juste en dessous.',
        } },
      { cle: 'liens', nom: '🔗・liens', type: 'texte', lectureSeule: true,
        sujet: 'Twitch, YouTube, TikTok, X.',
        carte: {
          intro: 'Tous les endroits où retrouver **Kayzx TV**.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Twitch', texte: 'Le live, c\'est là que tout se passe en premier.' },
            { type: 'num', symbole: '2', titre: 'YouTube', texte: 'Les rediffusions et les meilleurs moments.' },
            { type: 'num', symbole: '3', titre: 'TikTok et X', texte: 'Les clips courts, et les annonces de dernière minute.' },
          ],
          note: 'Les boutons ci-dessous ouvrent chaque chaîne.',
        } },
    ],
  },

  {
    cle: 'communaute', nom: '💬 ・ L A  C O M M U N A U T É', univers: 'communaute', acces: 'membre',
    salons: [
      { cle: 'general', nom: '🗨️・général', type: 'texte', sujet: 'La discussion principale.',
        carte: {
          intro: 'Le salon principal. Tout ce qui ne va nulle part ailleurs va **ici**.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Une discussion à la fois', texte: 'Si un sujet s\'emballe, on ouvre un fil pour ne pas écraser les autres.' },
            { type: 'non', symbole: '✕', titre: 'Pas de mur de messages', texte: 'Une idée par message, pas une ligne par message.' },
            { type: 'plus', symbole: '♥', titre: 'Accueille les nouveaux', texte: 'Un bonjour coûte deux secondes et change tout.' },
          ],
          ailleurs: [['Hors-sujet', '#détente'], ['Un clip', '#clips'], ['Une idée', '#suggestions']],
        } },
      { cle: 'detente', nom: '🛋️・détente', type: 'texte', sujet: 'Hors-sujet, photos, mèmes.',
        carte: {
          intro: 'Le hors-sujet assumé : photos, mèmes, musique, ce que tu veux.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Le règlement s\'applique quand même', texte: 'Détente ne veut pas dire zone de non-droit.' },
            { type: 'non', symbole: '✕', titre: 'Pas de contenu choquant', texte: 'En cas de doute, c\'est non.' },
            { type: 'non', symbole: '✕', titre: 'Pas de pub déguisée', texte: 'Ta chaîne, ton serveur, ton lien : non, même en passant.' },
          ],
          ailleurs: [['Parler du live', '#general'], ['Un clip du live', '#clips']],
        } },
      { cle: 'clips', nom: '🎬・clips', type: 'texte', sujet: 'Les meilleurs moments du live.',
        carte: {
          intro: 'Les meilleurs moments du live, repérés par **vous**.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Un clip par message', texte: 'Le lien Twitch ou le fichier, et c\'est tout. Les réactions se font en emoji.' },
            { type: 'non', symbole: '✕', titre: 'Pas de clips d\'autres chaînes', texte: 'Ici c\'est le live de Kayzx. Le reste va en détente.' },
            { type: 'plus', symbole: '★', titre: 'Le clip de la semaine', texte: 'Le plus voté passe sur TikTok, avec ton pseudo.' },
          ],
          ailleurs: [['Discuter du live', '#general'], ['Un souci', '#tickets']],
          note: 'Tu ne sais pas clipper ? Tape **/aide clips**, je te montre en dix secondes.',
        } },
      { cle: 'suggestions', nom: '💡・suggestions', type: 'texte', sujet: 'Tes idées pour la chaîne et le serveur.',
        carte: {
          intro: 'Une idée pour la chaîne ou pour le serveur ? Pose-la ici, elle sera lue.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Une idée par message', texte: 'Le bot ajoute les votes automatiquement.' },
            { type: 'num', symbole: '2', titre: 'Dis pourquoi', texte: 'Pas seulement quoi. Une idée argumentée passe dix fois mieux.' },
            { type: 'non', symbole: '✕', titre: 'Pas de « fais un stream sur X »', texte: 'Sans un minimum d\'explication, ça ne mène nulle part.' },
          ],
          ailleurs: [['Les idées retenues', '#annonces'], ['Un problème à signaler', '#tickets']],
        } },
      { cle: 'vocalTexte', nom: '⌨️・vocal-texte', type: 'texte', sujet: 'Le fil texte des vocaux.',
        carte: {
          intro: 'Le salon texte qui accompagne les vocaux : liens, images, pseudos à ajouter.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Pendant une partie', texte: 'Tout ce qu\'on se passe sans couper la conversation.' },
            { type: 'non', symbole: '✕', titre: 'Pas de conversation de fond', texte: 'Elle a sa place en #general.' },
          ],
          ailleurs: [['Lancer un vocal', 'Créer un vocal'], ['Chercher des joueurs', '#recherche-équipe']],
        } },
    ],
  },

  {
    cle: 'direct', nom: '📺 ・ L E  D I R E C T', univers: 'direct', acces: 'membre',
    salons: [
      { cle: 'live', nom: '🔴・live', type: 'texte', lectureSeule: true, botSeul: true,
        sujet: 'Le live démarre ici.',
        carte: {
          intro: 'Le bot annonce ici **chaque démarrage de live**, avec le titre et la miniature.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Lecture seule', texte: 'Pour que l\'annonce ne soit jamais noyée.' },
            { type: 'plus', symbole: '★', titre: 'Être prévenu', texte: 'Prends le rôle Ping Live dans #les-roles.' },
          ],
          ailleurs: [['Réagir pendant le live', '#general'], ['Pendant un match', '#tribune']],
        } },
      { cle: 'tribune', nom: '🗣️・tribune', type: 'texte', sujet: 'Le chat pendant la diffusion.',
        carte: {
          intro: 'Le salon de réaction pendant la diffusion. Ça va vite, c\'est **normal**.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Réagis librement', texte: 'C\'est l\'endroit fait pour ça. Les majuscules sont tolérées ici.' },
            { type: 'non', symbole: '✕', titre: 'Pas de spoil', texte: 'Si le match est diffusé en différé, on attend le coup de sifflet.' },
            { type: 'non', symbole: '✕', titre: 'Pas d\'insulte', texte: 'Ni joueur, ni combattant, ni arbitre. On commente, on n\'agresse pas.' },
          ],
          ailleurs: [['Parler au micro', 'Le Plateau'], ['Analyse à froid', '#résultats']],
        } },
      { cle: 'programme', nom: '📅・programme', type: 'texte', lectureSeule: true,
        sujet: 'Le calendrier des lives et des matchs.',
        carte: {
          intro: 'Le calendrier : lives, matchs de **Ligue 1**, cartes **MMA** et grands rendez-vous.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Mis à jour par la régie', texte: 'Chaque ajout apparaît automatiquement ici.' },
            { type: 'plus', symbole: '★', titre: 'La semaine en un coup d\'œil', texte: 'Tape /programme, où que tu sois sur le serveur.' },
          ],
          ailleurs: [['Être prévenu', '#les-rôles'], ['Regarder', 'Le Plateau']],
          note: 'Les horaires peuvent bouger : le changement est toujours annoncé.',
        } },
      { cle: 'resultats', nom: '📊・résultats', type: 'texte', lectureSeule: true,
        sujet: 'Les résumés d\'après-match.',
        carte: {
          intro: 'Le résumé de chaque match diffusé, posté après le coup de sifflet.',
          regles: [
            { type: 'num', symbole: '1', titre: 'L\'analyse à froid', texte: 'C\'est ici qu\'on revient sur ce qui s\'est passé, une fois l\'émotion retombée.' },
            { type: 'plus', symbole: '★', titre: 'Les pronostics', texte: 'Le classement est mis à jour avec chaque résultat.' },
          ],
          ailleurs: [['Réagir en direct', '#tribune'], ['Le prochain match', '#programme']],
        } },
      { cle: 'plateau', nom: '🎙️ Le Plateau', type: 'conference',
        sujet: 'La diffusion commentée.',
        carte: {
          intro: 'Le vocal de diffusion. On regarde le match **ensemble**, commenté en direct.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Le micro est aux intervenants', texte: 'Tout le monde écoute. Les réactions passent en texte, en tribune.' },
            { type: 'non', symbole: '✕', titre: 'Pas de spoil du résultat', texte: 'Beaucoup regardent en différé. On attend le coup de sifflet.' },
            { type: 'plus', symbole: '★', titre: 'Demander le micro', texte: 'Tape /micro : la régie t\'ouvre le son si le moment s\'y prête.' },
          ],
          ailleurs: [['Réagir', '#tribune'], ['Le calendrier', '#programme'], ['Les résumés', '#résultats']],
          note: 'Football, MMA et les grands rendez-vous. Le programme de la semaine : **/programme**.',
        } },
      { cle: 'loge', nom: '🎧 La Loge', type: 'vocal', acces: 'staff',
        sujet: 'Avant et après la diffusion.',
        carte: {
          intro: 'Le vocal fermé des intervenants : on se cale avant, on débriefe après.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Régie et intervenants', texte: 'Personne d\'autre n\'entre, même pendant la diffusion.' },
            { type: 'plus', symbole: '★', titre: 'Le point d\'avant-match', texte: 'Répartition des rôles, ordre de passage, ce qu\'on annonce.' },
          ],
          ailleurs: [['La diffusion', 'Le Plateau'], ['Préparer', '#régie']],
        } },
    ],
  },

  {
    cle: 'gaming', nom: '🎮 ・ G A M I N G', univers: 'gaming', acces: 'membre',
    salons: [
      { cle: 'jeux', nom: '🕹️・jeux', type: 'texte', sujet: 'Discussion jeux.',
        carte: {
          intro: 'Les jeux : sorties, bons plans, sessions à organiser.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Tous les jeux', texte: 'Pas seulement ceux du live. Parle de ce que tu joues.' },
            { type: 'non', symbole: '✕', titre: 'Pas de recherche de joueurs', texte: 'Elle a son salon, sinon tout se noie.' },
          ],
          ailleurs: [['Chercher des joueurs', '#recherche-équipe'], ['Lancer un vocal', 'Créer un vocal']],
        } },
      { cle: 'rechercheEquipe', nom: '🔍・recherche-équipe', type: 'texte', sujet: 'Trouver des joueurs.',
        carte: {
          intro: 'Tu cherches des joueurs ? C\'est **ici**, et nulle part ailleurs.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Un message = une recherche', texte: 'Jeu, nombre de places, niveau, horaire. Tout en un message.' },
            { type: 'num', symbole: '2', titre: 'Préviens quand c\'est complet', texte: 'Une réaction suffit, les autres arrêtent de te répondre.' },
            { type: 'non', symbole: '✕', titre: 'Pas de relance en boucle', texte: 'Une fois, puis on attend. Pas toutes les dix minutes.' },
          ],
          ailleurs: [['Discuter du jeu', '#jeux'], ['Lancer un vocal', 'Créer un vocal']],
        } },
      { cle: 'creerVocal', nom: '➕ Créer un vocal', type: 'hub',
        sujet: 'Connecte-toi, ton salon se crée.',
        carte: {
          intro: 'Les salons de jeu se créent **tout seuls**. Connecte-toi à « ➕ Créer un vocal ».',
          regles: [
            { type: 'num', symbole: '1', titre: 'Le salon est à toi', texte: 'Tu peux le renommer, limiter les places, en verrouiller l\'accès.' },
            { type: 'num', symbole: '2', titre: 'Il disparaît tout seul', texte: 'Une fois vide, il se supprime. Plus de vocaux fantômes dans la liste.' },
            { type: 'non', symbole: '✕', titre: 'Pas de musique à fond', texte: 'Ni soundboard en boucle. Le staff coupe sans prévenir.' },
          ],
          ailleurs: [['Chercher des joueurs', '#recherche-équipe'], ['Regarder un match', 'Le Plateau']],
          note: 'Règle ton salon avec **/vocal** : nom, nombre de places, verrouillage.',
        } },
      { cle: 'salonCommun', nom: '🔊 Salon commun', type: 'vocal',
        sujet: 'Le vocal toujours ouvert.',
        carte: {
          intro: 'Le vocal permanent. Entre, même s\'il est vide : c\'est comme ça qu\'il se remplit.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Ouvert à tous', texte: 'Pas besoin d\'invitation ni de prévenir.' },
            { type: 'plus', symbole: '★', titre: 'Besoin d\'être au calme ?', texte: 'Crée ton propre salon avec « ➕ Créer un vocal ».' },
          ],
          ailleurs: [['Ton propre salon', 'Créer un vocal'], ['Le fil texte', '#vocal-texte']],
        } },
    ],
  },

  {
    cle: 'support', nom: '🎟️ ・ S U P P O R T', univers: 'communaute', acces: 'membre',
    salons: [
      { cle: 'tickets', nom: '📩・tickets', type: 'texte', lectureSeule: true,
        sujet: 'Ouvrir un ticket avec le staff.',
        carte: {
          intro: 'Un souci avec un membre, une question pour le staff, un problème technique ?',
          regles: [
            { type: 'num', symbole: '1', titre: 'Clique sur le bouton', texte: 'Choisis la catégorie, décris en quelques lignes.' },
            { type: 'num', symbole: '2', titre: 'Un salon privé s\'ouvre', texte: 'Seuls toi et le staff le voyez. Il est supprimé à la fermeture.' },
            { type: 'non', symbole: '✕', titre: 'N\'écris pas en privé à un modo', texte: 'Ça ne laisse aucune trace, et ça se perd.' },
          ],
          ailleurs: [['Juste une idée', '#suggestions'], ['Le règlement', '#règlement']],
          bouton: { texte: 'Ouvrir un ticket', action: 'ticket' },
        } },
    ],
  },

  {
    cle: 'staff', nom: '🛠️ ・ S T A F F', univers: 'staff', acces: 'staff',
    salons: [
      { cle: 'bureau', nom: '🗂️・bureau', type: 'texte', sujet: 'La coordination de l\'équipe.',
        carte: {
          intro: 'La coordination de l\'équipe. Les décisions se prennent **ici**, jamais en privé.',
          commandes: [
            ['/sanction',   'Avertir, exclure, bannir.', 'Motif obligatoire.'],
            ['/historique', 'Le passé d\'un membre.', 'Sanctions, notes, arrivée.'],
            ['/note',       'Une note privée sur un membre.', 'Visible du seul staff.'],
            ['/annonce',    'Publier au nom de la chaîne.', 'Aperçu avant envoi.'],
          ],
          ailleurs: [['Signalements', '#tickets'], ['Journal', '#traces'], ['Un doute', 'on en parle avant d\'agir']],
          note: 'Une sanction contestée se rediscute ici, à froid. On ne revient jamais sur la décision d\'un modo devant la communauté.',
        } },
      { cle: 'decisions', nom: '⚖️・décisions', type: 'texte', sujet: 'Ce qui est acté, et pourquoi.',
        carte: {
          intro: 'La mémoire de l\'équipe : ce qui a été décidé, et **pourquoi**.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Une décision par message', texte: 'Le quoi, le pourquoi, la date. Court suffit.' },
            { type: 'non', symbole: '✕', titre: 'Pas de débat ici', texte: 'Le débat a lieu au bureau. Ici, on acte.' },
          ],
          ailleurs: [['En débattre', '#bureau'], ['L\'annoncer', '#régie']],
        } },
      { cle: 'signalements', nom: '🚨・signalements', type: 'texte', sujet: 'Tickets et transcriptions.',
        carte: {
          intro: 'Les tickets remontés et les transcriptions des salons fermés.',
          commandes: [
            ['/historique', 'Le passé du membre concerné.', 'Avant de trancher.'],
            ['/note',       'Garder une trace.', 'Même sans sanction.'],
          ],
          ailleurs: [['Décider', '#bureau'], ['Le journal', '#traces']],
        } },
      { cle: 'regie', nom: '🎛️・régie', type: 'texte', sujet: 'Préparer ce qui sera publié.',
        carte: {
          intro: 'Tout ce qui sera publié passe **d\'abord ici**.',
          commandes: [
            ['/annonce',   'Rédiger, prévisualiser, programmer.', 'Rien ne part sans aperçu.'],
            ['/programme', 'Ajouter un match ou un live.', 'Apparaît dans #programme.'],
            ['/plateau',   'Ouvrir la diffusion.', 'Crée le vocal, distribue les micros.'],
            ['/micro',     'Donner ou retirer Intervenant.', 'Pendant la diffusion.'],
          ],
          ailleurs: [['Le calendrier', '#programme'], ['La diffusion', 'Le Plateau']],
          note: 'Une annonce engage la chaîne : on la relit à deux.',
        } },
      { cle: 'traces', nom: '📋・traces', type: 'journal', sujet: 'Journal de modération.',
        carte: {
          intro: 'Chaque sanction : qui, quand, pourquoi, par qui.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Écrit par le bot seul', texte: 'Personne ne peut écrire ici, pas même l\'administration.' },
            { type: 'plus', symbole: '★', titre: 'Un journal qu\'on peut éditer ne vaut rien', texte: 'C\'est pour ça qu\'il est verrouillé pour tous.' },
          ],
          ailleurs: [['Le passé d\'un membre', '/historique'], ['En discuter', '#bureau']],
        } },
      { cle: 'mouvements', nom: '🚪・mouvements', type: 'journal', sujet: 'Arrivées, départs, pseudos.',
        carte: {
          intro: 'Arrivées, départs, changements de pseudo et d\'avatar.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Repérer une vague', texte: 'Vingt arrivées en deux minutes, c\'est une attaque, pas un succès.' },
            { type: 'plus', symbole: '★', titre: 'Retrouver un ancien pseudo', texte: 'Utile quand quelqu\'un revient sous un autre nom.' },
          ],
          ailleurs: [['Agir', '#bureau'], ['Les sanctions', '#traces']],
        } },
      { cle: 'messages', nom: '🗑️・messages', type: 'journal', sujet: 'Messages supprimés et édités.',
        carte: {
          intro: 'Les messages supprimés et édités, avec leur contenu d\'origine.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Pour instruire un signalement', texte: 'Un message effacé reste consultable ici.' },
            { type: 'non', symbole: '✕', titre: 'Pas pour surveiller', texte: 'On y regarde quand il y a un signalement, pas par curiosité.' },
          ],
          ailleurs: [['Le signalement', '#signalements'], ['Décider', '#bureau']],
        } },
      { cle: 'reunion', nom: '🤝 Réunion', type: 'vocal', sujet: 'Le vocal du staff.',
        carte: {
          intro: 'Le vocal de l\'équipe. Fermé, et il le reste.',
          regles: [
            { type: 'num', symbole: '1', titre: 'Le point d\'équipe', texte: 'Ce qui se dit ici ne sort pas d\'ici.' },
            { type: 'plus', symbole: '★', titre: 'Acter ensuite', texte: 'Ce qui est décidé part dans #décisions, sinon c\'est perdu.' },
          ],
          ailleurs: [['Acter', '#décisions'], ['La diffusion', 'La Loge']],
        } },
    ],
  },
];

/** Compte ce que le déploiement va créer, pour l'afficher avant d'agir. */
export function resume() {
  const salons = categories.flatMap((c) => c.salons);
  return {
    roles: roles.length + rolesNotification.length + rolesInteret.length,
    categories: categories.length,
    salons: salons.length,
    cartes: salons.filter((s) => s.carte).length,
  };
}
