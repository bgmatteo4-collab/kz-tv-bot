// La caméra de tout le film : une seule prise, jamais de coupe. Chaque chapitre a sa vue ;
// entre deux chapitres, un vol « zoom fluide » (van Wijk) pendant la respiration de la voix.
// L'accroche garde son propre trajet (Miami → Los Santos → Vice City), le chapitre « monde »
// enchaîne New York, Los Angeles et Paris, et la fin replonge sur l'enseigne pour boucler.
import { E, lerp, prog, clamp } from './outils.js';
import { vue, vol, trajet, LIEUX, RAD } from './carte.js';

const deg = (d) => d * RAD;

// Vues de référence.
export const VUES = {
  // Accroche
  enseigne: vue(...LIEUX.miami, 1.2, 0),               // à la verticale de l'enseigne, comme la photo
  californie: vue(-112.5, 33.3, 26, deg(38)),         // retour en arrière : la Californie
  losSantos: vue(-111.0, 33.5, 22, deg(40)),          // on se pose sur Los Santos
  floride: vue(-80.55, 26.15, 6, deg(44)),            // arrivée sur la Floride
  plongee: vue(-80.19, 25.8, 1.9, deg(54)),           // plongée sur Miami
  // Les 7 coups
  miami: vue(-80.168, 25.758, 0.36, deg(44)),         // les 7 épingles d'un coup d'œil
  pubs: vue(...LIEUX.wynwood, 0.085, deg(52)),
  dirigeable: vue(...LIEUX.baie, 0.16, deg(58)),      // plus large et plus incliné : le ciel
  enseigne2: vue(...LIEUX.miami, 0.07, deg(50)),
  relance: vue(-80.2, 25.775, 0.55, deg(30)),         // on recule : la ville entière
  voitures: vue(...LIEUX.keyBiscayne, 0.09, deg(52)),
  plage: vue(...LIEUX.southBeach, 0.08, deg(52)),
  fresques: vue(LIEUX.wynwood[0] - 0.002, LIEUX.wynwood[1], 0.06, deg(54)),
  // Le monde
  newYork: vue(...LIEUX.brooklyn, 3.2, deg(42)),
  hollywood: vue(...LIEUX.hollywood, 3.2, deg(42)),
  paris: vue(...LIEUX.bagnolet, 3.2, deg(42)),
  heat: vue(...LIEUX.miami, 0.075, deg(48)),
  fin: vue(...LIEUX.miami, 0.22, deg(36)),
};

// Repères de l'accroche (mesurés sur la voix : voir partition.js et DESIGN.md).
export const ACCROCHE = { recul: 3.45, reculFin: 4.6, losSantos: 4.3, route: 5.3, routeD: 1.75, arrivee: 7.05, cartes: 8.92 };
export const ROUTE_ACCROCHE = trajet(LIEUX.losAngeles, LIEUX.miami, 0.2);
export const routeAccroche = (t) => E.doux(prog(t, ACCROCHE.route, ACCROCHE.routeD));

// Une tenue de plan n'est jamais figée : la caméra continue d'avancer très doucement.
const derive = (v, p, { zoom = 0.07, dx = 0, dy = 0 } = {}) => ({ ...v, w: v.w * (1 - zoom * p), x: v.x + dx * v.w * p, y: v.y + dy * v.w * p });

