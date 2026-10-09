// lib/acte.js — démarrage commun d'une page d'acte (le contrat avec render.js).
//
//   import { demarrer } from '../lib/acte.js';
//   demarrer({
//     acte: 2,                                  // la durée vient de core.ACTES (contrat)
//     async preparer() { … charger plans, photos, construire le DOM … },
//     async render(t) { … dessiner l'image du temps t (secondes locales) … },
//   });
//
// Expose pour render.js : window.__render(t) (async, résolue quand l'image est dessinée),
// window.__ready (true quand tout est chargé), window.__duration, window.__acte.
//
// Aperçu dans un navigateur (serveur enraciné sur gta6/, par ex. `npx serve gta6` ou
// `node gta6/demo/render.js --serveur`) :
//   /demo/acte-2/index.html          lecture en temps réel (approximative si le rendu est lourd)
//   /demo/acte-2/index.html?dev      barre de lecture (Espace, ←/→ = 1 s, Maj+←/→ = 1 image)
//   /demo/acte-2/index.html?t=12.5   image fixe
//   /demo/acte-2/index.html?loop     en boucle

import { ACTES, FPS, Q, RENDU, $, clamp } from './core.js';

const POLICES = [
  '800 100px "Inter Tight"', '600 100px "Inter Tight"', '400 100px "Inter Tight"',
  '100px "Instrument Serif"', 'italic 100px "Instrument Serif"', '500 20px "JetBrains Mono"',
];

export async function demarrer({ acte, duree, preparer, render }) {
  const D = duree ?? ACTES[acte - 1]?.duree;
  if (!D) throw new Error(`Durée inconnue pour l'acte ${acte}`);
  await Promise.all(POLICES.map((s) => document.fonts.load(s)));
  await document.fonts.ready;
  if (preparer) await preparer();

  const dessiner = async (t) => { await render(clamp(t, 0, D)); };
  window.__duration = D;
  window.__acte = acte;
  window.__render = dessiner;
  await dessiner(0);
  window.__ready = true;
  if (RENDU) return;

  const stage = $('stage');
  const fit = () => { stage.style.transform = `scale(${Math.min(innerWidth / 1920, innerHeight / 1080)})`; };
  fit();
  addEventListener('resize', fit);

  const fixe = Q.get('t');
  const etat = {
    lecture: fixe === null, t: fixe === null ? 0 : Number(fixe), depart: performance.now(),
    basculer() { this.lecture = !this.lecture; this.depart = performance.now() - this.t * 1000; },
  };
  const majDev = Q.has('dev') ? barreDev(etat, D) : null;
  let dernier = -1, occupe = false;
  const boucle = async (now) => {
    if (etat.lecture) {
      etat.t = (now - etat.depart) / 1000;
      if (etat.t >= D) {
        if (Q.has('loop')) { etat.depart = now; etat.t = 0; } else { etat.t = D; etat.lecture = false; }
      }
    }
    if (!occupe && etat.t !== dernier) {
      occupe = true;
      const t = etat.t;
      await dessiner(t);
      dernier = t;
      if (majDev) majDev(t);
      occupe = false;
    }
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
}

function barreDev(etat, D) {
  const bar = document.createElement('div');
  bar.id = 'dev';
  bar.innerHTML = `<button id="dev-play">▶︎ / ❚❚</button><input id="dev-range" type="range" min="0" max="${D}" step="${1 / FPS}"><span id="dev-time"></span>`;
  document.body.appendChild(bar);
  const range = $('dev-range');
  range.addEventListener('input', () => { etat.lecture = false; etat.t = Number(range.value); });
  $('dev-play').addEventListener('click', () => etat.basculer());
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); etat.basculer(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      etat.lecture = false;
      const pas = e.shiftKey ? 1 / FPS : 1;
      etat.t = clamp(etat.t + (e.code === 'ArrowRight' ? pas : -pas), 0, D);
    }
  });
  return (t) => { range.value = t; $('dev-time').textContent = `${t.toFixed(3)} s · image ${Math.round(t * FPS)}`; };
}
