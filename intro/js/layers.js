// Calques qui traversent les scènes : le point doré, le curseur, les traînées
// de feu, les flashs, le cadre (HUD) et le grain.
'use strict';

// ───────────── Le point doré : le fil conducteur visuel
function dotState(t) {
  if (t < 2.98) {
    const pop = E.outBack(prog(t, 0.1, 0.38));
    const m = E.inOut(prog(t, 0.55, 0.45));
    const [x, y] = arc([960, 540], [P.opDot.x, P.opDot.y], m, -120);
    return { x, y, s: pop * (1 - E.in(prog(t, 2.72, 0.22))) };
  }
  if (t >= 3.9 && t < 8.5) {
    const cs = c1Scale(t);
    const a = camMap({ x: 960, y: 470 }, cs), b = camMap(P.c1Pill, cs);
    const m = E.inOut(prog(t, 4.95, 0.55));
    const [x, y] = arc([a.x, a.y], [b.x, b.y], m, -80);
    return { x, y, s: lerp(1.25, 0.36, m) * E.outBack(prog(t, 3.92, 0.4)) * (1 - E.in(prog(t, 8.3, 0.15))) };
  }
  if (t >= 15.9 && t < 16.45) {
    const fade = prog(t, 16.2, 0.2);
    return { x: PC.x, y: PC.y, s: E.outBack(prog(t, 15.92, 0.3)) * (1 + fade * 1.5), o: 1 - fade };
  }
  if (t >= 26.4 && t < 27.0) {
    return { x: 960, y: 560, s: E.outBack(prog(t, 26.45, 0.3)) * 1.5 * (1 - E.in(prog(t, 26.85, 0.15))) };
  }
  if (t >= 33.05) {
    const p = camMap(P.endDot, endScale(t));
    return { x: p.x, y: p.y, s: E.outBack(prog(t, 33.1, 0.4)) * 1.4 };
  }
  return null;
}

function upDot(t) {
  const d = dotState(t);
  if (!d || d.s <= 0.001) { S.dot.style.opacity = 0; return; }
  S.dot.style.opacity = d.o === undefined ? 1 : d.o;
  S.dot.style.transform = `translate(${d.x}px,${d.y}px) scale(${d.s})`;
}

// Impulsions : un anneau part du point, sur les temps forts.
const PULSES = [0.5, 1.0, 7.1, 16.1, 26.6, 33.5, 34.15];
function upRings(t) {
  let k = 0;
  S.rings.forEach((r) => { r.style.opacity = 0; });
  for (const tp of PULSES) {
    const q = prog(t, tp, 0.8);
    if (t < tp || q >= 1 || k > 1) continue;
    const d = dotState(tp);
    if (!d) continue;
    const ring = S.rings[k++];
    ring.style.opacity = 0.7 * (1 - q);
    ring.style.transform = `translate(${d.x}px,${d.y}px) scale(${Math.max(d.s, 0.5) * (1 + 3.5 * E.out(q))})`;
  }
}

// ───────────── Le curseur : il navigue dans la présentation comme sur un site
let CUR = [];
function cursorTracks() {
  const sel = clamp(CONFIG.ceSoir | 0, 0, P.c3Items.length - 1);
  const c1 = camMap(P.c1Cta2, 1.03);
  const it = P.c3Items[sel];
  CUR = [
    { on: 7.45, off: 8.7, pts: [[7.45, 1580, 1010], [8.15, c1.x + 10, c1.y + 8]], clicks: [8.3] },
    { on: 18.2, off: 19.85, pts: [[18.2, 960, 1015], [18.95, it.x, it.y]], clicks: [19.15] },
    { on: 25.35, off: 26.3, pts: [[25.35, 1560, 1060], [25.92, P.c4Cta.x + 8, P.c4Cta.y + 6]], clicks: [26.05] },
    {
      on: 28.45, off: 30.85,
      pts: [[28.45, 1320, 980], [28.9, P.reels[0].x, P.reels[0].y], [29.4, P.reels[1].x, P.reels[1].y], [29.9, P.reels[2].x, P.reels[2].y], [30.5, 1240, 860]],
      clicks: REEL_CLICK,
    },
  ];
}