export function creerCamera(T) {
  const C = T.chap;
  const A = ACCROCHE;
  const reculer = vol(VUES.enseigne, VUES.californie), deriver = vol(VUES.californie, VUES.losSantos);
  const approcher = vol(VUES.losSantos, VUES.floride), plonger = vol(VUES.floride, VUES.plongee);

  // Séquence après l'accroche : [vue du chapitre, début du vol qui y mène, durée du vol].
  // Le vol part juste après la dernière phrase du chapitre précédent et se pose 0,3 s après
  // le début de la première phrase du chapitre.
  const ordre = ['promesse', 'pubs', 'dirigeable', 'enseigne', 'relance', 'voitures', 'plage', 'fresques'];
  const vueDe = { promesse: VUES.miami, pubs: VUES.pubs, dirigeable: VUES.dirigeable, enseigne: VUES.enseigne2, relance: VUES.relance, voitures: VUES.voitures, plage: VUES.plage, fresques: VUES.fresques };
  // Chaque vol part de la vue où la tenue précédente s'est arrêtée (dérive comprise) : pas de saut.
  const zoomDe = (id) => (id === 'relance' ? -0.05 : 0.08);
  const etapes = [];
  let avant = VUES.plongee;
  for (const id of ordre) {
    const c = C[id], t0 = c.precedent + 0.06, t1 = c.debut + (id === 'promesse' ? 0.9 : 0.32);
    etapes.push({ id, t0, t1, de: avant, a: vueDe[id], v: vol(avant, vueDe[id]), finTenue: C[id].suivant });
    avant = derive(vueDe[id], 1, { zoom: zoomDe(id) });
  }

  // Le monde : New York, Los Angeles, Paris au moment où la voix les nomme.
  const tNY = T.mot('m1', 'New York'), tLA = T.mot('m1', 'Los Angeles'), tPA = T.mot('m1', 'Paris');
  const m = C.monde;
  // Dérive des escales : 12 % sur une tenue d'au moins 0,6 s, moins sur les escales éclair
  // (New York, Los Angeles : 0,1 s), pour ne pas « pomper ».
  const h = C.heat, f = C.fin;
  const escales = [[m.precedent + 0.06, tNY + 0.15], [tNY + 0.25, tLA + 0.15], [tLA + 0.25, tPA + 0.2]];
  const finsMonde = [escales[1][0], escales[2][0], m.tenue + 0.08];
  const zoomMonde = escales.map(([, t1], i) => 0.12 * Math.min(1, (finsMonde[i] - t1) / 0.6));
  const arrets = [VUES.newYork, VUES.hollywood, VUES.paris];
  const departs = [avant, ...arrets.slice(0, 2).map((v, i) => derive(v, 1, { zoom: zoomMonde[i] }))];
  const monde = escales.map(([t0, t1], i) => ({ t0, t1, v: vol(departs[i], arrets[i]), zoom: zoomMonde[i] }));
  const retourMiami = { t0: m.tenue + 0.08, t1: h.debut + 0.32, v: vol(derive(VUES.paris, 1, { zoom: zoomMonde[2] }), VUES.heat) };
  const versFin = { t0: h.tenue + 0.06, t1: f.debut + 0.4, v: vol(derive(VUES.heat, 1, { zoom: 0.1 }), VUES.fin) };
  // Boucle : on replonge à la verticale de l'enseigne, la photo du début reprend tout l'écran.
  const boucle = { t0: T.ligne('o2').fin + 0.1, t1: T.duree - 0.55, v: vol(derive(VUES.fin, 1, { zoom: -0.04 }), VUES.enseigne) };

  function camera(t) {
    // --- Accroche
    if (t < A.recul) return VUES.enseigne;
    if (t < A.reculFin) return reculer(E.traversee(prog(t, A.recul, A.reculFin - A.recul)));
    if (t < A.route) return deriver(E.doux(prog(t, A.reculFin, A.route - A.reculFin)));
    if (t < A.arrivee) {
      const q = routeAccroche(t), c = approcher(q), [hx, hy] = ROUTE_ACCROCHE.point(q), w = Math.sin(Math.PI * q) * 0.45;
      return { ...c, x: lerp(c.x, hx, w), y: lerp(c.y, hy, w) };
    }
    if (t < etapes[0].t0) return plonger(E.sortie(prog(t, A.arrivee, 3.6)));
    // --- Les chapitres de Miami
    for (let i = 0; i < etapes.length; i++) {
      const e = etapes[i], suivante = etapes[i + 1];
      const fin = suivante ? suivante.t0 : monde[0].t0;
      if (t >= e.t0 && t < fin) {
        if (t < e.t1) return e.v(E.traversee(prog(t, e.t0, e.t1 - e.t0)));
        return derive(e.a, E.doux(prog(t, e.t1, fin - e.t1)), { zoom: zoomDe(e.id) });
      }
    }
    // --- Le monde
    for (let i = 0; i < monde.length; i++) {
      const e = monde[i], fin = i < monde.length - 1 ? monde[i + 1].t0 : retourMiami.t0;
      if (t >= e.t0 && t < fin) {
        if (t < e.t1) return e.v(E.traversee(prog(t, e.t0, e.t1 - e.t0)));
        return derive(arrets[i], E.doux(prog(t, e.t1, fin - e.t1)), { zoom: e.zoom });
      }
    }
    // --- Retour à Miami pour le dernier coup, puis la fin et la boucle
    if (t < versFin.t0) {
      if (t < retourMiami.t1) return retourMiami.v(E.traversee(prog(t, retourMiami.t0, retourMiami.t1 - retourMiami.t0)));
      return derive(VUES.heat, E.doux(prog(t, retourMiami.t1, versFin.t0 - retourMiami.t1)), { zoom: 0.1 });
    }
    if (t < boucle.t0) {
      if (t < versFin.t1) return versFin.v(E.traversee(prog(t, versFin.t0, versFin.t1 - versFin.t0)));
      return derive(VUES.fin, E.doux(prog(t, versFin.t1, boucle.t0 - versFin.t1)), { zoom: -0.04 });
    }
    return boucle.v(E.traversee(prog(t, boucle.t0, boucle.t1 - boucle.t0)));
  }

  // Les vols rapides demandent du flou de mouvement (3 sous-images).
  const vols = [
    [A.recul, A.reculFin + 0.15], [A.route, A.arrivee + 0.25],
    ...etapes.map((e) => [e.t0, e.t1 + 0.1]), ...monde.map((e) => [e.t0, e.t1 + 0.1]),
    [retourMiami.t0, retourMiami.t1 + 0.1], [versFin.t0, versFin.t1 + 0.1], [boucle.t0, boucle.t1 + 0.1],
  ];
  const enVol = (t) => vols.some(([a, b]) => t > a && t < b);
  return { camera, enVol, etapes, monde, retourMiami, versFin, boucle, vols };
}
