// Assemble la promo : une image = await render(t).
//   index.html          lecture en temps réel   ·   ?t=12.5  image fixe   ·   ?dev  barre de lecture
//   index.html?render   piloté par render.js, image par image
'use strict';

const SCENES = [
  ['s1', 0, 5.12, upS1], ['s2', 5.1, 12.05, upS2], ['s3', 12.05, 19.6, upS3], ['s4', 19.0, 26.05, upS4],
  ['s5', 26.05, 32.6, upS5], ['s6', 32.0, 38.45, upS6], ['s7', 38.45, 46.01, upS7],
];

const G = {};

// ───────────── Curseur : il vient cliquer sur « S'abonner »
const CURSEUR = { on: 41.9, off: 43.0, de: [1500, 1130], vers: [990, 994], arrivee: 42.55 };
function curseur(t) {
  if (t < CURSEUR.on || t >= CURSEUR.off) return null;
  const [x, y] = arc(CURSEUR.de, CURSEUR.vers, E.inOut(prog(t, CURSEUR.on, CURSEUR.arrivee - CURSEUR.on)), -60);
  return { x, y, o: prog(t, CURSEUR.on, 0.15) * (1 - prog(t, CURSEUR.off - 0.15, 0.15)), press: bump(prog(t, CLIC - 0.04, 0.16)) };
}

function upCalques(t, f) {
  // Fond : faisceaux bleus ; éclat au moment où « 27/28 » apparaît.
  const eclat = 0.5 * bump(prog(t, 1.15, 0.5));
  dessinerFaisceaux(G.beams, t, { intensite: tw(t, 0.15, 1.0), vitesse: 70, eclat });

  const v = etatVolet(t);
  G.wipe.style.display = v === null ? 'none' : 'block';
  if (v !== null) G.wipe.style.transform = `translateX(${lerp(-3600, 2500, v)}px) skewX(-24deg)`;

  G.bug.style.opacity = 0.85 * tw(t, 5.5, 0.5) * (1 - prog(t, CLIC, 0.2));

  const c = curseur(t);
  G.cursor.style.opacity = c ? c.o : 0;
  if (c) G.cursor.style.transform = `translate(${c.x - 3}px,${c.y - 2}px) scale(${1 - 0.15 * c.press})`;
  const q = prog(t, CLIC, 0.5);
  G.click.style.opacity = t >= CLIC && q < 1 ? 0.9 * (1 - q) : 0;
  if (c || t >= CLIC) G.click.style.transform = `translate(${CURSEUR.vers[0]}px,${CURSEUR.vers[1]}px) scale(${0.3 + 1.6 * E.out(q)})`;

  G.grain.style.backgroundPosition = `${Math.floor(h2(f, 1) * 256)}px ${Math.floor(h2(f, 2) * 256)}px`;
}

async function render(t) {
  t = clamp(t, 0, DUR);
  const f = Math.round(t * FPS);
  const travaux = [];
  for (const [id, a, b, up] of SCENES) {
    const on = t >= a && t < b;
    G.scenes[id].classList.toggle('on', on);
    if (on) travaux.push(up(t, f));
  }
  upCalques(t, f);
  await Promise.all(travaux);
}

function grain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d'), d = x.createImageData(256, 256), rnd = mulberry(7);
  for (let i = 0; i < d.data.length; i += 4) { const v = (rnd() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  x.putImageData(d, 0, 0);
  G.grain.style.backgroundImage = `url(${c.toDataURL()})`;
}

function fit() { $('stage').style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; }

async function boot() {
  await Promise.all(['640px "Insatiable Compressed"', '100px "Insatiable Condensed"', '700 20px "GT America"', '500 20px "GT America"', '400 20px "GT America"']
    .map((s) => document.fonts.load(s)));
  await document.fonts.ready;
  G.beams = $('beams').getContext('2d');
  G.wipe = $('wipe'); G.bug = $('bug'); G.cursor = $('cursor'); G.click = $('click'); G.grain = $('grain');
  G.wipe.style.left = '0px';
  G.wipe.style.width = '3000px';
  G.scenes = Object.fromEntries(SCENES.map(([id]) => [id, $(id)]));
  construireA();
  construireB();
  grain();
  // Toutes les images fixes (logos, experts, blasons) décodées avant la première image.
  await Promise.all([...document.images].map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((ok) => { im.onload = () => im.decode().then(ok, ok); im.onerror = ok; }))));
  window.__render = render;
  window.__ready = true;
  if (RENDER) { await render(0); return; }

  fit();
  addEventListener('resize', fit);
  const fixe = Q.get('t');
  if (fixe !== null) { await render(Number(fixe)); return; }
  const debut = performance.now();
  const boucle = async (now) => {
    let t = (now - debut) / 1000;
    if (LOOP) t %= DUR;
    await render(Math.min(t, DUR));
    requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
}

boot();
