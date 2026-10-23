// Parties 2 et 3 : « qui il est » puis « ce qu'il a accompli ». Une frise horizontale : la caméra
// glisse d'une étape à l'autre quand la voix y arrive (travelling), chaque étape porte un objet
// crédible ; la ligne se dessine derrière la caméra. Pour finir, la frise entière en dézoom sous
// le compteur des streams.
import { clamp, lerp, prog, tw, E, ressort, style, vis, el, $ } from './outils.js';

const PAS = 1080, Y_LIGNE = 1330;

// Chaque étape : où la caméra se pose (quand), ce qui est écrit, et l'objet.
function etapes(T) {
  const m = T.mot, L = (id) => T.ligne(id);
  return [
    { quand: L('b1').debut, sur: 'Né à Vierzon · Cher', annee: '1992', objet: 'etat', duree: 1.0 },
    { quand: L('b2').debut, sur: 'Seul, dans sa chambre', annee: '2007', objet: 'sequenceur', duree: 1.0 },
    { quand: L('b3').debut, sur: 'Studios et open mics', annee: 'Après le bac', objet: 'plaque', duree: 1.0 },
    { quand: m('b3', 'deux mille'), sur: 'Concours d’impro', annee: '2013', objet: 'vainqueur', duree: 0.9 },
    { quand: m('c1', 'dans le vide'), sur: '« Dans le vide »', annee: '2016', objet: 'lecteur', duree: 0.7 },
    { quand: L('c2').debut, sur: 'Premier album · J.O.$', annee: '2018', objet: 'platine', duree: 0.6 },
    { quand: L('c3').debut, sur: 'Deux titres certifiés', annee: 'Diamant', objet: 'diamants', duree: 0.6 },
    { quand: L('c4').debut, sur: 'Premier Accor Arena', annee: '2024', objet: 'bercy', duree: 0.6 },
  ];
}

const disque = (cls, titre, sous, pochette) => `<div class="disque ${cls}"><div class="d-cadre"><div class="d-vinyle"><div class="d-rond">${pochette ? `<img src="${pochette}" alt="">` : ''}</div></div><div class="d-plaque"><b>${titre}</b><span>${sous}</span></div></div></div>`;

const OBJETS = {
  etat: () => `<div class="fiche"><div class="f-haut">ÉTAT CIVIL · EXTRAIT</div><div class="f-nom">NZENGO</div><div class="f-prenom">José</div>
    <div class="f-champs"><span>Né le</span><b>28.10.1992</b><span>À</span><b>Vierzon (Cher)</b><span>Origines</span><b>RD Congo · Angola</b></div><div class="f-sceau">J</div></div>`,
  sequenceur: () => `<div class="seq"><div class="s-haut"><span>● instru_01</span><span>140 BPM</span></div><div class="s-grille">${
    Array.from({ length: 64 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div><div class="s-bas">SKYBLOG · « JOSS MAN »</div></div>`,
  plaque: () => `<div class="plaque"><div class="p-ville">AUBERVILLIERS</div><div class="p-dep">SEINE-SAINT-DENIS · 93</div></div>`,
  vainqueur: () => `<div class="vainqueur"><div class="v-medaille"><span>1<sup>er</sup></span></div><div class="v-texte"><div class="v-sur">VAINQUEUR</div><div class="v-nom">END OF<br>THE WEAK</div><div class="v-bas">CONCOURS D’IMPROVISATION</div></div></div>`,
  lecteur: () => `<div class="lecteur"><div class="l-image"><img src="medias/pochettes/matrix.jpg" alt=""><div class="l-play"></div></div><div class="l-barre"><i></i></div>
    <div class="l-titre">Josman — Dans le vide</div><div class="l-vues"><b class="l-n">0</b> vues</div></div>`,
  platine: () => `<div class="duo">${disque('platine', 'J.O.$', 'ALBUM · PLATINE', 'medias/pochettes/j-o.jpg')}</div>`,
  diamants: () => `<div class="duo">${disque('diamant', 'J’AIME BIEN !', 'TITRE · DIAMANT')}${disque('diamant', 'INTRO', 'TITRE · DIAMANT', 'medias/pochettes/m-a-n-black-roses-lost-feelings.jpg')}</div>`,
  bercy: () => `<div class="billet2"><div class="b2-sur">ACCOR ARENA · PARIS</div><div class="b2-date">24.02.2024</div><div class="b2-tampon">COMPLET</div></div>`,
};

