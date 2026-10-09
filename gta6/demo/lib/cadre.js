// lib/cadre.js — le cadre d'analyse façon showreel (commun aux 6 actes).
//
//   ┌─  ● GTA VI — ANALYSE                                  04 / 06  ─┐
//
//   └─  ━━ LUMIÈRE · SOLEIL RASANT                  TC 00:01:10:24  ─┘
//
// Coins en équerre qui se tracent, marque en haut à gauche, numéro d'acte en haut à droite,
// étiquette de technique en bas à gauche (se « décode » quand elle change), timecode GLOBAL
// du film en bas à droite (début de l'acte + t, 60 i/s).
// Le cadre est invisible à t = 0 et à t = durée (contrat de raccord) : il se trace de
// entree à entree + 0,8 s et s'efface de durée − 1,1 s à durée − 0,3 s.
//
// API
//   const cadre = creerCadre(stage, {
//     acte: 4,                                   // numéro (le début global vient de core.ACTES)
//     techniques: [[0, 'Lumière · soleil rasant'], [6.4, 'Eau · sillage']],  // [t, texte] triés
//     compteurs: [[0, 'Analyse 01 / 06'], [6.4, 'Analyse 02 / 06']],         // facultatif (défaut « 04 / 06 »)
//     marque: 'GTA VI — Analyse', entree: 0.3, sortie: null (= durée − 1.1),
//   });
//   cadre.maj(t, { opacite: 1, clair: false })   // clair = traits encre sur image très claire

import { ACTES, E, tw, prog, scramble, typeOn, setText, timecode } from './core.js';

const NS = 'http://www.w3.org/2000/svg';
const BRAS = 36, BORD = 40; // longueur des équerres, distance au bord

export function creerCadre(stage, o = {}) {
  const acte = o.acte ?? 1;
  const A = ACTES[acte - 1] ?? { debut: 0, duree: 10 };
  const duree = o.duree ?? A.duree;
  const entree = o.entree ?? 0.3;
  const sortie = o.sortie ?? duree - 1.1;
  const techniques = o.techniques ?? [[0, '']];
  const compteurs = o.compteurs ?? [[0, `${String(acte).padStart(2, '0')} / 06`]];
  const marque = o.marque ?? 'GTA VI — Analyse';

  const el = document.createElement('div');
  el.className = 'cadre';
  el.innerHTML = `<svg width="1920" height="1080" viewBox="0 0 1920 1080"></svg>
    <div class="txt hg"><i></i><span></span></div><div class="txt hd"></div>
    <div class="txt bg"><b></b><span></span></div><div class="txt bd"></div>`;
  stage.appendChild(el);
  const svg = el.querySelector('svg');
  const coins = [
    `M${BORD},${BORD + BRAS} L${BORD},${BORD} L${BORD + BRAS},${BORD}`,
    `M${1920 - BORD - BRAS},${BORD} L${1920 - BORD},${BORD} L${1920 - BORD},${BORD + BRAS}`,
    `M${1920 - BORD},${1080 - BORD - BRAS} L${1920 - BORD},${1080 - BORD} L${1920 - BORD - BRAS},${1080 - BORD}`,
    `M${BORD + BRAS},${1080 - BORD} L${BORD},${1080 - BORD} L${BORD},${1080 - BORD - BRAS}`,
  ].map((d) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.style.strokeDasharray = String(BRAS * 2);
    svg.appendChild(p);
    return p;
  });
  const T = {
    point: el.querySelector('.hg i'), hg: el.querySelector('.hg span'), hd: el.querySelector('.hd'),
    barre: el.querySelector('.bg b'), bg: el.querySelector('.bg span'), bd: el.querySelector('.bd'),
  };

  const blocs = [...el.querySelectorAll('.txt')];
  const actif = (liste, t) => { let s = liste[0]; for (const x of liste) if (t >= x[0]) s = x; return s; };

  function maj(t, opt = {}) {
    // Enveloppe : 0 avant entree, 1 pendant, 0 à partir de durée − 0,3 s.
    const tracer = tw(t, entree, 0.8, E.inOut) * (1 - tw(t, sortie, 0.8, E.inOut));
    const textes = tw(t, entree + 0.4, 0.5) * (1 - tw(t, sortie, 0.5, E.in));
    const visible = tracer > 0.001 || textes > 0.001;
    el.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    el.style.opacity = opt.opacite ?? 1;
    el.classList.toggle('clair', !!opt.clair);
    coins.forEach((p, i) => { p.style.strokeDashoffset = String(BRAS * 2 * (1 - tw(t, entree + i * 0.06, 0.8, E.inOut) * (1 - tw(t, sortie + i * 0.04, 0.7, E.inOut)))); });

    const tt = entree + 0.4;
    T.point.style.opacity = t < tt + 0.3 ? 0 : (Math.floor((t - tt) * 2) % 2 ? 0.35 : 1) * textes;
    setText(T.hg, typeOn(marque, t, tt, 0.5));
    blocs.forEach((x) => { x.style.opacity = textes; });

    const [tc, cpt] = actif(compteurs, t);
    setText(T.hd, tc <= entree ? typeOn(cpt, t, tt + 0.05, 0.4) : scramble(cpt, t, tc));
    const [tq, tech] = actif(techniques, t);
    setText(T.bg, tq <= entree ? typeOn(tech, t, tt + 0.1, 0.5) : scramble(tech, t, tq));
    T.barre.style.width = `${Math.round(28 * tw(t, Math.max(tq, tt), 0.6))}px`;
    setText(T.bd, typeOn(`TC ${timecode(A.debut + t)}`, t, tt + 0.15, 0.4));
  }

  return { el, maj };
}
