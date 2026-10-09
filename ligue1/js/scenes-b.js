// Scènes 4 à 7 : experts et magazines, grandes affiches, écrans et opérateurs,
// offres et appel à l'action.
'use strict';

const B = {};
const MOTIF = `#0B0B0B url("${IMG_DIR}ligue1plus/PATTERN_ILLUMINATION.webp") center / cover no-repeat`;

function construireB() {
  // 4 — mur des experts (carrousel 3D) et magazines
  $('s4').style.background = MOTIF;
  B.t4 = $('s4-title'); B.sub4 = $('s4-sub'); B.magt = $('s4-magtitle');
  B.mags = [$('s4-mag1'), $('s4-mag2')];
  B.wall = EXPERTS.map((x) => {
    const c = el('div', 'expert', $('s4-wall'), `<img src="${x.src}" alt=""><div class="nom">${x.nom}</div>`);
    c.style.left = '960px';
    return c;
  });

  // 5 — affiches : deux moitiés aux couleurs des clubs, coupées en diagonale
  B.cv5 = $('s5-cv'); B.c5 = B.cv5.getContext('2d');
  B.t5 = split($('s5-title'), 'letters'); B.kick5 = $('s5-kick');
  const coul = (c) => (c.clair ? '#111' : '#F7F7F6');
  B.affiches = AFFICHES.map(([a, b]) => {
    const ca = CLUBS[a], cb = CLUBS[b];
    const d = el('div', 'affiche', $('s5-affiches'),
      `<div class="half a" style="background:${ca.fond}"></div><div class="half b" style="background:${cb.fond}"></div>
       <img class="crest a" src="${IMG_DIR + ca.blason}" alt=""><img class="crest b" src="${IMG_DIR + cb.blason}" alt="">
       <div class="titre vs">VS</div>
       <div class="titre names"><span style="color:${coul(ca)}">${ca.nom}</span><span style="color:${coul(cb)}">${cb.nom}</span></div>`);
    return { el: d, ha: d.querySelector('.half.a'), hb: d.querySelector('.half.b'), ca: d.querySelector('.crest.a'), cb: d.querySelector('.crest.b'), vs: d.querySelector('.vs'), names: d.querySelector('.names') };
  });
  B.grid = $('s5-grid');
  B.minis = AFFICHES.map(([a, b], i) => {
    const ca = CLUBS[a], cb = CLUBS[b];
    const m = el('div', 'mini', B.grid,
      `<div class="half a" style="background:${ca.fond}"></div><div class="half b" style="background:${cb.fond}"></div>
       <img class="a" src="${IMG_DIR + ca.blason}" alt=""><img class="b" src="${IMG_DIR + cb.blason}" alt="">
       <div class="lab">${ca.nom} · ${cb.nom}</div>`);
    m.style.left = `${960 + (i - 2) * 340}px`;
    return m;
  });

  // 6 — écrans, opérateurs, diffuseurs
  $('s6').style.background = MOTIF;
  B.t6 = $('s6-title'); B.dev = $('s6-devices'); B.icons = [...$('s6-icons').children]; B.opt = $('s6-optitle');
  B.ops = OPERATEURS.map((o, i) => {
    const c = el('div', 'op', $('s6-ops'),
      `<div class="logo"><img src="${IMG_DIR + o.logo}" alt=""></div><div class="ch">Chaîne</div><div class="num">0</div>`);
    c.style.left = `${960 + (i - 1.5) * 410}px`;
    c.style.borderColor = o.couleur;
    c.style.boxShadow = `0 30px 70px rgba(0,0,0,.5), 0 0 40px ${o.couleur}33`;
    return { el: c, num: c.querySelector('.num'), chaine: o.chaine };
  });
  B.band = $('s6-band'); B.track = $('s6-track');
  for (let k = 0; k < 3; k++) for (const src of DIFFUSEURS) el('div', 'chip', B.track, `<img src="${IMG_DIR + src}" alt="">`);

  // 7 — offres
  B.cam7 = $('s7-cam'); B.t7 = $('s7-title'); B.sub7 = $('s7-sub');
  B.passes = PASS.map((p, i) => {
    const c = el('div', 'pass', $('s7-passes'),
      `<div class="tag">${p.nom}</div><div class="prix">${p.prix}</div><div class="ecr">${p.ecrans}</div>
       <div class="eng">${p.eng}</div><div class="dev">TV · PC · Console · Tablette · Mobile</div>${p.promo ? `<div class="promo">${p.promo}</div>` : ''}`);
    c.style.left = `${960 + (i - 2) * 352}px`;
    return { el: c, prix: c.querySelector('.prix') };
  });
  B.des = $('s7-des'); B.cta = $('s7-cta'); B.fine = $('s7-fine');
  B.final = $('s7-final'); B.c7 = $('s7-cv').getContext('2d');
  B.l1 = B.final.querySelector('.line1'); B.l2 = B.final.querySelector('.line2');
}

