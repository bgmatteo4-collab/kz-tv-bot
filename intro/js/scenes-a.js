// Ouverture, cartes de chapitre, chapitre 1 (lancement), chapitre 2 (destination).
'use strict';

// ───────────── Ouverture : la définition (0 → 3 s)
function upOpen(t) {
  S.opGrid.style.opacity = tw(t, 0.05, 0.9, E.inOut);
  slideWords(S.opL, t, 0.72, 0.035, 0.8);
  const pp = tw(t, 1.0, 0.5);
  S.opPos.style.opacity = pp;
  S.opPos.style.transform = `translateX(${(1 - pp) * -14}px)`;
  S.opRule.style.transform = `scaleX(${tw(t, 0.95, 0.7, E.inOut)})`;
  slideWords(S.opW1, t, 1.15, 0.03, 0.7);
  slideWords(S.opW2, t, 1.5, 0.03, 0.7);
  S.opN1.style.opacity = tw(t, 1.1, 0.4);
  S.opN2.style.opacity = tw(t, 1.45, 0.4);
  const x = E.in(prog(t, 2.7, 0.28));
  S.opDef.style.transform = `translateY(${-x * 36}px)`;
  S.opDef.style.opacity = 1 - x;
  S.opDef.style.filter = x > 0.01 ? `blur(${x * 10}px)` : 'none';
}

// ───────────── Cartes de chapitre (1 s chacune), sortie en « push » vers le haut
const CHAPTER_SCENES = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'];
function upCards(t) {
  S.cards.forEach((c, i) => {
    const u = t - CARD_AT[i];
    const on = u >= 0 && u < 1;
    c.el.classList.toggle('on', on);
    const scene = S.scenes[CHAPTER_SCENES[i]];
    const x = E.inOut(prog(u, 0.76, 0.24));
    scene.style.transform = u >= 0.76 && u < 1 ? `translateY(${(1 - x) * 240}px)` : 'none';
    if (!on) return;
    c.lab.forEach((ch, j) => {
      const p = tw(u, 0.02 + j * 0.022, 0.4);
      ch.style.opacity = p;
      ch.style.transform = `translateY(${(1 - p) * 14}px)`;
    });
    slideWords(c.ttl, u, 0.06, 0.03, 0.62);
    c.rule.style.transform = `scaleX(${tw(u, 0.22, 0.5, E.inOut)})`;
    c.el.style.transform = x ? `translateY(${-x * 1080}px)` : 'none';
  });
}

// ───────────── Chapitre 1 : KZ OS démarre, le site se présente (3 → 9 s)
const C1_WIN = { x: 905, y: 248, w: 870, h: 532 };
const c1Scale = (t) => 1 + 0.03 * E.inOut(prog(t, 3.8, 3.4));

