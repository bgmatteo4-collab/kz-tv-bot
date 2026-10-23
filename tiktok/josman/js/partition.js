// La voix off et son minutage. « dit » est le texte tel qu'il sera prononcé (nombres en toutes
// lettres). Tant que la voix de Kayzx n'est pas enregistrée, chaque durée est estimée à un débit
// posé (0,072 s par lettre, 0,24 s par pause interne) ; medias/voix.json la remplacera, et tout le
// film (titres, objets, compteurs) se recalera seul. Ne jamais écrire d'instant en dur ailleurs.

export const LIGNES = [
  { id: 'a1', dit: 'Du Dom Pérignon,' },
  { id: 'a2', dit: 'Tulum, au Mexique,' },
  { id: 'a3', dit: 'et près de deux virgule huit millions de dollars de billets vendus en une seule soirée.' },
  { id: 'a4', dit: 'Pourtant, il y a quelques années, Josman dormait parfois dehors.', avant: 0.55 },
  // Qui il est : une étape de la frise par phrase (b3 en porte deux).
  { id: 'b1', dit: 'José Nzengo, né en mille neuf cent quatre-vingt-douze à Vierzon.', avant: 0.9 },
  { id: 'b2', dit: 'Il commence seul, dans sa chambre, sur ses propres instrus.' },
  { id: 'b3', dit: "Après le bac, il monte à Aubervilliers. Et en deux mille treize, il gagne le concours d'impro End of the Weak." },
  // Ce qu'il a accompli : la frise accélère.
  { id: 'c1', dit: 'Puis tout s\'accélère : « Dans le vide », dix-huit millions de vues.', avant: 0.5 },
  { id: 'c2', dit: 'J.O.$, disque de platine.' },
  { id: 'c3', dit: 'Deux titres diamant.' },
  { id: 'c4', dit: 'Un Accor Arena complet.' },
  { id: 'c5', dit: 'Et plus de deux milliards de streams.' },
  // Le train de vie.
  { id: 'd1', dit: "Et ça se voit jusque dans ses titres. En deux mille quinze, sa mixtape s'appelait Échecs positifs.", avant: 0.7 },
  { id: 'd2', dit: "Aujourd'hui : DOM PERIGNON CRYING." },
  { id: 'd3', dit: "Il est devenu propriétaire. Et le dix avril, trente-neuf mille neuf cent soixante-quatre personnes sont venues le voir, dans la plus grande salle d'Europe." },
  // La nuance.
  { id: 'e1', dit: "Mais il refuse d'appeler ça une revanche : pour lui, c'est réparer les inégalités qu'ont vécues ses parents.", avant: 0.6 },
  { id: 'e2', dit: 'Même son album le dit : du champagne… qui pleure.' },
  // Fin.
  { id: 'f1', dit: 'Tu veux la version complète, avec tout son parcours ? Dis-le en commentaire, je la fais sur YouTube.', avant: 0.8 },
];

const DEBUT = 0.45, PAUSE = 0.3, QUEUE = 1.4;
const lettres = (s) => (s.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
export function estimer(dit) {
  const pauses = (dit.replace(/[.?!…,]\s*$/, '').match(/[,:;…]|[.?!](?=\s)/g) || []).length;
  return 0.072 * lettres(dit) + 0.24 * pauses;
}

export function calculer(durees = {}, mots = {}) {
  const L = LIGNES.map((l) => ({ ...l }));
  let t = DEBUT;
  for (const [i, l] of L.entries()) {
    if (i) t += l.avant ?? PAUSE;
    l.debut = +t.toFixed(3);
    l.duree = durees[l.id] ?? estimer(l.dit);
    l.fin = +(l.debut + l.duree).toFixed(3);
    t = l.fin;
  }
  const parId = Object.fromEntries(L.map((l) => [l.id, l]));
  // Instant où un mot est prononcé : mesuré sur la voix si possible, sinon au prorata des lettres.
  function mot(id, m, k = 1) {
    const l = parId[id];
    const bas = l.dit.toLowerCase(), cible = m.toLowerCase();
    let i = -1;
    for (let n = 0; n < k; n++) { i = bas.indexOf(cible, i + 1); if (i < 0) throw new Error(`« ${m} » absent de ${id}`); }
    const ecrits = [...l.dit.matchAll(/\S+/g)].filter((j) => /[A-Za-zÀ-ÿ0-9]/.test(j[0]));
    if (mots[id]?.length === ecrits.length) return +(l.debut + mots[id][ecrits.findIndex((j) => j.index + j[0].length > i)]).toFixed(3);
    return +(l.debut + l.duree * (lettres(l.dit.slice(0, i)) / (lettres(l.dit) || 1))).toFixed(3);
  }
  return { lignes: L, ligne: (id) => parId[id], mot, duree: +(t + QUEUE).toFixed(3) };
}
