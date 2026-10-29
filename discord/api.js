/**
 * Le strict nécessaire pour parler à Discord, sans bibliothèque.
 *
 * Deux façons de s'authentifier, détectées toutes seules :
 *  - DISCORD_TOKEN dans .env  → on envoie l'en-tête nous-mêmes (cas normal, sur un vrai poste) ;
 *  - rien du tout             → un intermédiaire réseau l'injecte (cas de l'environnement Claude,
 *                               où le token est enregistré en secret et jamais lu par le script).
 */
const BASE = 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_TOKEN;

let dernierAppel = 0;

/** Discord limite le rythme des écritures : on s'espace, et on respecte ses demandes d'attente. */
async function souffler(ms) { return new Promise((r) => setTimeout(r, ms)); }

export async function api(methode, chemin, corps, raison) {
  const attente = 260 - (Date.now() - dernierAppel);
  if (attente > 0) await souffler(attente);

  for (let essai = 0; essai < 5; essai += 1) {
    dernierAppel = Date.now();
    const r = await fetch(BASE + chemin, {
      method: methode,
      headers: {
        'Content-Type': 'application/json',
        ...(TOKEN ? { Authorization: `Bot ${TOKEN}` } : {}),
        ...(raison ? { 'X-Audit-Log-Reason': encodeURIComponent(raison) } : {}),
      },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });

    if (r.status === 429) {
      const d = await r.json().catch(() => ({ retry_after: 2 }));
      await souffler(Math.ceil((d.retry_after ?? 2) * 1000) + 200);
      continue;
    }
    if (r.status === 204) return null;
    const texte = await r.text();
    const donnees = texte ? JSON.parse(texte) : null;
    if (!r.ok) {
      const e = new Error(`${methode} ${chemin} → ${r.status} ${donnees?.message ?? ''}`);
      e.statut = r.status;
      e.detail = donnees;
      throw e;
    }
    return donnees;
  }
  throw new Error(`${methode} ${chemin} : Discord limite le rythme, abandon après 5 essais.`);
}

/** Les permissions Discord, par leur nom. Ce sont des drapeaux binaires, d'où les BigInt. */
export const D = {
  voir:            1n << 10n,  // ViewChannel
  lireHistorique:  1n << 16n,
  ecrire:          1n << 11n,
  reagir:          1n << 6n,
  joindreFichiers: 1n << 15n,
  liensEnrichis:   1n << 14n,
  emojisExternes:  1n << 18n,
  seConnecter:     1n << 20n,
  parler:          1n << 21n,
  partagerEcran:   1n << 9n,
  demanderParole:  1n << 32n,
  creerFils:       1n << 35n,
  ecrireDansFils:  1n << 38n,
  gererMessages:   1n << 13n,
  gererFils:       1n << 34n,
  gererSalons:     1n << 4n,
  gererRoles:      1n << 28n,
  gererPseudos:    1n << 27n,
  rendreMuet:      1n << 22n,
  deplacer:        1n << 24n,
  expulser:        1n << 1n,
  bannir:          1n << 2n,
  exclureTemp:     1n << 40n,
  voirJournal:     1n << 7n,
  mentionnerTous:  1n << 17n,
  administrateur:  1n << 3n,
};

export const combiner = (...bits) => bits.reduce((a, b) => a | b, 0n);

/** Les types de salon, côté Discord. */
export const TYPE = { texte: 0, vocal: 2, categorie: 4, annonce: 5, conference: 13 };