function cursorAt(t) {
  for (const tr of CUR) {
    if (t < tr.on || t >= tr.off) continue;
    let x = tr.pts[0][1], y = tr.pts[0][2];
    for (let k = 0; k < tr.pts.length - 1; k++) {
      const [ta, xa, ya] = tr.pts[k], [tb, xb, yb] = tr.pts[k + 1];
      if (t >= tb) { x = xb; y = yb; continue; }
      if (t > ta) [x, y] = arc([xa, ya], [xb, yb], E.inOut(prog(t, ta, tb - ta)), k % 2 ? 50 : -50);
      break;
    }
    const o = prog(t, tr.on, 0.18) * (1 - prog(t, tr.off - 0.18, 0.18));
    let press = 0;
    for (const c of tr.clicks) press = Math.max(press, bump(prog(t, c - 0.04, 0.16)));
    return { x, y, o, press, tr };
  }
  return null;
}

function upCursor(t) {
  const c = cursorAt(t);
  let ro = 0;
  if (c) {
    S.cursor.style.opacity = c.o;
    S.cursor.style.transform = `translate(${c.x - 3}px,${c.y - 2}px) scale(${1 - 0.15 * c.press})`;
    for (const ck of c.tr.clicks) {
      const q = prog(t, ck, 0.5);
      if (t < ck || q >= 1) continue;
      S.click.style.transform = `translate(${c.x}px,${c.y}px) scale(${0.3 + 1.4 * E.out(q)})`;
      ro = 0.9 * (1 - q);
    }
  } else S.cursor.style.opacity = 0;
  S.click.style.opacity = ro;
}

// ───────────── Les traînées de feu après 88 MPH (14 → 16 s)
let FLAME = null;
function makeFlame() {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(24, 108, 2, 24, 92, 64);
  g.addColorStop(0, 'rgba(255,248,230,1)');
  g.addColorStop(0.25, 'rgba(250,214,140,.9)');
  g.addColorStop(0.55, 'rgba(227,168,59,.55)');
  g.addColorStop(1, 'rgba(227,168,59,0)');
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(24, 0);
  x.bezierCurveTo(40, 50, 46, 92, 24, 126);
  x.bezierCurveTo(2, 92, 8, 50, 24, 0);
  x.fill();
  return c;
}