export function creerFrise(T) {
  const E_ = etapes(T);
  const racine = el('div', '', undefined, $('frise'));
  racine.id = 'bande';
  const ligne = el('div', 'fr-ligne', undefined, racine);
  const pleine = el('div', 'fr-pleine', undefined, ligne);
  const stops = E_.map((e, i) => {
    const x = i * PAS;
    const pt = el('div', 'fr-point', undefined, racine);
    style(pt, 'left', `${x + 540 - 9}px`);
    const etq = el('div', 'fr-etiq', e.annee, racine);
    style(etq, 'left', `${x + 540}px`);
    const texte = el('div', 'fr-texte', `<div class="t-sur">${e.sur}</div><div class="fr-annee${/\d{4}/.test(e.annee) ? '' : ' mot'}">${e.annee}</div>`, racine);
    const obj = el('div', 'fr-objet', OBJETS[e.objet](), racine);
    return { ...e, i, x, pt, texte, obj, n: obj.querySelector('.l-n'), pads: [...obj.querySelectorAll('.s-grille i')], barre: obj.querySelector('.l-barre i') };
  });
  style(ligne, 'width', `${(stops.length - 1) * PAS}px`);

  // Caméra : position (en étapes, fractionnaire) à l'instant t.
  function position(t) {
    let p = 0;
    for (let i = 1; i < stops.length; i++) {
      const s = stops[i];
      p += E.traversee(prog(t, s.quand - s.duree - 0.05, s.duree));
    }
    return p;
  }

  const c5 = T.ligne('c5');
  const dezoom = { t0: T.mot('c5', 'milliards') - 0.2, d: 1.6 };

  return {
    debut: stops[0].quand - 0.9,
    stops,
    dessiner(t) {
      const a = tw(t, stops[0].quand - 0.9, 0.7);
      vis($('frise'), a);
      if (a <= 0) return;
      const p = position(t);
      const z = E.traversee(prog(t, dezoom.t0, dezoom.d));
      // Dézoom : tout le parcours tient dans l'écran, sous le compteur.
      const centre = lerp(p * PAS, ((stops.length - 1) * PAS) / 2, z);
      const s = lerp(1, 0.125, z);
      // Le centre d'une étape est à x + 540 dans la bande ; il doit tomber au milieu de l'écran.
      style(racine, 'transform', `translate3d(${(540 - (centre + 540) * s).toFixed(1)}px,${lerp(0, -170, z).toFixed(1)}px,0) scale(${s.toFixed(4)})`);
      style(racine, 'transform-origin', `0 ${Y_LIGNE}px`);
      style(pleine, 'transform', `scaleX(${(p / (stops.length - 1)).toFixed(4)})`);
      for (const st of stops) {
        const d = (st.i - p) * (1 - z);                  // distance à la caméra (s'annule au dézoom)
        const ici = 1 - clamp(Math.abs(d) * 1.6);         // 1 quand la caméra est posée sur l'étape
        const arrive = tw(t, st.quand - 0.35, 0.8);
        // Parallaxe : le texte glisse plus vite que l'objet, l'objet monte en se posant.
        const focus = lerp(Math.max(0.12, ici), 1, z);
        style(st.texte, 'transform', `translate3d(${(st.x + 96 + d * 260).toFixed(1)}px,${(26 * (1 - arrive)).toFixed(1)}px,0)`);
        vis(st.texte, focus * (z > 0 ? 1 - z * 0.6 : arrive));
        style(st.obj, 'transform', `translate3d(${(st.x + 540 + d * 90).toFixed(1)}px,${(950 + 60 * (1 - arrive)).toFixed(1)}px,0) scale(${(0.96 + 0.04 * arrive + 0.02 * E.doux(prog(t, st.quand, 3))).toFixed(4)})`);
        vis(st.obj, (z > 0 ? 1 : arrive) * lerp(Math.max(0.2, ici), 1, z));
        st.pt.classList.toggle('allume', p >= st.i - 0.02);
        // Animations propres à l'objet.
        if (st.objet === 'sequenceur') {
          const pas16 = Math.floor((t - st.quand) * 140 / 60 * 4);
          st.pads.forEach((pad, k) => {
            const col = k % 16, rang = Math.floor(k / 16);
            const actif = [[0, 4, 8, 12], [4, 12], [2, 6, 10, 11, 14], [0, 3, 7, 10]][rang].includes(col);
            pad.className = actif ? (col === ((pas16 % 16) + 16) % 16 && t > st.quand ? 'on joue' : 'on') : col === ((pas16 % 16) + 16) % 16 && t > st.quand ? 'tete' : '';
          });
        }
        if (st.n) {
          const q = E.sortie(prog(t, st.quand + 0.1, 1.6));
          st.n.textContent = Math.round(18000000 * q).toLocaleString('fr-FR').replace(/\s/g, ' ');
          style(st.barre, 'transform', `scaleX(${(0.05 + 0.95 * q).toFixed(3)})`);
        }
      }
    },
    dezoom,
    fin: c5.fin,
  };
}