function upCh1(t, f) {
  const c = S.c1;
  c.cam.style.transform = `scale(${c1Scale(t)})`;

  // Démarrage
  const iout = prog(t, 4.85, 0.2);
  c.icon.style.transform = `scale(${E.outBack(prog(t, 3.95, 0.45)) * (1 + iout * 0.1)})`;
  c.icon.style.opacity = 1 - iout;
  const np = tw(t, 4.12, 0.5);
  c.bname.style.opacity = np * (1 - iout);
  c.bname.style.transform = `translateY(${(1 - np) * 14}px)`;
  c.bstate.style.opacity = tw(t, 4.2, 0.5) * (1 - iout) * 0.9;
  c.barwrap.style.opacity = tw(t, 4.2, 0.3) * (1 - iout);
  const fill = E.out(prog(t, 4.25, 0.25)) * 0.42 + E.inOut(prog(t, 4.55, 0.27)) * 0.58;
  c.bar.style.transform = `scaleX(${fill})`;

  // La fenêtre naît de l'icône
  const wp = E.inOut(prog(t, 4.85, 0.62));
  const ws = c.win.style;
  ws.left = `${lerp(960 - 66, C1_WIN.x, wp)}px`;
  ws.top = `${lerp(470 - 66, C1_WIN.y, wp)}px`;
  ws.width = `${lerp(132, C1_WIN.w, wp)}px`;
  ws.height = `${lerp(132, C1_WIN.h, wp)}px`;
  ws.borderRadius = `${lerp(36, 22, wp)}px`;
  ws.opacity = prog(t, 4.83, 0.06);
  c.inner.style.opacity = tw(t, 5.25, 0.4);

  c.side.forEach((e, i) => {
    const p = tw(t, 5.35 + i * 0.05, 0.5);
    e.style.opacity = p;
    e.style.transform = `translateX(${(1 - p) * -10}px)`;
  });
  const pv = tw(t, 5.38, 0.7);
  c.prev.style.opacity = pv;
  c.prev.style.transform = `scale(${0.96 + 0.04 * pv})`;
  c.chat.forEach((b, i) => {
    const p = tw(t, 5.9 + i * 0.22, 0.5);
    b.style.transform = `scaleX(${p})`;
    b.style.opacity = p;
  });
  c.tiles.forEach((e, i) => rise(e, t, 5.45 + i * 0.08, 0.6));
  const rate = Math.round((6000 * tw(t, 5.6, 1.0, E.outCubic)) / 10) * 10;
  c.rate.textContent = `${rate.toLocaleString('fr-FR')} kb/s`;
  c.meters.forEach((segs, r) => {
    const on = tw(t, 5.7, 0.4);
    const lvl = (0.42 + 0.38 * noise1(t * 7.5, r * 13 + 1) + 0.12 * noise1(t * 21, r * 7 + 3)) * on;
    const lit = Math.round(lvl * segs.length);
    segs.forEach((s, i) => {
      s.style.background = i < lit ? (i < 20 ? '#5FA89C' : i < 26 ? '#F2C76E' : '#E3A83B') : 'rgba(201,209,209,.08)';
    });
  });
  c.chips.forEach((e, i) => { e.style.opacity = tw(t, 5.7 + i * 0.06, 0.5); });

  // Statut : hors ligne → prêt
  const ready = t >= 7.1;
  c.status.classList.toggle('ready', ready);
  c.stxt.textContent = ready ? scramble(`Prêt · ${CONFIG.heure}`, t, 7.1, f) : 'Hors ligne';

  // Titre façon page d'accueil
  rise(c.eye, t, 5.2, 0.6);
  slideWords(c.h, t, 5.32, 0.07, 0.9);
  c.ul.style.transform = `scaleX(${tw(t, 6.15, 0.55, E.inOut)})`;
  rise(c.cta1, t, 6.3, 0.6);
  const hv = tw(t, 8.05, 0.15, E.outCubic);
  const press = bump(prog(t, 8.3, 0.2));
  rise(c.cta2, t, 6.38, 0.6, 16, ` scale(${1 - 0.05 * press})`);
  c.cta2.style.background = `rgba(201,209,209,${0.12 * hv})`;
  c.cta2.style.borderColor = `rgba(201,209,209,${0.32 + 0.45 * hv})`;

  // Clic sur « Voir le planning » : le cercle ouvre le chapitre suivant
  const cp = camMap(P.c1Cta2, c1Scale(t));
  const r = 2300 * E.inOut(prog(t, 8.36, 0.6));
  c.circle.style.clipPath = `circle(${r}px at ${cp.x}px ${cp.y}px)`;
}

// ───────────── Chapitre 2 : les circuits temporels (9 → 15 s)
const SP0 = 11.55, SPD = 2.3, SPK = 2.2;
const speedAt = (t) => 88 * Math.pow(prog(t, SP0, SPD), SPK);
// Distance parcourue par les lignes de vitesse : intégrale de (v/88)².
function distAt(t) {
  const p = prog(t, SP0, SPD);
  return SPD * Math.pow(p, 2 * SPK + 1) / (2 * SPK + 1) + Math.max(0, t - SP0 - SPD);
}

function rowState(t, ton) {
  if (t < ton) return 'off';
  if (t < ton + 0.28) return 'flicker';
  if (t < ton + 0.62) return 'slot';
  return 'on';
}
function setPair(pair, value, st, t, ton, f, salt) {
  pair.forEach((polys, i) => {
    if (st === 'off') setSeg(polys, 'off');
    else if (st === 'flicker') setSeg(polys, 'flicker', f, salt + i, prog(t, ton, 0.28));
    else if (st === 'slot') setSeg(polys, Math.floor(h2(f >> 2, salt * 7 + i) * 10));
    else setSeg(polys, Number(value[i]));
  });
}

