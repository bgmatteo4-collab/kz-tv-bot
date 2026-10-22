// La voix off, ligne par ligne, et le minutage de tout le film.
//
// Chaque ligne a un texte « dit » (tel qu'envoyé à la synthèse vocale : sigles épelés, nombres
// en toutes lettres) et, si besoin, un temps de tenue « apres » : l'image continue (un gros
// plan, un chiffre qui s'arrête) avant que la phrase suivante ou le vol suivant ne commence. Les 6 lignes de l'accroche ont des créneaux fixes, mesurés sur la voix ElevenLabs
// « Sterling » (medias/voix-accroche.mp3, posée à 0,2 s) puis avancés pour a2 et a6, où la voix
// Piper « Tom » (generer-voix.py, ajustée à ces créneaux) met plus de temps à dire le mot clé. Les suivantes viennent de medias/voix.json quand la voix existe (un
// fichier par ligne, durée et instant de chaque mot mesurés) ; sinon leur durée est estimée
// avec le débit mesuré sur l'accroche (0,067 s par lettre, plus 0,2 s par pause interne).
// Tout le reste du film (titres, caméra, photos, bruitages) se cale sur ces repères : changer
// la voix recale le film entier sans rien retoucher à la main.

export const VOIX_ACCROCHE = { fichier: 'medias/voix-accroche.mp3', decalage: 0.2 };

export const LIGNES = [
  // Accroche (créneaux fixes : la caméra et les bruitages de l'accroche sont calés dessus)
  { id: 'a1', chap: 'accroche', dit: "Ça, ce n'est pas G.T.A. six.", debut: 0.2, fin: 2.05 },
  { id: 'a2', chap: 'accroche', dit: "C'est le vrai Miami.", debut: 2.25, fin: 3.3 },
  { id: 'a3', chap: 'accroche', dit: 'Après Los Santos,', debut: 4.06, fin: 5.09 },
  { id: 'a4', chap: 'accroche', dit: 'Rockstar nous ramène à Vice City.', debut: 5.3, fin: 7.09 },
  { id: 'a5', chap: 'accroche', dit: 'Et pour vendre le jeu…', debut: 7.57, fin: 8.64 },
  { id: 'a6', chap: 'accroche', dit: 'ils la construisent en vrai.', debut: 9.0, fin: 10.28 },
  // La suite (estimée tant que la voix définitive n'existe pas)
  { id: 'p1', chap: 'promesse', dit: 'Sept coups de génie. Le dernier est le plus fou.', apres: 0.2 },
  { id: 'c1', chap: 'pubs', dit: 'Un : les pubs des fausses marques du jeu, en pleine rue. Pas de nom, juste Vice City et un QR code.', apres: 0.75 },
  { id: 'c2', chap: 'dirigeable', dit: 'Deux : un dirigeable Vice City dans le ciel de Floride.' },
  { id: 'c3', chap: 'enseigne', dit: "Trois : cette enseigne, sur le toit de l'arène du Heat, visible depuis les avions. Près d'un million de dollars.", apres: 0.5 },
  { id: 'r1', chap: 'relance', dit: "Mais la ville n'est pas ravie : un élu dit qu'on fait passer Miami pour la capitale du meurtre." },
  { id: 'r2', chap: 'relance', dit: "Alors, sur l'espace public, jamais le mot G.T.A.", apres: 0.35 },
  { id: 'c4', chap: 'voitures', dit: 'Quatre : les voitures du jeu, en vrai, avec des plaques de Leonida.', apres: 0.35 },
  { id: 'c5', chap: 'plage', dit: "Cinq : chaises longues, parasols, et des avions-banderoles pour un club qui n'existe pas.", apres: 0.4 },
  { id: 'c6', chap: 'fresques', dit: "Six : dix fresques de vrais street-artistes, et le musée offert aux habitants jusqu'en deux mille vingt-huit.", apres: 0.4 },
  { id: 'm1', chap: 'monde', dit: "Et ça déborde : New York, Los Angeles… jusqu'aux portes de Paris.", apres: 0.35 },
  { id: 'c7', chap: 'heat', dit: 'Sept : le dix-huit novembre, le Miami Heat jouera sous le nom de Vice City. La veille de la sortie du jeu.', apres: 0.6 },
  { id: 'o1', chap: 'fin', dit: 'G.T.A. six sort le dix-neuf novembre.', apres: 0.15 },
  { id: 'o2', chap: 'fin', dit: 'Et toi, quelle ville Rockstar devrait transformer ensuite ?' },
];

