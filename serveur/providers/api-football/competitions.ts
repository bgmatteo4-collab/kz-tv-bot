/**
 * Les compétitions suivies : Big 5 européennes et coupes européennes.
 *
 * Les identifiants sont ceux d'API-Football. Ils vivent dans une donnée et pas
 * dans du code : en corriger un ou en ajouter un ne doit jamais demander de
 * toucher au provider. Le nom sert de contrôle — l'API renvoie le sien, et une
 * divergence se voit immédiatement dans le journal.
 */
export interface Competition {
  identifiant: number;
  nom: string;
}

export const COMPETITIONS: readonly Competition[] = [
  { identifiant: 61, nom: 'Ligue 1' },
  { identifiant: 39, nom: 'Premier League' },
  { identifiant: 140, nom: 'La Liga' },
  { identifiant: 135, nom: 'Serie A' },
  { identifiant: 78, nom: 'Bundesliga' },
  { identifiant: 2, nom: 'UEFA Champions League' },
  { identifiant: 3, nom: 'UEFA Europa League' },
  { identifiant: 848, nom: 'UEFA Europa Conference League' },
];

export function nomDeCompetition(identifiant: number): string | null {
  return COMPETITIONS.find((c) => c.identifiant === identifiant)?.nom ?? null;
}
