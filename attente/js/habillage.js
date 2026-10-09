// Habillage 2D par-dessus la 3D : faisceaux en diagonale, rubrique, titre d'attente,
// bandeau des réseaux, notifications et curseur de la régie. Tout est périodique sur
// 90 s (ou terminé avant la fin), pour que la boucle reste invisible.
import { $, DUREE, TAU, clamp, prog, E, tw, onde, bump, h2, mulberry, setText } from './outils.js';
import { RESEAUX, CLICS, CASES, pointEcran } from './regie.js';

const RUBRIQUES = [[0, '01', 'Le studio'], [22.5, '02', 'Le signal'], [45, '03', 'La régie'], [67.5, '04', 'Le rassemblement'], [88.4, '01', 'Le studio']];
const TOASTS = [[51.7, 'Micro', 'Prêt'], [53.7, 'Caméra', 'Prête'], [55.7, 'Scène', 'Prête'], [58.0, 'Chat', 'Ouvert']];
const PENTE = 0.46;

export function creerHabillage() {
  const H = {
    fx: $('faisceaux').getContext('2d'), num: $('kicker-num'), txt: $('kicker-txt'), kicker: $('kicker'),
    dot: $('attente-dot'), attente: $('attente'), piste: $('bandeau-piste'), curseur: $('curseur'), clic: $('clic'), grain: $('grain'),
  };

  // Bandeau : un motif répété ; il avance d'un nombre entier de motifs en 90 s.
  const motif = [
    ...RESEAUX.map(([n, c]) => `<div class="item"><b>${n}</b>${c}</div><i class="sep"></i>`),
    '<div class="item">Le live commence bientôt</div><i class="sep"></i>',
  ].join('');
  H.piste.innerHTML = motif.repeat(8);
  const un = document.createElement('div');
  un.style.cssText = 'position:absolute;visibility:hidden;display:flex;white-space:nowrap';
  un.innerHTML = motif;
  H.piste.appendChild(un);
  H.largeurMotif = un.getBoundingClientRect().width / ($('stage').getBoundingClientRect().width / 1920);
  un.remove();

  H.toasts = TOASTS.map(([t0, a, b]) => {
    const d = document.createElement('div');
    d.className = 'toast';
    d.innerHTML = `<div class="ic"><i></i></div><div class="tx"><b>${a} ${b.toLowerCase()}</b><span>Régie Kayzx TV</span></div>`;
    $('toasts').appendChild(d);
    return { el: d, t0 };
  });

  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d'), img = x.createImageData(256, 256), rnd = mulberry(9);
  for (let i = 0; i < img.data.length; i += 4) { const v = (rnd() * 255) | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  H.grain.style.backgroundImage = `url(${c.toDataURL()})`;
  return H;
}

function faisceaux(ctx, t) {
  ctx.clearRect(0, 0, 1920, 1080);
  const bandes = [[0, 0.5], [640, 0.35], [1180, 0.6], [1900, 0.3], [2500, 0.45]];
  const span = 3200;
  ctx.globalCompositeOperation = 'lighter';
  bandes.forEach(([base, force], k) => {
    // 2 tours complets du motif par boucle : revient à l'identique à t = 90.
    const x = ((base + (t / DUREE) * span * 2) % span) - 800;
    const top = x + 1080 * PENTE;
    const a = force * (0.55 + 0.45 * onde(t, 5 + k, k));
    const g = ctx.createLinearGradient(0, 1080, 0, 0);
    g.addColorStop(0, `rgba(95,168,156,${a})`);
    g.addColorStop(0.6, `rgba(31,111,102,${a * 0.5})`);
    g.addColorStop(1, 'rgba(31,111,102,0)');
    ctx.strokeStyle = g;
    for (const [lw, al] of [[60, 0.05], [18, 0.16], [3, 0.9]]) {
      ctx.globalAlpha = al; ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x, 1100); ctx.lineTo(top + 20 * PENTE, -20); ctx.stroke();
    }
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

export function majHabillage(H, t, f, ctx3d) {
  faisceaux(H.fx, t);

  let r = RUBRIQUES[0];
  for (const x of RUBRIQUES) if (t >= x[0]) r = x;
  setText(H.num, r[1]);
  setText(H.txt, r[2]);
  // petit fondu à chaque changement de rubrique
  const depuis = t - r[0];
  H.kicker.style.opacity = r[0] === 0 ? 1 : tw(t, r[0], 0.5);
  H.kicker.style.transform = r[0] === 0 ? 'none' : `translateY(${(1 - tw(t, r[0], 0.5)) * 10}px)`;

  // Pendant la régie, l'écran principal porte déjà le message : le titre du bas s'efface.
  const cache = E.inOut(prog(t, 45.2, 1.2)) * (1 - E.inOut(prog(t, 62.6, 1.4)));
  H.attente.style.opacity = 1 - cache;
  H.attente.style.transform = `translateX(${-40 * cache}px)`;

  // Voyant « en attente » : clignote toutes les secondes (90 clignotements par boucle).
  H.dot.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.cos((t * TAU)));

  H.piste.style.transform = `translateX(${-((t / DUREE) * H.largeurMotif * 3)}px)`;

  // Notifications de la régie : elles s'empilent puis repartent avant la fin du tableau.
  // Une notification à la fois, en haut au centre : la suivante chasse la précédente.
  H.toasts.forEach((o, i) => {
    const fin = i < H.toasts.length - 1 ? H.toasts[i + 1].t0 : 61.2;
    const a = E.out(prog(t, o.t0, 0.45)), b = E.in(prog(t, fin - 0.05, 0.35));
    o.el.style.opacity = a * (1 - b);
    o.el.style.transform = `translateY(${(1 - a) * -40 + b * -40}px) scale(${0.94 + 0.06 * a})`;
  });

  // Curseur : il vient cocher les trois cases de la check-list.
  const { camera, regie } = ctx3d;
  const on = t > 49.6 && t < 57.6;
  H.curseur.style.opacity = on ? clamp(prog(t, 49.6, 0.3) * (1 - prog(t, 57.3, 0.3))) : 0;
  let ripple = 0;
  if (on) {
    const pts = CASES.map(([u, v]) => pointEcran(regie, camera, 3, u, v, { x: 0, y: 0 }));
    const depart = { x: 1500, y: 980 }, fin = { x: 1640, y: 760 };
    const etapes = [[49.6, depart], ...CLICS.map((c, i) => [c - 0.05, pts[i]]), [57.6, fin]];
    let x = depart.x, y = depart.y;
    for (let i = 0; i < etapes.length - 1; i++) {
      const [ta, a] = etapes[i], [tb, b] = etapes[i + 1];
      if (t >= tb) { x = b.x; y = b.y; continue; }
      if (t > ta) { const p = E.inOut(prog(t, ta + 0.25, tb - ta - 0.25)); x = a.x + (b.x - a.x) * p; y = a.y + (b.y - a.y) * p; }
      break;
    }
    let press = 0;
    for (const c of CLICS) { press = Math.max(press, bump(prog(t, c - 0.05, 0.18))); const q = prog(t, c, 0.45); if (t >= c && q < 1) { ripple = 0.9 * (1 - q); H.clic.style.transform = `translate(${x}px,${y}px) scale(${0.3 + 1.4 * E.out(q)})`; } }
    H.curseur.style.transform = `translate(${x - 3}px,${y - 2}px) scale(${1 - 0.15 * press})`;
  }
  H.clic.style.opacity = ripple;

  H.grain.style.backgroundPosition = `${Math.floor(h2(f, 1) * 256)}px ${Math.floor(h2(f, 2) * 256)}px`;
}