function upCh2(t, f) {
  const c = S.c2;
  const v = speedAt(t);
  const sh = 4.5 * Math.pow(clamp((v - 50) / 38), 2);
  const dx = (h2(f, 7) - 0.5) * 2 * sh, dy = (h2(f, 8) - 0.5) * 2 * sh;
  c.cam.style.transform = `translate(${dx * 0.4}px,${dy * 0.4}px) scale(${1 + 0.03 * E.inOut(prog(t, 9.8, 4.1))})`;

  // Colonne de gauche
  rise(c.eye, t, 9.95, 0.6);
  slideWords(c.h, t, 10.0, 0.07, 0.9);
  rise(c.sub, t, 10.55, 0.7);
  const jl = E.in(prog(t, 14.0, 0.24));
  c.left.style.transform = jl ? `translateX(${jl * 2600}px) scaleX(${1 + jl * 0.4})` : 'none';

  // Le panneau
  const pe = E.out(prog(t, 9.92, 0.8)), jp = E.in(prog(t, 13.95, 0.22));
  c.panel.style.opacity = prog(t, 9.92, 0.25);
  c.panel.style.transform = `translate(${dx + jp * 2600}px,${dy + (1 - pe) * 70}px) scale(${0.965 + 0.035 * pe}) scaleX(${1 + jp * 0.5})`;
  c.led.style.opacity = t > 10.2 && Math.floor(t * 4) % 2 ? 1 : 0.35;

  const ton = [10.35, 10.57, 10.79];
  const st = ton.map((x) => rowState(t, x));
  st.forEach((s, i) => {
    c.plates[i].style.opacity = s === 'off' ? 0.22 : s === 'flicker' ? (h2(f >> 1, i + 40) > 0.5 ? 1 : 0.3) : 1;
  });
  const [hh, mm] = CONFIG.heure.split(':');
  const [dh, dm] = CONFIG.duree.split(':');
  setPair(c.d0h, hh, st[0], t, ton[0], f, 1);
  setPair(c.d0m, mm, st[0], t, ton[0], f, 3);
  setPair(c.d1h, dh, st[1], t, ton[1], f, 5);
  setPair(c.d1m, dm, st[1], t, ton[1], f, 7);
  const vs = String(Math.floor(v)).padStart(2, '0');
  setPair(c.dv, vs, st[2], t, ton[2], f, 9);

  // Les jours : balayage puis jours de stream allumés
  const sweep = Math.floor(prog(t, ton[0] + 0.28, 0.34) * 8) - 1;
  c.days.forEach((d, i) => {
    let on;
    if (st[0] === 'off') on = false;
    else if (st[0] === 'flicker') on = h2(f >> 1, i + 60) < prog(t, ton[0], 0.28);
    else if (st[0] === 'slot') on = i === sweep;
    else on = CONFIG.jours.includes(i);
    d.style.color = on ? 'var(--gold)' : 'rgba(227,168,59,.16)';
    d.style.textShadow = on ? '0 0 14px rgba(227,168,59,.85)' : 'none';
    d.style.background = on ? 'rgba(227,168,59,.12)' : 'rgba(227,168,59,.03)';
  });
  c.colons.forEach((col, i) => {
    col.style.opacity = st[i] === 'on' ? (Math.floor(t * 2) % 2 ? 0.25 : 1) : st[i] === 'off' ? 0.08 : 0.6;
  });
  c.note.style.opacity = st[1] === 'off' ? 0.08 : st[1] === 'on' ? 1 : (h2(f >> 1, 77) > 0.5 ? 1 : 0.2);
  c.unit.style.opacity = st[2] === 'off' ? 0.08 : st[2] === 'on' ? 1 : (h2(f >> 1, 78) > 0.5 ? 1 : 0.2);

  // Vitesse : la ligne vire à l'or en approchant de 88
  const tone = mix('#9CCFC5', '#E3A83B', (v - 62) / 22);
  c.rows[2].style.setProperty('--tone', tone);
  const lit = st[2] === 'on' ? Math.round((v / 88) * 22) : 0;
  c.gauge.forEach((g, i) => {
    g.style.opacity = i < lit ? 1 : 0.1;
    g.style.color = i >= 17 && i < lit ? '#F2C76E' : '';
  });
  const flare = bump(prog(t, 13.82, 0.2));
  c.rows[2].style.filter = flare > 0.01 ? `brightness(${1 + flare})` : 'none';

  drawSpeed(c.ctx, t, v / 88);
  c.dark.style.opacity = tw(t, 14.05, 0.65, E.inOut);
}

function drawSpeed(ctx, t, vn) {
  ctx.clearRect(0, 0, W, H);
  if (vn <= 0.01 && t < SP0 + SPD) return;
  const d = distAt(t), fade = 1 - prog(t, 14.0, 0.4);
  ctx.lineCap = 'round';
  for (let i = 0; i < 70; i++) {
    const y = 120 + hash(i * 3 + 1) * (H - 240);
    const len = (120 + hash(i * 3 + 2) * 520) * (0.3 + vn);
    const base = 900 + hash(i * 3 + 3) * 2400;
    const span = W + 800;
    const x = W + 400 - ((d * base + hash(i * 7) * span * 3) % span);
    const a = vn * (0.06 + 0.22 * hash(i * 5)) * fade;
    if (a < 0.005) continue;
    const g = ctx.createLinearGradient(x, 0, x + len, 0);
    g.addColorStop(0, 'rgba(242,199,110,0)');
    g.addColorStop(1, `rgba(242,199,110,${a})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1 + hash(i * 11) * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
}
