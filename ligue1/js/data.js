// Tout le contenu affiché, repris de la page officielle des offres Ligue 1+
// (ligue1.com/fr/offres-ligue1plus, relevée le 9 octobre 2026).
'use strict';

const IMG_DIR = 'assets/images/';

// Grille du week-end : « live » = match en direct (carte blanche), sinon émission (carte rose).
const GRILLE = [
  { jour: 'Jeudi', progs: [
    { h: '20H45', n: 'Avant match', p: 'Timothée Maymon' },
    { h: '20H45', n: 'Ligue 3 <em>en direct</em>', p: 'Hamza Rahmani · Jérémy Clément', live: true },
    { h: '22H35', n: 'Le débrief', p: 'Timothée Maymon' },
  ] },
  { jour: 'Vendredi', progs: [
    { h: '19H45', n: 'Avant match', p: 'Thibault Le Rol · Guillaume Hoarau' },
    { h: '20H45', n: 'Ligue 1 <em>en direct</em>', p: 'Xavier Domergue · Benoît Cheyrou', live: true },
    { h: '22H35', n: 'Le débrief', p: 'Guillaume Hoarau' },
  ] },
  { jour: 'Samedi', progs: [
    { h: '14H30', n: 'Avant multiplex Ligue 3', p: 'Timothée Maymon · Jérémy Clément' },
    { h: '14H45', n: 'Multiplex Ligue 3 <em>8 matchs</em>', p: 'Timothée Maymon · Jérémy Clément', live: true },
    { h: '16H55', n: 'Débrief avant-match', p: 'Timothée Maymon · Jérémy Clément' },
    { h: '17H15', n: '90+1 <em>en direct</em>', p: 'Lesly Boitrelle · Smaïl Bouabdellah', live: true },
    { h: '19H10', n: 'Émission <em>en direct</em>', p: 'Marina Lorenzo' },
    { h: '20H45', n: 'Multiplex Ligue 1 <em>4 matchs</em>', p: 'Félix Rouah · Pierre Bouby', live: true },
    { h: '22H35', n: '90+1', p: 'Marina Lorenzo' },
  ] },
  { jour: 'Dimanche', progs: [
    { h: '14H30', n: 'Avant match', p: 'Lesly Boitrelle · Smaïl Bouabdellah' },
    { h: '15H00', n: 'Ligue 1 <em>en direct</em>', p: '', live: true },
    { h: '16H55', n: 'Débrief avant-match', p: 'Thibault Le Rol' },
    { h: '17H15', n: 'Ligue 1 <em>en direct</em>', p: 'Sébastien Dupuis', live: true },
    { h: '19H10', n: 'Le Club 1<sup>re</sup> partie', p: 'En clair · Thibault Le Rol · Adil Rami' },
    { h: '20H45', n: 'Ligue 1 <em>en direct</em>', p: 'Xavier Domergue · Benoît Cheyrou', live: true },
    { h: '22H35', n: 'Le Club 2<sup>e</sup> partie', p: 'En clair · Thibault Le Rol · Adil Rami' },
  ] },
];

const EXPERTS = [
  ['Thibault Le Rol', 'THIBAULT_LE_ROL'], ['Marina Lorenzo', 'MARINA_LORENZO'], ['Benoît Cheyrou', 'BENOIT_CHEYROU'],
  ['Lesly Boitrelle', 'LESLY_BOITRELLE'], ['Xavier Domergue', 'XAVIER_DOMERGUE'], ['Sébastien Dupuis', 'SEBASTIEN_DUPUIS'],
  ['Smaïl Bouabdellah', 'SMAIL_BOUABDELLAH'], ['Adil Rami', 'ADIL_RAMI'], ['Guillaume Hoarau', 'GUILLAUME_HOARAU'],
  ['Swann Borsellino', 'SWANN_BORSELLINO'], ['Hamza Rahmani', 'HAMZA_RAHMANI'], ['Johan Micoud', 'JOHAN_MICOUD'],
  ['Pierre Bouby', 'PIERRE_BOUBY'], ['Benjamin Nivet', 'BENJAMIN_NIVET'], ['Félix Rouah', 'FELIX_ROUAH'],
  ['Anne-Sophie Hamel', 'ANNE_SOPHIE_HAMEL'], ['Clément Grenier', 'CLEMENT_GRENIER'], ['Philippe Mexès', 'PHILIPPE_MEXES'],
  ['Abou Diaby', 'ABOU_DIABY'],
].map(([nom, f]) => ({ nom, src: `${IMG_DIR}experts/${f}.webp` }));

// Clubs des grandes affiches : couleur de fond et blason.
const CLUBS = {
  PSG: { nom: 'PSG', fond: '#1B2A5E', blason: 'featured-matches/PSG.webp' },
  OM: { nom: 'OM', fond: '#EDEDEA', blason: 'featured-matches/OM.webp', clair: true },
  OL: { nom: 'OL', fond: '#1A3A8A', blason: 'featured-matches/OL.webp' },
  LOSC: { nom: 'LOSC', fond: '#C8101A', blason: 'featured-matches/LOSC.webp' },
  LENS: { nom: 'RC Lens', fond: '#FFCB05', blason: 'featured-matches/LENS.webp', clair: true },
};
const AFFICHES = [['OM', 'PSG'], ['PSG', 'OL'], ['OL', 'OM'], ['LENS', 'PSG'], ['LOSC', 'PSG']];

const OPERATEURS = [
  { nom: 'Orange', couleur: '#FF7900', logo: 'partnerships/ORANGE.webp', chaine: 53 },
  { nom: 'Bouygues Telecom', couleur: '#00A9E0', logo: 'partnerships/BOUYGUES.webp', chaine: 57 },
  { nom: 'SFR', couleur: '#E2001A', logo: 'partnerships/SFR.webp', chaine: 118 },
  { nom: 'Free', couleur: '#E3262F', logo: 'partnerships/FREE.webp', chaine: 37 },
];

// Plateformes et magasins d'applications où l'on retrouve Ligue 1+.
const DIFFUSEURS = [
  'partnerships/PRIME.webp', 'partnerships/DAZN.webp', 'partnerships/MOLOTOV.webp', 'partnerships/LEQUIPE.webp',
  'partnerships/ONEFOOTBALL.webp', 'partnerships/CARREFOUR.webp', 'stores/APP_STORE.webp', 'stores/GOOGLE_PLAY.webp',
  'stores/APPLE_TV.webp', 'stores/ANDROID_TV.webp', 'stores/SAMSUNG_TV.webp',
];

const PASS = [
  { nom: 'Pass -26 ans', prix: '11,99€', ecrans: '1 écran', eng: 'Sans engagement' },
  { nom: 'Pass Ligue 1', prix: '19,99€', ecrans: '2 écrans', eng: 'Engagement 12 mois' },
  { nom: 'Pass mensuel', prix: '24,99€', ecrans: '2 écrans', eng: 'Sans engagement' },
  { nom: 'Pass Mobile', prix: '19,99€', ecrans: '1 écran', eng: 'Sans engagement' },
  { nom: 'Pass Direct 1 an', prix: '199€', ecrans: '2 écrans', eng: 'Engagement 12 mois', promo: '-40€' },
];