// Deux traces en perspective, qui filent vers l'horizon à droite.
const TRAILS = [[930, 770], [1040, 812]];
function drawTrails(ctx, t) {
  const head = lerp(-60, 2000, E.out(prog(t, 14.0, 0.34)));
  const life = 1 - E.inOut(prog(t, 15.0, 0.95));
  if (life <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  TRAILS.forEach(([y0, y1], k) => {
    const yAt = (x) => lerp(y0, y1, clamp(x / W));
    const g = ctx.createLinearGradient(-60, 0, head, 0);
    g.addColorStop(0, `rgba(227,168,59,${0.25 * life})`);
    g.addColorStop(1, `rgba(255,240,200,${0.9 * life})`);
    ctx.strokeStyle = g;
    for (const [lw, a] of [[22, 0.3], [4, 1]]) {
      ctx.globalAlpha = a;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(-60, yAt(-60)); ctx.lineTo(head, yAt(head)); ctx.stroke();
    }
    ctx.globalAlpha = 0.8;
    for (let x = -60; x < head; x += 11) {
      const i = Math.round(x / 11) + k * 500;
      const n = noise1(t * 7 + i * 0.53, i);
      const sc = lerp(1.35, 0.6, clamp(x / W));
      const fresh = 1 - clamp((head - x) / 700);
      const hgt = (14 + 46 * n) * life * (0.55 + 0.45 * fresh) * sc;
      const w = (12 + 12 * n) * sc;
      ctx.drawImage(FLAME, x - w / 2, yAt(x) - hgt, w, hgt + 6);
    }
  });
  ctx.globalAlpha = 1;
  for (let i = 0; i < 70; i++) {
    const ph = (t * 0.9 + hash(i)) % 1;
    const x0 = hash(i + 50) * Math.min(head, W);
    const [y0, y1] = TRAILS[i % 2];
    const x = x0 + ph * 40 * (hash(i + 3) - 0.5);
    const y = lerp(y0, y1, x0 / W) - ph * (80 + 140 * hash(i + 9));
    ctx.fillStyle = `rgba(242,199,110,${(1 - ph) * life * 0.9})`;
    ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i + 11) * 1.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

let fxDirty = true;
function upFx(t) {
  const ctx = S.fxCtx;
  if (t < 14.0 || t >= 16.0) {
    if (fxDirty) { ctx.clearRect(0, 0, W, H); fxDirty = false; }
    return;
  }
  fxDirty = true;
  ctx.clearRect(0, 0, W, H);
  drawTrails(ctx, t);
}

// ───────────── Flashs : le saut temporel, puis la lumière de la mallette
const FLASH_JUMP = 'radial-gradient(circle at 62% 50%, rgba(255,246,226,1) 0%, rgba(242,199,110,.85) 32%, rgba(227,168,59,0) 72%)';
const FLASH_GOLD = 'radial-gradient(circle at 50% 46%, #FFF6E2 0%, #F2C76E 58%, #E3A83B 100%)';
function flashState(t) {
  if (t >= 13.93 && t < 14.5) return { o: 0.92 * E.out(prog(t, 13.93, 0.06)) * (1 - E.out(prog(t, 14.0, 0.45))), bg: FLASH_JUMP };
  if (t >= 32.3 && t < 33.7) return { o: E.in(prog(t, 32.3, 0.65)) * (1 - E.out(prog(t, 33.0, 0.6))), bg: FLASH_GOLD };
  return { o: 0, bg: null };
}
let flashBg = null;
function upFlash(t) {
  const s = flashState(t);
  if (s.bg && s.bg !== flashBg) { S.flash.style.background = s.bg; flashBg = s.bg; }
  S.flash.style.opacity = s.o;
}

// ───────────── Le cadre : chapitres, technique, timecode (clin d'œil au showreel)
const HUD_SEG = [
  [0, 'Chapitre 00 / 05', 'Typographie / Définition'],
  [3, 'Chapitre 01 / 05', 'UI / Lancement produit'],
  [9, 'Chapitre 02 / 05', 'Data / Planning'],
  [15, 'Chapitre 03 / 05', 'Génératif / Multivers'],
  [21, 'Chapitre 04 / 05', 'UI / Communauté'],
  [27, 'Chapitre 05 / 05', 'Lumière / Révélation'],
  [33, 'Fin', 'Identité / ' + CONFIG.nom],
];
function typeOn(str, t, t0, d) {
  const n = Math.floor(str.length * prog(t, t0, d));
  return n <= 0 ? '' : str.slice(0, n) + (n < str.length ? '_' : '');
}
function setText(el, s) { if (el.textContent !== s) el.textContent = s; }

function upHud(t, f) {
  S.hud.style.opacity = 1 - 0.8 * flashState(t).o;
  const light = t >= 21.88 && t < 26.8;
  S.hud.classList.toggle('light', light);
  S.hud.style.color = light ? 'rgba(8,38,36,.72)' : 'rgba(201,209,209,.8)';
  S.hudPaths.forEach((p, i) => { p.style.strokeDashoffset = 72 * (1 - tw(t, 0.3 + i * 0.06, 0.6, E.inOut)); });
  S.hudDot.style.opacity = t < 0.8 ? 0 : Math.floor(t * 2) % 2 ? 0.35 : 1;
  setText(S.hudTxt.brand, typeOn(`${CONFIG.nom} — Intro live`, t, 0.8, 0.5));

  let seg = HUD_SEG[0];
  for (const s of HUD_SEG) if (t >= s[0]) seg = s;
  const first = seg[0] === 0;
  setText(S.hudTxt.tr, first ? typeOn(seg[1], t, 0.9, 0.45) : scramble(seg[1], t, seg[0], f));
  setText(S.hudTxt.bl, first ? typeOn(seg[2], t, 1.0, 0.5) : scramble(seg[2], t, seg[0], f));
  const pad = (n) => String(n).padStart(2, '0');
  setText(S.hudTxt.br, typeOn(`TC 00:00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`, t, 1.05, 0.4));

  S.hudProg.style.opacity = tw(t, 1.2, 0.6);
  S.hudBars.forEach((b, i) => { b.style.transform = `scaleX(${prog(t, CARD_AT[i], 6)})`; });
}

// ───────────── Grain de pellicule, tiré au sort à chaque image
function makeGrain() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const d = x.createImageData(256, 256);
  const rnd = mulberry(7);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = (rnd() * 255) | 0;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  S.grain.style.backgroundImage = `url(${c.toDataURL()})`;
}
function upGrain(f) {
  S.grain.style.backgroundPosition = `${Math.floor(h2(f, 1) * 256)}px ${Math.floor(h2(f, 2) * 256)}px`;
}
