// Chapitre 3 (multivers), chapitre 4 (rassemblement), chapitre 5 (la mallette), fin.
'use strict';

// ───────────── Chapitre 3 : le portail et les dimensions (15 → 21 s)
const PC = { x: 1300, y: 540 }, PR = 280;
const ORBIT = [-62, -14, 34, 82];
const TILT = [-4, 3, -2, 5];
let ARMS = null, ARCS = null;

function portalData() {
  const rnd = mulberry(137);
  ARMS = Array.from({ length: 18 }, (_, j) => ({ a0: (j / 18) * TAU + rnd() * 0.25, w: 0.5 + rnd(), al: 0.2 + rnd() * 0.4, tw: 2.4 + rnd() * 1.4 }));
  ARCS = Array.from({ length: 120 }, () => ({
    r: 0.18 + 0.82 * Math.sqrt(rnd()), a0: rnd() * TAU, len: 0.25 + rnd() * 1.1,
    lw: 0.8 + rnd() * 3.2, al: 0.15 + rnd() * 0.5, sp: 0.6 + rnd() * 1.4, hot: rnd() < 0.08,
  }));
}

function orbitPos(i, t) {
  const a = (ORBIT[i] * Math.PI) / 180 + 0.05 * Math.max(0, t - 17);
  return [PC.x + 400 * Math.cos(a), PC.y + 330 * Math.sin(a) + 6 * Math.sin(t * 1.7 + i * 1.3)];
}

