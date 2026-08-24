import type { EtatMatch, InfoProvider } from '../../partage/contrats/etat.js';

/** Couleurs de repli, prises dans la palette du design system. */
const COULEUR_DOMICILE = '#F2F6F9';
const COULEUR_EXTERIEUR = '#8DA0B0';

export function nouvelIdentifiantMatch(maintenantMs: number): string {
  return `match-${maintenantMs.toString(36)}`;
}

export function etatInitial(
  maintenantMs: number,
  provider: InfoProvider,
  decalageVideoSecondes = 0,
): EtatMatch {
  return {
    identifiantMatch: nouvelIdentifiantMatch(maintenantMs),
    competition: '',
    domicile: { nom: 'Domicile', abrege: 'DOM', couleur: COULEUR_DOMICILE, score: 0 },
    exterieur: { nom: 'Extérieur', abrege: 'EXT', couleur: COULEUR_EXTERIEUR, score: 0 },
    statut: 'avant-match',
    chrono: {
      ecouleMs: 0,
      referenceMs: maintenantMs,
      enMarche: false,
      tempsAdditionnel: 0,
    },
    decalageVideoSecondes,
    // La caméra par défaut : au démarrage, le centre est transparent et le
    // cadre est déjà juste. Rien n'oblige le streamer à cliquer avant d'être
    // présentable.
    scene: 'camera',
    coupDEnvoiMs: null,
    verrous: [],
    provider,
    configuration: { cleApiConfiguree: false, requetesRestantes: null },
    derniereDonneeMs: null,
  };
}
