// Chapitre « promesse » — « Sept coups de génie. Le dernier est le plus fou. »
// La caméra recule au-dessus de Miami (carte détaillée), les 7 épingles tombent en cascade
// (dessinées par epingles.js) ; la 7e garde un « ? » : c'est la boucle ouverte du film.
import { apparitions } from '../epingles.js';

export default function creer(T) {
  const c = T.chap.promesse, m = (mot, k) => T.mot('p1', mot, k);
  const blocs = [
    { sortie: m('Le dernier') - 0.12, lignes: [[['7', m('Sept'), 'num'], ['coups', m('coups')]], [['de', m('de génie')], ['génie.', m('génie'), 'accent']]] },
    { sortie: c.fin + 0.35, lignes: [[['Le dernier', m('Le dernier')]], [['est le plus', m('est le plus')], ['fou.', m('fou'), 'accent']]] },
  ];
  function sons(add) {
    apparitions(T).forEach((t, i) => add(t, i === 6 ? 'ping' : 'tic', i === 6 ? 0.4 : 0.32));
    add(m('fou'), 'clic', 0.4);
  }
  return { id: 'promesse', blocs, sons, dessiner() {}, voile: () => 0, legendes: [] };
}