// ───────────── 4. Experts et magazines (19 → 26 s)
async function upS4(t) {
  $('s4').style.clipPath = tranche(prog(t, 19.0, 0.6));
  const out = 1 - prog(t, 22.9, 0.35);
  rise(B.t4, t, 19.3, 0.6, 30); B.t4.style.opacity *= out;
  rise(B.sub4, t, 19.6, 0.6, 20); B.sub4.style.opacity *= out;

  const o = 1.5 + (t - 19.2) * 2.0;
  B.wall.forEach((c, i) => {
    const th = (i - o) * 11;
    const vis = clamp((72 - Math.abs(th)) / 12) * tw(t, 19.35 + Math.abs(th) * 0.004, 0.6);
    const chute = E.in(prog(t, 22.85 + Math.abs(th) * 0.004, 0.45));
    const R = 2000, a = (th * Math.PI) / 180;
    c.style.opacity = vis * (1 - chute);
    c.style.transform = `translate3d(${R * Math.sin(a)}px, ${90 + (1 - tw(t, 19.35 + Math.abs(th) * 0.004, 0.6)) * 80 + chute * 700}px, ${R * (Math.cos(a) - 1)}px) rotateY(${th}deg)`;
  });

  rise(B.magt, t, 23.3, 0.6, 40);
  B.mags.forEach((m, k) => {
    const e = E.out(prog(t, 23.5 + k * 0.15, 0.8));
    m.style.opacity = prog(t, 23.5 + k * 0.15, 0.2);
    m.style.transform = `translateX(${(1 - e) * (k ? 900 : -900)}px) translateY(${Math.sin(t * 1.3 + k * 2) * 8}px) rotate(${(1 - e) * (k ? 8 : -8) + (k ? 1.2 : -1.2)}deg)`;
  });
}

// ───────────── 5. Les grandes affiches (26 → 32,6 s)
const AFF_T0 = 27.4, AFF_D = 0.76;
async function upS5(t) {
  const ctx = B.c5;
  if (t < 27.45) {
    const im = await plan('ol', t - 26.0, 0.5);
    ctx.clearRect(0, 0, W, H);
    couvrir(ctx, im, 0, 0, W, H, { zoom: 1.08 + 0.04 * prog(t, 26, 1.5), fy: 0.4 });
    ctx.fillStyle = 'rgba(8,8,8,.48)';
    ctx.fillRect(0, 0, W, H);
    B.cv5.style.opacity = 1;
  } else B.cv5.style.opacity = 0;
  slideWords(B.t5, t, 26.15, 0.025, 0.6, [27.15, 0.008, 0.25]);
  B.kick5.style.opacity = tw(t, 26.6, 0.5) * (1 - prog(t, 27.15, 0.2));

  B.affiches.forEach((a, i) => {
    const t0 = AFF_T0 + i * AFF_D, u = t - t0;
    const on = u >= 0 && u < AFF_D;
    a.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    const e = E.out(prog(u, 0, 0.32));
    a.ha.style.transform = `translateX(${(1 - e) * -1400}px)`;
    a.hb.style.transform = `translateX(${(1 - e) * 1400}px)`;
    const c = E.outBack(prog(u, 0.1, 0.36));
    a.ca.style.transform = `translateX(${-u * 30}px) scale(${c})`;
    a.cb.style.transform = `translateX(${u * 30}px) scale(${c})`;
    const v = E.out(prog(u, 0.16, 0.3));
    a.vs.style.opacity = v;
    a.vs.style.transform = `scale(${lerp(2.2, 1, v)})`;
    rise(a.names, u, 0.22, 0.35, 30);
  });

  const g = t >= AFF_T0 + AFFICHES.length * AFF_D;
  B.grid.style.display = g ? 'block' : 'none';
  if (g) B.minis.forEach((m, i) => {
    const s = E.outBack(prog(t, 31.2 + i * 0.07, 0.45));
    m.style.opacity = prog(t, 31.2 + i * 0.07, 0.15);
    m.style.transform = `scale(${s}) rotate(${(1 - s) * 10}deg)`;
  });
}

