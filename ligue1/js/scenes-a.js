// Scènes 1 à 3 : SAISON 27/28, 100 % des matchs, plus de 25 heures de direct.
'use strict';

const A = {};

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

function construireA() {
  // 1 — lignes de texte en contour qui défilent derrière le titre
  for (let r = 0; r < 4; r++) el('div', 'row-out', $('s1-rows'), 'Ligue 1+ · Saison 27/28 · '.repeat(6));
  A.rows = [...$('s1-rows').children];
  A.saison = split($('s1-saison'), 'letters');
  A.kick = $('s1-kick');
  A.cv1 = $('s1-cv');
  A.c1 = A.cv1.getContext('2d');

  // 2 — 100 %
  A.c2 = $('s2-cv').getContext('2d');
  A.cam2 = $('s2-cam');
  A.num = $('s2-num');
  A.pct = $('s2-pct');
  A.claims = [...$('s2-claims').children];
  A.sub2 = $('s2-sub');
  A.card = $('s2-card');

  // 3 — la grille du week-end dans quatre téléphones
  A.title3 = $('s3-title');
  A.h3 = $('s3-h');
  A.sub3 = $('s3-sub');
  A.phones = GRILLE.map((g, i) => {
    const ph = el('div', 'phone', $('s3-phones'),
      `<div class="notch"></div><div class="day">${g.jour}</div><div class="list">${g.progs.map((p) =>
        `<div class="prog ${p.live ? 'white' : 'pink'}"><div class="h">${p.h}</div><div class="n">${p.n}</div><div class="p">${p.p}</div></div>`).join('')}</div>`);
    ph.style.left = `${960 + (i - 1.5) * 390}px`;
    return { el: ph, list: ph.querySelector('.list'), items: [...ph.querySelectorAll('.prog')] };
  });
}

// ───────────── 1. SAISON 27/28 (0 → 5,2 s) : le match joue à l'intérieur des chiffres
async function upS1(t) {
  const sortie = prog(t, 3.3, 0.5);
  A.rows.forEach((r, i) => {
    const dir = i % 2 ? 1 : -1;
    r.style.transform = `translateX(${dir * t * 70 + (i % 2 ? -1500 : -300)}px)`;
    r.style.opacity = tw(t, 0.3, 1.0) * (1 - sortie);
  });
  slideWords(A.saison, t, 0.7, 0.045, 0.8, [3.3, 0.02, 0.35]);
  A.kick.style.opacity = tw(t, 2.4, 0.6) * (1 - prog(t, 3.3, 0.4));

  const ctx = A.c1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (t < 1.2) return;
  const im = await plan('action', t - 1.0, 0.5);
  const taille = 640, txt = '27/28';
  ctx.font = `${taille}px "Insatiable Compressed"`;
  const larg = ctx.measureText(txt).width;
  const tx = 960 - larg / 2, ty = 900;
  // Le zoom final traverse la barre oblique, qui devient la transition vers la scène 2.
  const zx = tx + ctx.measureText('27').width + ctx.measureText('/').width * 0.5, zy = ty - taille * 0.36;
  const entree = E.out(prog(t, 1.2, 0.7));
  const zp = E.in(prog(t, 3.5, 1.6));
  const S = lerp(1.18, 1, entree) * Math.pow(70, zp);
  const pose = () => ctx.setTransform(S, 0, 0, S, zx * (1 - S), zy * (1 - S));

  couvrir(ctx, im, 0, 0, W, H, { zoom: 1.04 + 0.05 * prog(t, 1, 4) });
  ctx.globalCompositeOperation = 'destination-in';
  pose();
  ctx.fillStyle = '#fff';
  ctx.fillText(txt, tx, ty);
  ctx.globalCompositeOperation = 'source-over';
  // D'abord des chiffres blancs, puis le match apparaît dedans.
  const blanc = (1 - E.inOut(prog(t, 1.7, 0.6))) * entree;
  if (blanc > 0) { ctx.globalAlpha = blanc; ctx.fillStyle = '#F7F7F6'; ctx.fillText(txt, tx, ty); }
  // Contour fin qui disparaît pendant le zoom
  ctx.globalAlpha = 0.55 * entree * (1 - prog(t, 3.4, 0.4));
  ctx.lineWidth = 2 / S;
  ctx.strokeStyle = '#F7F7F6';
  if (ctx.globalAlpha > 0) ctx.strokeText(txt, tx, ty);
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  A.cv1.style.opacity = clamp(entree * 1.4);
}