// L'ordre des chapitres, et le numéro de chaque « coup » (pour l'onglet et les épingles).
export const CHAPITRES = ['accroche', 'promesse', 'pubs', 'dirigeable', 'enseigne', 'relance', 'voitures', 'plage', 'fresques', 'monde', 'heat', 'fin'];
export const NUMERO = { pubs: 1, dirigeable: 2, enseigne: 3, voitures: 4, plage: 5, fresques: 6, heat: 7 };

const PAUSE = 0.42;       // entre deux phrases d'un même chapitre
const TRANSITION = 0.78;  // entre deux chapitres : le temps d'un vol de caméra
const APRES_ACCROCHE = 0.55;
export const QUEUE = 2.6; // après la dernière phrase : retour sur l'image du début (boucle)

const lettres = (s) => (s.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
export function estimer(dit) {
  const pauses = (dit.replace(/[.?!…]\s*$/, '').match(/[,:;…]|[.?!](?=\s)/g) || []).length;
  return 0.067 * lettres(dit) + 0.2 * pauses;
}

// durees : { id: secondes } mesurées sur la voix définitive (medias/voix.json), sinon estimées.
// mots : { id: [secondes depuis le début de la ligne, une par mot écrit] }, si la voix les donne.
export function calculer(durees = {}, mots = {}) {
  const L = LIGNES.map((l) => ({ ...l }));
  let t = 0, avant = null;
  for (const l of L) {
    if (l.debut === undefined) {
      t += avant === 'accroche' ? APRES_ACCROCHE : l.chap === avant ? PAUSE : TRANSITION;
      l.debut = +t.toFixed(3);
      l.duree = durees[l.id] ?? estimer(l.dit);
      l.estimee = durees[l.id] === undefined;
      l.fin = +(l.debut + l.duree).toFixed(3);
    }
    t = l.fin + (l.apres || 0);
    avant = l.chap;
  }
  const parId = Object.fromEntries(L.map((l) => [l.id, l]));
  const duree = +(t + QUEUE).toFixed(3);

  // Fenêtre de chaque chapitre : de sa première phrase à la fin de sa dernière (fin), plus la
  // tenue éventuelle (tenue). Le vol vers le chapitre suivant part à la fin de la tenue.
  const chap = {};
  for (const l of L) {
    const c = (chap[l.chap] ||= { id: l.chap, debut: l.debut, fin: l.fin, lignes: [] });
    c.fin = l.fin;
    c.tenue = +(l.fin + (l.apres || 0)).toFixed(3);
    c.lignes.push(l.id);
  }
  CHAPITRES.forEach((id, i) => {
    const c = chap[id];
    c.precedent = i ? chap[CHAPITRES[i - 1]].tenue : 0;          // fin de la tenue précédente
    c.suivant = i < CHAPITRES.length - 1 ? chap[CHAPITRES[i + 1]].debut : duree;
  });

  // Instant où un mot est prononcé (k = n-ième occurrence) : mesuré sur la voix si possible,
  // sinon au prorata des lettres dans la ligne.
  function mot(id, m, k = 1) {
    const l = parId[id];
    if (!l) throw new Error(`ligne inconnue : ${id}`);
    const bas = l.dit.toLowerCase(), cible = m.toLowerCase();
    let i = -1;
    for (let n = 0; n < k; n++) { i = bas.indexOf(cible, i + 1); if (i < 0) throw new Error(`« ${m} » absent de ${id}`); }
    const ecrits = [...l.dit.matchAll(/\S+/g)].filter((j) => /[A-Za-zÀ-ÿ0-9]/.test(j[0]));
    if (mots[id]?.length === ecrits.length) {
      const w = ecrits.findIndex((j) => j.index + j[0].length > i);
      return +(l.debut + mots[id][w]).toFixed(3);
    }
    const total = lettres(l.dit) || 1;
    return +(l.debut + (l.fin - l.debut) * (lettres(l.dit.slice(0, i)) / total)).toFixed(3);
  }
  const quand = (id, f) => { const l = parId[id]; return +(l.debut + (l.fin - l.debut) * f).toFixed(3); };

  return { lignes: L, ligne: (id) => parId[id], chap, duree, mot, quand };
}
