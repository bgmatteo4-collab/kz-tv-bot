/**
 * La déclaration des commandes slash : ce que Discord affiche quand on tape « / ».
 *
 * Ce fichier ne contient que la forme des commandes — leurs noms, leurs options, qui a le
 * droit de les voir. Ce qu'elles font est dans bot/actions/.
 *
 * `reserve` fixe la permission minimale pour que la commande apparaisse. Discord masque
 * alors la commande aux autres : c'est plus clair qu'un refus après coup.
 */

const T = { SOUS_COMMANDE: 1, CHAINE: 3, ENTIER: 4, BOOLEEN: 5, MEMBRE: 6, SALON: 7, ROLE: 8 };

/** Les permissions Discord utilisées comme garde-fou, en chaîne décimale. */
const RESERVE = {
  moderer: String(1n << 40n),          // exclure temporairement
  gererMessages: String(1n << 13n),
  gererSalons: String(1n << 4n),
  gererRoles: String(1n << 28n),
};

export const commandes = [
  /* ---------------------------------------------------------------- tout le monde */
  {
    name: 'salon',
    description: 'Rappelle à quoi sert ce salon, en message privé.',
  },
  {
    name: 'aide',
    description: 'Comment faire quelque chose sur le serveur.',
    options: [{
      type: T.CHAINE, name: 'sujet', description: 'Ce que tu cherches à faire', required: false,
      choices: [
        { name: 'Clipper un moment du live', value: 'clips' },
        { name: 'Choisir mes notifications', value: 'roles' },
        { name: 'Lancer un salon vocal', value: 'vocal' },
        { name: 'Suivre les matchs', value: 'matchs' },
        { name: 'Signaler un problème', value: 'tickets' },
      ],
    }],
  },
  {
    name: 'sondage',
    description: 'Poser une question à la communauté.',
    options: [
      { type: T.CHAINE, name: 'question', description: 'La question posée', required: true },
      { type: T.CHAINE, name: 'choix', description: 'Les réponses, séparées par des virgules', required: true },
      { type: T.ENTIER, name: 'heures', description: 'Durée avant la clôture (défaut : 24 h)', required: false,
        min_value: 1, max_value: 336 },
      { type: T.BOOLEEN, name: 'multiple', description: 'Autoriser plusieurs réponses', required: false },
      { type: T.BOOLEEN, name: 'anonyme', description: 'Cacher qui a voté quoi', required: false },
    ],
  },
  {
    name: 'vocal',
    description: 'Régler le salon vocal que tu as créé.',
    options: [
      { type: T.SOUS_COMMANDE, name: 'nom', description: 'Renommer ton salon',
        options: [{ type: T.CHAINE, name: 'nom', description: 'Le nouveau nom', required: true, max_length: 60 }] },
      { type: T.SOUS_COMMANDE, name: 'places', description: 'Limiter le nombre de personnes',
        options: [{ type: T.ENTIER, name: 'nombre', description: '0 pour aucune limite', required: true,
          min_value: 0, max_value: 99 }] },
      { type: T.SOUS_COMMANDE, name: 'verrouiller', description: 'Fermer ou rouvrir l\'accès',
        options: [{ type: T.BOOLEEN, name: 'ferme', description: 'Vrai pour fermer', required: true }] },
    ],
  },
  {
    name: 'micro',
    description: 'Demander la parole sur Le Plateau.',
  },

  /* ---------------------------------------------------------------- modération */
  {
    name: 'sanction',
    description: 'Avertir, exclure ou bannir un membre.',
    default_member_permissions: RESERVE.moderer,
    options: [
      { type: T.MEMBRE, name: 'membre', description: 'Qui est concerné', required: true },
      { type: T.CHAINE, name: 'type', description: 'La sanction', required: true, choices: [
        { name: 'Avertissement', value: 'avertir' },
        { name: 'Exclusion temporaire', value: 'exclure' },
        { name: 'Bannissement', value: 'bannir' },
      ] },
      { type: T.CHAINE, name: 'motif', description: 'Pourquoi — il sera écrit au journal', required: true, max_length: 400 },
      { type: T.CHAINE, name: 'duree', description: 'Pour une exclusion : 10m, 1h, 1j, 7j', required: false },
    ],
  },
  {
    name: 'historique',
    description: 'Le passé d\'un membre : sanctions, notes, arrivée.',
    default_member_permissions: RESERVE.moderer,
    options: [{ type: T.MEMBRE, name: 'membre', description: 'Qui', required: true }],
  },
  {
    name: 'note',
    description: 'Garder une trace sur un membre, sans le sanctionner.',
    default_member_permissions: RESERVE.moderer,
    options: [
      { type: T.MEMBRE, name: 'membre', description: 'Qui', required: true },
      { type: T.CHAINE, name: 'texte', description: 'Ce qu\'on veut se rappeler', required: true, max_length: 400 },
    ],
  },

  /* ---------------------------------------------------------------- régie */
  {
    name: 'annonce',
    description: 'Publier au nom de la chaîne, avec aperçu avant envoi.',
    default_member_permissions: RESERVE.gererMessages,
    options: [
      { type: T.SALON, name: 'salon', description: 'Où publier (défaut : annonces)', required: false,
        channel_types: [0, 5] },
      { type: T.ROLE, name: 'mentionner', description: 'Un rôle à prévenir', required: false },
    ],
  },
  {
    name: 'plateau',
    description: 'Ouvrir ou fermer la diffusion d\'un match.',
    default_member_permissions: RESERVE.gererSalons,
    options: [
      { type: T.SOUS_COMMANDE, name: 'ouvrir', description: 'Lancer la diffusion',
        options: [
          { type: T.CHAINE, name: 'titre', description: 'Ce qu\'on diffuse', required: true, max_length: 100 },
          { type: T.BOOLEEN, name: 'prevenir', description: 'Mentionner Ping Match', required: false },
        ] },
      { type: T.SOUS_COMMANDE, name: 'fermer', description: 'Terminer et retirer les micros' },
      { type: T.SOUS_COMMANDE, name: 'intervenant', description: 'Donner ou retirer le micro',
        options: [
          { type: T.MEMBRE, name: 'membre', description: 'Qui', required: true },
          { type: T.BOOLEEN, name: 'retirer', description: 'Vrai pour retirer', required: false },
        ] },
    ],
  },
  {
    name: 'programme',
    description: 'Le calendrier des lives et des matchs.',
    options: [
      { type: T.SOUS_COMMANDE, name: 'voir', description: 'Ce qui arrive cette semaine' },
      { type: T.SOUS_COMMANDE, name: 'ajouter', description: 'Inscrire un rendez-vous au calendrier',
        options: [
          { type: T.CHAINE, name: 'quoi', description: 'Le match ou le live', required: true, max_length: 100 },
          { type: T.CHAINE, name: 'quand', description: 'Par exemple : 02/11 21h00', required: true },
          { type: T.CHAINE, name: 'categorie', description: 'Le type de rendez-vous', required: false, choices: [
            { name: 'Football', value: 'football' },
            { name: 'MMA', value: 'mma' },
            { name: 'Live', value: 'live' },
            { name: 'Événement', value: 'evenement' },
          ] },
        ] },
      { type: T.SOUS_COMMANDE, name: 'retirer', description: 'Enlever un rendez-vous',
        options: [{ type: T.ENTIER, name: 'numero', description: 'Son numéro dans la liste', required: true, min_value: 1 }] },
    ],
  },

  /* ---------------------------------------------------------------- entretien */
  {
    name: 'cartes',
    description: 'Reposer les cartes de salon si l\'une a été supprimée.',
    default_member_permissions: RESERVE.gererSalons,
  },
];