// ───────────── 2. 100 % des matchs (5 → 12,2 s)
const CLAIMS_T = [6.4, 7.6, 8.7, 9.8, 99];
async function upS2(t) {
  let nom, tl, v;
  if (t < 7.7) { nom = 'celeb'; tl = t - 5.0; v = 0.48; }
  else if (t < 9.4) { nom = 'rennes'; tl = t - 7.7; v = 0.55; }
  else { nom = 'tifo'; tl = t - 9.4; v = 0.46; }
  const im = await plan(nom, tl, v);
  const ctx = A.c2;
  ctx.clearRect(0, 0, W, H);
  couvrir(ctx, im, 0, 0, W, H, { zoom: 1.06 + 0.05 * prog(t, 5, 7.2), fx: 0.62 });
  A.cam2.style.transform = `scale(${1 + 0.02 * prog(t, 5, 7)})`;

  const n = Math.round(100 * E.out(prog(t, 5.4, 1.3)));
  setText(A.num, String(n));
  const p = tw(t, 5.2, 0.5);
  A.pct.style.opacity = p;
  A.pct.style.transformOrigin = '0 70%';
  A.pct.style.transform = `translateY(${(1 - p) * 40}px) scale(${1 + 0.07 * bump(prog(t, 6.6, 0.32))})`;

  A.claims.forEach((c, i) => {
    const a = E.out(prog(t, CLAIMS_T[i], 0.45)), b = E.in(prog(t, CLAIMS_T[i + 1], 0.3));
    c.style.transform = `translateY(${(1 - a) * 135 - b * 135}%)`;
  });
  rise(A.sub2, t, 10.3, 0.6);

  const c = E.out(prog(t, 8.2, 0.9));
  A.card.style.opacity = prog(t, 8.2, 0.25);
  A.card.style.transform = `perspective(1400px) translateX(${(1 - c) * 520}px) translateY(${Math.sin(t * 1.4) * 8}px) rotateY(${(1 - c) * -38 - 6}deg)`;
}

// ───────────── 3. Plus de 25 heures de direct (12 → 19,2 s)
async function upS3(t) {
  const p = tw(t, 12.35, 0.7);
  A.title3.style.opacity = p;
  A.title3.style.transform = `translateY(${(1 - p) * 60 - E.in(prog(t, 18.6, 0.5)) * 140}px)`;
  setText(A.h3, String(Math.round(25 * E.out(prog(t, 12.5, 1.1)))));
  const q = tw(t, 12.8, 0.6);
  A.sub3.style.opacity = q * (1 - prog(t, 18.6, 0.3));
  A.sub3.style.transform = `translateY(${(1 - q) * 30}px)`;

  A.phones.forEach((ph, i) => {
    const e = E.out(prog(t, 12.7 + i * 0.12, 0.95));
    const sortie = E.in(prog(t, 18.45 + i * 0.06, 0.6));
    const y = (1 - e) * 900 - sortie * 1300;
    const rot = (i - 1.5) * -9, z = -Math.abs(i - 1.5) * 90 + Math.sin(t * 1.1 + i) * 10;
    ph.el.style.transform = `translateY(${y}px) rotateY(${rot}deg) translateZ(${z}px)`;
    const hauteur = ph.items.length * 142 - 600;
    if (hauteur > 0) ph.list.style.transform = `translateY(${-hauteur * E.inOut(prog(t, 14.0, 4.2))}px)`;
    ph.items.forEach((it, j) => {
      const a = tw(t, 13.2 + i * 0.12 + j * 0.08, 0.45);
      it.style.opacity = a;
      it.style.transform = `translateY(${(1 - a) * 24}px)`;
    });
  });
}
