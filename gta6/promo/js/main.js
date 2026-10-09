// Assemble les scènes et expose window.__render(t) pour le rendu image par image.
import { W, H, FPS, DUREE, E, prog, $, style, mesure, TEMPS } from './outils.js';
import { chargerManquantes } from './medias.js';
import { grain, vignette } from './film.js';
import { ouverture, leonida, IMPACT } from './s-leonida.js';
import { duo, visages } from './s-duo.js';
import { records, editions, collection } from './s-infos.js';
import { radio, final } from './s-radio.js';
import { creerHud, majHud } from './hud.js';

const SCENES = [ouverture, leonida, duo, visages, records, editions, collection, radio, final];
const CHAPITRES = [3.7, mesure(9), mesure(15), mesure(19), mesure(22), mesure(27), mesure(30), mesure(34)];

const film = $('film').getContext('2d');
const fx = $('fx').getContext('2d');
let hud;

function dessiner(t) {
  const f = Math.round(t * FPS);
  film.setTransform(1, 0, 0, 1, 0, 0);
  film.globalAlpha = 1;
  film.globalCompositeOperation = 'source-over';
  film.filter = 'none';
  const s = SCENES.find((x) => t >= x.debut && t < x.fin) || final;
  s.film(film, t);
  for (const x of SCENES) x.ui(t);
  majHud(hud, t, f);
  // Mise au point qui glisse et coup de zoom à chaque changement de chapitre.
  let flou = 0, zoom = 1;
  for (const c of CHAPITRES) {
    const d = t - c;
    if (d > -0.1 && d < 0) flou = Math.max(flou, 16 * (1 + d / 0.1));
    if (d >= 0 && d < 0.2) flou = Math.max(flou, 16 * (1 - d / 0.2));
    if (d >= 0 && d < 0.5) zoom = Math.max(zoom, 1 + 0.035 * (1 - E.sortie(d / 0.5)));
  }
  for (const id of ['film', 'ui']) {
    style($(id), 'filter', flou > 0.3 ? `blur(${flou.toFixed(1)}px)` : 'none');
    style($(id), 'transform', zoom > 1.0005 ? `scale(${zoom.toFixed(4)})` : 'none');
  }
  fx.clearRect(0, 0, W, H);
  vignette(fx, 0.42);
  grain(fx, f, 0.055);
}

async function render(t) {
  for (let i = 0; i < 4; i++) {
    dessiner(t);
    if (!(await chargerManquantes())) return;
  }
}

// Partition des bruitages : son.py la lit et la mixe sous la musique du trailer 2.
function partition() {
  const ev = [];
  const add = (t, type, gain = 1, extra = {}) => ev.push({ t: +t.toFixed(3), type, gain, ...extra });
  add(0.05, 'montee', 0.8, { duree: IMPACT - 0.05 });
  add(IMPACT, 'impact', 1);
  CHAPITRES.forEach((c, i) => { add(c - 0.42, 'whoosh', 0.8, { duree: 0.55 }); if (i) add(c, 'coup', 0.7); });
  const vues = new Set();
  for (const s of SCENES) {
    for (const c of s.coupes || []) {
      if (CHAPITRES.some((x) => Math.abs(x - c) < 0.05) || vues.has(c.toFixed(2))) continue;
      vues.add(c.toFixed(2));
      add(c, s === radio ? 'clic' : 'tic', s === radio ? 0.5 : 0.4);
    }
  }
  [[mesure(19) + 1.4, 1.6], [mesure(23) + 0.25, 1.0], [mesure(26) + 0.1, 1.1], [mesure(28) + 0.3, 1.0], [mesure(32.5) + 0.35, 1.0], [mesure(34) + 4.69, 1.3]]
    .forEach(([t0, d]) => add(t0, 'compteur', 0.5, { duree: d }));
  [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82].forEach((d) => add(mesure(27) + d, 'pop', 0.5));
  add(mesure(34) + 2.89, 'impact', 0.9);
  add(mesure(34) + 3.4, 'scintille', 0.6);
  return ev;
}

(async () => {
  await Promise.all([
    'Archivo', 'Instrument Serif', 'JetBrains Mono',
  ].flatMap((f) => [document.fonts.load(`900 100px "${f}"`), document.fonts.load(`italic 400 100px "${f}"`), document.fonts.load(`400 100px "${f}"`)]));
  await document.fonts.ready;
  try { window.__eq = await (await fetch('out/eq.json')).json(); } catch { window.__eq = null; }
  const ui = $('ui');
  for (const s of SCENES) s.init(ui);
  hud = creerHud(ui);
  await Promise.all([...document.querySelectorAll('img')].map((im) => im.decode().catch(() => {})));
  window.__render = render;
  window.__sons = partition();
  window.__ready = true;
  const q = new URLSearchParams(location.search);
  if (!q.has('render')) {
    // Aperçu en direct : ?t=12 pour démarrer à 12 s.
    const box = $('viewport'), stage = $('stage');
    const ajuster = () => { stage.style.transform = `scale(${Math.min(box.clientWidth / W, box.clientHeight / H)})`; };
    addEventListener('resize', ajuster); ajuster();
    let t0 = performance.now() - (+q.get('t') || 0) * 1000, occupe = false;
    const boucle = async () => {
      if (!occupe) { occupe = true; await render(((performance.now() - t0) / 1000) % DUREE); occupe = false; }
      requestAnimationFrame(boucle);
    };
    boucle();
  }
})();
export { TEMPS };
