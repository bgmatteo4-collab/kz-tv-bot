// La voix off (Rémy, Microsoft, generer-voix.py) et son minutage. « dit » est le texte prononcé.
// medias/voix.json donne la durée de chaque phrase et l'instant de chaque mot ; sans lui, durées
// estimées. Tout le film se cale sur ces repères : ne jamais écrire d'instant en dur ailleurs.

export const LIGNES = [
  { id: 's1', dit: "Il reste moins d'un mois avant GTA 6. Et pourtant, des fans ont déjà reconstruit toute la carte." },
  { id: 's2', dit: "Voilà ce qu'on sait vraiment.", avant: 0.25, apres: 0.7 },
  { id: 's3', dit: "Rockstar l'a confirmé : Leonida, c'est deux fois la carte de GTA 5. La plus grande qu'ils aient jamais faite.", avant: 0.6, apres: 2.5 },
  { id: 's4', dit: 'Six régions : Vice City, les Leonida Keys, Grassrivers, Port Gellhorn, Ambrosia, et le mont Kalaga.', avant: 0.5, apres: 2.2 },
  { id: 's5', dit: 'Vice City, c\'est Miami. Et les fans ont retrouvé les vrais bâtiments, un par un.', avant: 0.6, apres: 1.6 },
  { id: 's6', dit: "L'Ocean View Hotel ? C'est le Clevelander, sur Ocean Drive.", avant: 0.4, apres: 3.0 },
  { id: 's7', dit: 'La Palaestra Tower ? La Carnival Tower de Miami.', avant: 0.5, apres: 2.6 },
  { id: 's7b', dit: 'Le club The Vault ? Le Club Space, à Downtown.', avant: 0.4, apres: 2.6 },
  { id: 's8', dit: 'Et sous l\'eau des Keys, une station copiée sur Aquarius, la seule base de recherche sous-marine encore en service au monde.', avant: 0.5, apres: 3.0 },
  { id: 's9', dit: "Au total, plus de trois mille trois cents lieux repérés, image par image.", avant: 0.6, apres: 2.6 },
  { id: 's10', dit: 'Et puis, il y a les fuites. En 2022, plus de quatre-vingt-dix vidéos de développement volées.', avant: 0.6, apres: 2.2 },
  { id: 's11', dit: 'Et cet été, une carte de travail jamais confirmée, avec des comtés comme Vice-Dale : le Miami-Dade du jeu.', avant: 0.4, apres: 2.4 },
  { id: 's12', dit: 'La vraie réponse, ce sera le 19 novembre. Et toi, tu vas où en premier ?', avant: 0.6 },
];

const DEBUT = 0.35, PAUSE = 0.3, QUEUE = 2.6;
const lettres = (s) => (s.match(/[A-Za-zÀ-ÿ0-9]/g) || []).length;
export const estimer = (dit) => 0.062 * lettres(dit) + 0.2 * (dit.match(/[,:;…?]/g) || []).length;

export function calculer(durees = {}, mots = {}) {
  const L = LIGNES.map((l) => ({ ...l }));
  let t = DEBUT;
  for (const [i, l] of L.entries()) {
    if (i) t += l.avant ?? PAUSE;
    l.debut = +t.toFixed(3);
    l.duree = durees[l.id] ?? estimer(l.dit);
    l.fin = +(l.debut + l.duree).toFixed(3);
    t = l.fin + (l.apres || 0);
  }
  const parId = Object.fromEntries(L.map((l) => [l.id, l]));
  // Instant où un mot est prononcé : mots[id] = [[mot, secondes], …] mesurés sur la voix.
  function mot(id, m, k = 1) {
    const l = parId[id], cible = m.toLowerCase();
    const liste = mots[id];
    if (liste) {
      let n = 0;
      for (const [w, s] of liste) if (w.toLowerCase().replace(/[^a-zà-ÿ0-9'-]/g, '').startsWith(cible.split(' ')[0].replace(/[^a-zà-ÿ0-9'-]/g, '')) && ++n === k) return +(l.debut + s).toFixed(3);
    }
    const bas = l.dit.toLowerCase();
    let i = -1;
    for (let n = 0; n < k; n++) { i = bas.indexOf(cible, i + 1); if (i < 0) throw new Error(`« ${m} » absent de ${id}`); }
    return +(l.debut + l.duree * (lettres(l.dit.slice(0, i)) / (lettres(l.dit) || 1))).toFixed(3);
  }
  return { lignes: L, ligne: (id) => parId[id], mot, duree: +(t + QUEUE).toFixed(3) };
}