// ───────────── 6. Écrans, opérateurs, diffuseurs (32 → 38,45 s)
async function upS6(t) {
  $('s6').style.clipPath = tranche(prog(t, 32.0, 0.6));
  const out = E.in(prog(t, 34.6, 0.45));
  rise(B.t6, t, 32.3, 0.6, 40); B.t6.style.opacity *= 1 - out;
  const d = tw(t, 32.5, 0.8);
  B.dev.style.opacity = d * (1 - out);
  B.dev.style.transform = `translateY(${(1 - d) * 90 - out * 80 + Math.sin(t * 1.2) * 6}px) scale(${0.94 + 0.06 * d})`;
  B.icons.forEach((s, i) => { rise(s, t, 33.0 + i * 0.14, 0.45, 24); s.style.opacity *= 1 - out; });

  rise(B.opt, t, 35.0, 0.6, 40);
  B.ops.forEach((o, i) => {
    const e = E.out(prog(t, 35.2 + i * 0.12, 0.8));
    o.el.style.opacity = prog(t, 35.2 + i * 0.12, 0.2);
    o.el.style.transform = `perspective(1400px) translateY(${(1 - e) * 220}px) rotateX(${(1 - e) * 35}deg)`;
    setText(o.num, String(Math.round(o.chaine * E.out(prog(t, 35.45 + i * 0.12, 0.9)))));
  });
  B.band.style.opacity = tw(t, 35.8, 0.5);
  B.track.style.transform = `translateX(${-120 - (t - 35.8) * 260}px)`;
}

// ───────────── 7. Offres, clic sur S'abonner, logo (38,45 → 46 s)
const CLIC = 42.7;
async function upS7(t) {
  B.cam7.style.transform = `scale(${1 + 0.035 * prog(t, 38.5, 4.2)})`;
  rise(B.t7, t, 38.7, 0.6, 40);
  rise(B.sub7, t, 38.95, 0.6, 20);
  const k = tw(t, 40.7, 0.5);
  B.passes.forEach((p, i) => {
    const e = E.out(prog(t, 39.0 + i * 0.12, 0.7));
    const mis = i === 0 ? k : 0;
    p.el.style.opacity = prog(t, 39.0 + i * 0.12, 0.2) * (i === 0 ? 1 : 1 - 0.62 * k);
    p.el.style.transform = `translateY(${(1 - e) * 160 - mis * 26}px) rotate(${(1 - e) * (i - 2) * 6}deg) scale(${1 + mis * 0.09})`;
    p.el.style.boxShadow = mis > 0 ? `0 30px 70px rgba(0,0,0,.5), 0 0 ${70 * mis}px rgba(255,127,222,${0.55 * mis})` : '';
    p.el.style.borderColor = mis > 0 ? mix('#085FFF', '#FF7FDE', mis) : '';
    const s = E.outBack(prog(t, 39.35 + i * 0.12, 0.42));
    p.prix.style.transform = `translateX(-50%) rotate(-2deg) scale(${s})`;
  });
  rise(B.des, t, 41.0, 0.6, 30);
  const hv = tw(t, 42.4, 0.2), pr = bump(prog(t, CLIC, 0.22));
  rise(B.cta, t, 41.45, 0.6, 24, ` scale(${(1 + 0.04 * hv) * (1 - 0.07 * pr)})`);
  B.cta.style.background = mix('#085FFF', '#50AAFF', hv * 0.6);

  // Après le clic, le bleu envahit l'écran, puis l'animation officielle du logo.
  const fin = t >= CLIC;
  B.final.style.display = fin ? 'block' : 'none';
  if (fin) {
    const r = 2300 * E.inOut(prog(t, CLIC, 0.42));
    B.final.style.clipPath = `circle(${r}px at 960px 978px)`;
    const im = await plan('logo', Math.max(0, t - 43.0), 1);
    B.c7.fillStyle = '#085FFF';
    B.c7.fillRect(0, 0, W, H);
    if (t >= 43.0) couvrir(B.c7, im, 0, 0, W, H);
    rise(B.l1, t, 44.3, 0.6, 30);
    rise(B.l2, t, 44.6, 0.6, 20);
  }
  B.fine.style.opacity = tw(t, 44.8, 0.6);
}