function drawStars(ctx, t, z, tx, ty, a) {
  if (a <= 0) return;
  const k = 1 + (z - 1) * 0.3;
  for (let i = 0; i < 150; i++) {
    const x = PC.x + (hash(i + 1000) * W - PC.x) * k + tx;
    const y = PC.y + (hash(i + 2000) * H - PC.y) * k + ty;
    const s = 0.6 + 1.4 * hash(i + 4000);
    ctx.fillStyle = `rgba(201,209,209,${(0.25 + 0.55 * noise1(t * 1.5 + i, i)) * a * (0.3 + 0.7 * hash(i + 3000))})`;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
}

function drawPortal(ctx, cx, cy, R, t, arms) {
  if (R < 1) return;
  ctx.save();
  let g = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.9);
  g.addColorStop(0, 'rgba(95,168,156,.38)');
  g.addColorStop(0.45, 'rgba(31,111,102,.16)');
  g.addColorStop(1, 'rgba(31,111,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, TAU); ctx.fill();

  // Bord qui ondule
  const path = new Path2D();
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * TAU;
    const w = 1 + 0.035 * Math.sin(a * 5 + t * 2.6) + 0.022 * Math.sin(a * 9 - t * 3.7) + 0.012 * Math.sin(a * 14 + t * 5.1);
    const x = cx + Math.cos(a) * R * w, y = cy + Math.sin(a) * R * w;
    if (i) path.lineTo(x, y); else path.moveTo(x, y);
  }
  path.closePath();
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  g.addColorStop(0, '#082624'); g.addColorStop(0.32, '#0B2F2D'); g.addColorStop(0.62, '#185650');
  g.addColorStop(0.86, '#2F8A7E'); g.addColorStop(1, '#9CCFC5');
  ctx.fillStyle = g;
  ctx.fill(path);

  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const k = R / 300;
  // Bras de spirale : plus épais et plus clairs vers le bord
  for (const arm of ARMS) {
    let px = 0, py = 0;
    for (let s = 0; s <= 30; s++) {
      const r = 0.12 + (0.88 * s) / 30;
      const th = arm.a0 + arm.tw * Math.pow(1 - r, 1.4) + t * 1.3;
      const x = cx + Math.cos(th) * r * R, y = cy + Math.sin(th) * r * R;
      if (s) {
        ctx.strokeStyle = `rgba(156,207,197,${arm.al * r * arms})`;
        ctx.lineWidth = (1 + 5 * r * arm.w) * k;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      }
      px = x; py = y;
    }
  }
  // Arcs : la texture du tourbillon, plus rapides au centre
  for (const a of ARCS) {
    const ang = a.a0 + t * a.sp * (1.8 - a.r) + (1 - a.r) * 4;
    ctx.strokeStyle = a.hot ? `rgba(242,199,110,${a.al * arms})` : `rgba(201,230,224,${a.al * (0.3 + 0.7 * a.r) * arms})`;
    ctx.lineWidth = a.lw * k;
    ctx.beginPath(); ctx.arc(cx, cy, a.r * R, ang, ang + a.len); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
  g.addColorStop(0, 'rgba(8,38,36,1)'); g.addColorStop(0.5, 'rgba(8,38,36,.85)'); g.addColorStop(1, 'rgba(8,38,36,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - R * 0.6, cy - R * 0.6, R * 1.2, R * 1.2);
  ctx.restore();

  ctx.strokeStyle = `rgba(156,207,197,${0.25 * arms + 0.05})`;
  ctx.lineWidth = Math.max(6, R * 0.06);
  ctx.stroke(path);
  ctx.strokeStyle = `rgba(214,240,233,${0.75 * arms + 0.1})`;
  ctx.lineWidth = Math.max(2, R * 0.016);
  ctx.stroke(path);
  ctx.restore();
}

function drawSparks(ctx, cx, cy, R, t, a) {
  if (R < 1 || a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const k = Math.sqrt(Math.max(1, R / PR));
  for (let i = 0; i < 80; i++) {
    const ph = (t * 0.32 + hash(i + 300)) % 1;
    const r = R * (1.5 - 1.25 * ph);
    const th = hash(i + 400) * TAU + ph * 4.5 + t * 0.5;
    const al = Math.sin(ph * Math.PI) * a * (0.4 + 0.6 * hash(i + 500));
    ctx.fillStyle = hash(i + 600) < 0.3 ? `rgba(242,199,110,${al})` : `rgba(214,240,233,${al * 0.8})`;
    ctx.beginPath(); ctx.arc(cx + Math.cos(th) * r, cy + Math.sin(th) * r, (1.2 + 2.2 * hash(i + 700)) * k, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function upCh3(t) {
  const c = S.c3;
  const sel = clamp(CONFIG.ceSoir | 0, 0, c.cats.length - 1);
  const zp = prog(t, 19.85, 1.15) ** 2, zs = Math.pow(20, zp);
  const sh = E.inOut(prog(t, 19.9, 1.1)), tx = (960 - PC.x) * sh, ty = (540 - PC.y) * sh;
  c.cam.style.transformOrigin = `${PC.x}px ${PC.y}px`;
  c.cam.style.transform = sh > 0 || zp > 0 ? `translate(${tx}px,${ty}px) scale(${zs})` : 'none';

  const ctx = c.ctx;
  ctx.clearRect(0, 0, W, H);
  drawStars(ctx, t, zs, tx, ty, tw(t, 15.85, 0.8) * (1 - zp));
  const open = E.outBack(prog(t, 16.12, 0.7));
  const R = PR * open * zs;
  drawPortal(ctx, PC.x + tx, PC.y + ty, R, t, 1 - zp);
  drawSparks(ctx, PC.x + tx, PC.y + ty, R, t, open * (1 - zp));

  rise(c.eye, t, 16.0, 0.6);
  slideWords(c.h, t, 16.05, 0.08, 0.9);
  rise(c.sel, t, 16.85, 0.6, 18);

  // La liste s'ouvre, le curseur la survole, puis elle se referme
  const open2 = E.out(prog(t, 17.85, 0.4)) * (1 - E.inOut(prog(t, 19.25, 0.28)));
  c.list.style.clipPath = `inset(0 0 ${(1 - open2) * 100}% 0 round 16px)`;
  c.list.style.opacity = open2 > 0.01 ? 1 : 0;
  c.items.forEach((it, i) => { it.style.opacity = tw(t, 17.95 + i * 0.06, 0.35); });
  const cur = cursorAt(t);
  let hi = -1;
  if (cur && t < 19.3) {
    const L = P.c3List;
    if (cur.x > L.x && cur.x < L.x + L.w && cur.y > L.y + 8) hi = Math.floor((cur.y - L.y - 8) / 58);
    if (hi >= c.items.length) hi = -1;
  }
  c.hl.style.opacity = hi >= 0 ? 1 : 0;
  if (hi >= 0) c.hl.style.transform = `translateY(${hi * 58}px)`;

  const chosen = t >= 19.2, cat = CONFIG.categories[sel];
  c.code.textContent = chosen ? cat.code : 'K-???';
  c.name.textContent = chosen ? cat.nom : 'Choisir une dimension…';
  const cp = tw(t, 19.2, 0.45);
  c.name.style.opacity = chosen ? cp : 0.55;
  c.name.style.transform = chosen ? `translateY(${(1 - cp) * 14}px)` : 'none';
  const gb = tw(t, 19.15, 0.3);
  c.box.style.borderColor = `rgba(${Math.round(lerp(201, 227, gb))},${Math.round(lerp(209, 168, gb))},${Math.round(lerp(209, 59, gb))},${lerp(0.2, 0.8, gb)})`;
  c.box.style.boxShadow = gb > 0 ? `0 0 ${30 * gb}px rgba(227,168,59,${0.25 * gb})` : 'none';

  c.cats.forEach((card, i) => {
    const start = 16.9 + i * 0.28, e = E.out(prog(t, start, 0.8));
    let [x, y] = arc([PC.x, PC.y], orbitPos(i, t), e, 90);
    let s = 0.15 + 0.85 * e, r = lerp(-60, TILT[i], e), o = prog(t, start, 0.15);
    if (i === sel) {
      const g = tw(t, 19.2, 0.3);
      card.style.borderColor = g > 0 ? `rgba(227,168,59,${0.28 + 0.6 * g})` : '';
      card.style.boxShadow = g > 0 ? `0 24px 60px rgba(0,0,0,.45), 0 0 ${40 * g}px rgba(227,168,59,${0.35 * g})` : '';
      const fly = E.in(prog(t, 19.45, 0.6));
      x = lerp(x, PC.x, fly); y = lerp(y, PC.y, fly);
      s *= 1 - fly * 0.95; r += fly * 220; o *= 1 - prog(t, 19.95, 0.1);
    } else {
      o *= 1 - 0.6 * tw(t, 19.3, 0.4);
    }
    card.style.opacity = o;
    card.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
  });

  c.dark.style.opacity = tw(t, 20.86, 0.14, E.inOut);
}

// ───────────── Chapitre 4 : six cartes, six emplacements (21 → 27 s)
const MEM_SLOTS = [[596, 548], [960, 548], [1324, 548], [596, 696], [960, 696], [1324, 696]];
const MEM_FROM = [[-1500, -520, -28], [0, -900, 14], [1500, -520, 24], [-1500, 520, 22], [0, 900, -16], [1500, 520, -26]];
const memLand = (i) => 22.8 + i * 0.5;

function upCh4(t) {
  const c = S.c4;
  const ep = tw(t, 21.95, 0.6), ex = E.in(prog(t, 26.06, 0.3));
  c.eye.style.opacity = ep * (1 - ex);
  c.eye.style.transform = `translateY(${(1 - ep) * 16 - ex * 20}px)`;
  slideWords(c.h, t, 22.0, 0.06, 0.85, [26.08, 0.02, 0.35]);
  const hx = E.in(prog(t, 26.08, 0.3));
  c.hl.style.transformOrigin = hx > 0 ? 'right' : 'left';
  c.hl.style.transform = `scaleX(${tw(t, 22.55, 0.45, E.inOut) * (1 - hx)})`;

  let n = 0;
  c.mems.forEach((m, i) => {
    const L = memLand(i), p = prog(t, L - 0.62, 0.62), e = E.out(p);
    const [sx, sy] = MEM_SLOTS[i], [fx, fy, fr] = MEM_FROM[i];
    let x = lerp(sx + fx, sx, e), y = lerp(sy + fy, sy, e);
    let r = lerp(fr, 0, E.spring(p));
    let s = lerp(0.82, 1, e) * (1 + 0.035 * bump(prog(t, L, 0.22)));
    let o = prog(t, L - 0.62, 0.1);
    const cv = E.in(prog(t, 26.12 + i * 0.03, 0.42));
    x = lerp(x, 960, cv); y = lerp(y, 560, cv);
    s *= 1 - 0.92 * cv; r += cv * (i % 2 ? 120 : -120);
    o *= 1 - prog(t, 26.45 + i * 0.03, 0.1);
    m.style.opacity = o;
    m.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
    const lit = t >= L;
    if (lit) n++;
    const pop = 1 + 0.6 * bump(prog(t, L, 0.3));
    [c.memGems[i], c.gems[i]].forEach((g) => {
      g.classList.toggle('lit', lit);
      g.style.transform = `rotate(45deg) scale(${lit ? pop : 1})`;
    });
  });
  c.count.textContent = `${n}/6`;

  const bp = tw(t, 22.45, 0.7), bq = E.in(prog(t, 26.1, 0.3));
  c.bar.style.opacity = bp * (1 - bq);
  c.bar.style.transform = `translateY(${(1 - bp) * 24}px) scale(${1 - 0.1 * bq})`;
  const hv = tw(t, 25.82, 0.15, E.outCubic), pr = bump(prog(t, 26.05, 0.2));
  c.cta.style.transform = `scale(${(1 + 0.03 * hv) * (1 - 0.06 * pr)})`;
  c.cta.style.boxShadow = `0 14px 34px rgba(227,168,59,${0.28 + 0.3 * hv})`;

  const r = 1250 * E.inOut(prog(t, 26.6, 0.4));
  c.circle.style.clipPath = `circle(${r}px at 960px 560px)`;
}

// ───────────── Chapitre 5 : la combinaison, puis la lumière (27 → 33 s)
const SEAM = { x: 960, y: 500 };
const REEL_CLICK = [29.0, 29.5, 30.0];

function upCh5(t) {
  const c = S.c5;
  const cs = 1 + 3.6 * E.in(prog(t, 31.7, 1.25));
  c.cam.style.transformOrigin = `${SEAM.x}px ${SEAM.y}px`;
  c.cam.style.transform = cs > 1.0001 ? `scale(${cs})` : 'none';

  slideWords(c.qw, t, 28.0, 0.06, 0.8, [30.65, 0.03, 0.35]);
  const ce = E.out(prog(t, 27.9, 0.9));
  c.kase.style.opacity = prog(t, 27.9, 0.3);
  c.kase.style.transform = `translateY(${(1 - ce) * 60}px) scale(${0.96 + 0.04 * ce})`;
  c.shadow.style.opacity = ce * (1 - tw(t, 31.0, 1.0));
  const ts = Math.max(0, t - 28);
  c.tag.style.transform = `rotate(${10 * Math.exp(-ts * 0.7) * Math.sin(ts * 4.4) + 2.5 * Math.sin(t * 1.4)}deg)`;

  c.reels.forEach((r, i) => {
    const v = 16 * E.out(prog(t, REEL_CLICK[i] + 0.04, 0.55));
    r.strip.style.transform = `translateY(${-v * 92}px)`;
    const g = tw(t, REEL_CLICK[i] + 0.45, 0.2);
    r.win.style.borderColor = g > 0 ? `rgba(227,168,59,${0.16 + 0.7 * g})` : '';
    r.digits[16].style.color = g > 0 ? mix('#EEF2F1', '#F2C76E', g) : '';
  });
  const ok = tw(t, 30.5, 0.25);
  c.lock.style.borderColor = `rgba(227,168,59,${0.25 + 0.6 * ok})`;
  c.led.style.background = ok > 0 ? mix('#3A5551', '#E3A83B', ok) : '';
  c.led.style.boxShadow = ok > 0.5 ? '0 0 12px #E3A83B' : 'none';
  c.latchL.style.transform = `rotate(${-38 * E.outBack(prog(t, 30.6, 0.35))}deg)`;
  c.latchR.style.transform = `rotate(${38 * E.outBack(prog(t, 30.72, 0.35))}deg)`;
  const lp = E.out(prog(t, 30.92, 0.8));
  c.lid.style.transform = lp ? `translateY(${-50 * lp}px) rotateX(${18 * lp}deg)` : 'none';
  c.light.style.opacity = E.inOut(prog(t, 30.88, 0.5));
  const bl = E.inOut(prog(t, 30.95, 1.6));
  c.bloom.style.opacity = bl;
  c.bloom.style.transform = `scale(${0.35 + 1.5 * bl})`;
  drawCh5(c.ctx, t, cs, bl);
}

function drawCh5(ctx, t, cs, bl) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.setTransform(cs, 0, 0, cs, SEAM.x * (1 - cs), SEAM.y * (1 - cs));
  const a = tw(t, 27.75, 0.8);
  const g = ctx.createLinearGradient(0, -100, 0, 1080);
  g.addColorStop(0, `rgba(201,209,209,${0.09 * a})`);
  g.addColorStop(1, `rgba(201,209,209,${0.015 * a})`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(880, -100); ctx.lineTo(1040, -100); ctx.lineTo(1500, 1080); ctx.lineTo(420, 1080); ctx.closePath(); ctx.fill();

  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = mix('#C9D1D1', '#F2C76E', bl);
  for (let i = 0; i < 90; i++) {
    const y = 1180 - ((t * (14 + 30 * hash(i + 10)) + hash(i + 20) * 1300) % 1300);
    const spread = 160 + (y + 100) * 0.38;
    const x = 960 + (hash(i + 30) - 0.5) * 2 * spread + 18 * Math.sin(t * 0.6 + i);
    ctx.globalAlpha = clamp(a * (0.15 + 0.5 * hash(i + 40)) * (0.6 + 0.4 * Math.sin(t * 2 + i)) * (1 + bl));
    ctx.beginPath(); ctx.arc(x, y, 1 + 1.6 * hash(i + 50), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (bl > 0) {
    for (let i = 0; i < 18; i++) {
      const ang = -Math.PI * (0.08 + (0.84 * (i + 0.5)) / 18) + 0.05 * Math.sin(t * 0.8 + i * 1.7);
      const wd = 0.018 + 0.03 * hash(i + 60), len = 900 + 700 * hash(i + 70);
      const al = bl * (0.12 + 0.25 * hash(i + 80)) * (0.7 + 0.3 * Math.sin(t * 3 + i));
      const gr = ctx.createRadialGradient(SEAM.x, SEAM.y, 0, SEAM.x, SEAM.y, len);
      gr.addColorStop(0, `rgba(255,240,205,${al})`);
      gr.addColorStop(1, 'rgba(242,199,110,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(SEAM.x, SEAM.y); ctx.arc(SEAM.x, SEAM.y, len, ang - wd, ang + wd); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// ───────────── Fin : l'identité (33 → 35 s)
const endScale = (t) => 1 + 0.025 * prog(t, 33, 2);

function upEnd(t) {
  const c = S.end;
  c.cam.style.transform = `scale(${endScale(t)})`;
  c.glow.style.opacity = lerp(1, 0.3, tw(t, 33.0, 1.4));
  slideWords(c.word, t, 33.12, 0.045, 0.85);
  slideWords(c.tag, t, 33.6, 0.07, 0.8);
  const pp = E.outBack(prog(t, 33.95, 0.5));
  c.pill.style.opacity = prog(t, 33.95, 0.25);
  c.pill.style.transform = `scale(${0.85 + 0.15 * pp})`;
  c.pillDot.style.opacity = Math.floor(t * 2) % 2 ? 0.3 : 1;
}
