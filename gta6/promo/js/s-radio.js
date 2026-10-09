// 07 · La radio (tuner aimanté, égaliseur qui suit la vraie musique, album) et le final.
import { W, H, E, prog, clamp, lerp, tw, vie, el, vis, style, mesure, TEMPS, ressort, bump, DUREE } from './outils.js';
import { img, plan, couvrir, contenir } from './medias.js';
import { fond, douche, halo, eclat, liseré, flouRapide, gradientVI } from './film.js';
import { texte, reveler, largeur, pastille, majPastille, compteur, majCompteur } from './ui.js';
import { VI } from './s-leonida.js';

const B = mesure(1);
const R0 = mesure(30); // 55,50

const STATIONS = [
  { logo: 'radio-cocoteo.png', genre: 'Latino', hotes: 'El Martillo & La Gata' },
  { logo: 'radio-country.png', genre: 'Country', hotes: 'MW & Delta Dawne' },
  { logo: 'radio-afrobank.png', genre: 'Amapiano · classiques africains', hotes: 'Burna & Palmsy' },
  { logo: 'radio-chamber.png', genre: 'Metal', hotes: 'DJ Kerry & DJ Tom' },
  { logo: 'radio-flash.png', genre: 'Pop', hotes: 'Robyn & Alex' },
  { logo: 'radio-dirtysouth.png', genre: 'Rap du Sud', hotes: 'Trick & Trina' },
];
const ST0 = R0 + B; // premier cran du tuner
const posTuner = (t) => STATIONS.reduce((s, _, i) => (i ? s + ressort(t - (ST0 + i * TEMPS), 260, 24) : s), 0);
const ARTISTES = 'Travis Scott · Yung Lean · Future · Metro Boomin’ · Morgan Wallen · Rauw Alejandro · Keith Richards · PinkPantheress · Fred again.. · Étienne de Crécy · CA7RIEL & Paco Amoroso';

export const radio = {
  debut: R0, fin: mesure(34),
  coupes: [R0, ...STATIONS.map((_, i) => ST0 + i * TEMPS), R0 + 2.5 * B],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.titre = texte(this.r, 'La radio|de <span class="degrade">Leonida</span>', 'geant ombre', { x: 120, y: 330 });
    this.titre.style.fontSize = '190px';
    this.k = pastille(this.r, '<b>8 OCT.</b> 6 stations dévoilées', '');
    this.sous = texte(this.r, 'et des podcasts à la demande, même à pied', 'serif', { x: 126, y: 720 });
    this.sous.style.fontSize = '48px';
    this.genre = STATIONS.map((s) => pastille(this.r, `<b>${s.genre}</b> ${s.hotes}`, ''));
    this.ecoute = pastille(this.r, '<b>▶ En écoute</b> Hot Together — The Pointer Sisters · trailer 2', 'petite');
    // Album.
    this.tAlbum = texte(this.r, 'Grand Theft Auto VI|<span class="degrade-h">The Album</span>', 'geant ombre', { x: 900, y: 190 });
    this.tAlbum.style.fontSize = '104px';
    this.nb = el('div', 'abs geant degrade', '', this.r);
    Object.assign(this.nb.style, { left: '896px', top: '410px', fontSize: '220px', fontStretch: '70%' });
    this.cptNb = compteur(this.nb, '99');
    this.nbL = texte(this.r, 'titres originaux', 'serif', { x: 1150, y: 520 });
    this.nbL.style.fontSize = '64px';
    this.sortie = pastille(this.r, '<b>19.11</b> Numérique, vinyle et CD', '');
    this.bande = el('div', 'abs mono', '', this.r);
    Object.assign(this.bande.style, { top: '965px', left: '0', whiteSpace: 'nowrap', fontSize: '26px', color: 'var(--creme)', letterSpacing: '.18em' });
    this.bande.innerHTML = (ARTISTES + ' · ').repeat(3);
  },
  film(ctx, t) {
    const t3 = R0 + 2.5 * B;
    if (t < ST0) {
      couvrir(ctx, img('officiel/radio-fond.jpg'), 0, 0, W, H, { zoom: 1.18 - 0.1 * prog(t, R0, B) });
      ctx.fillStyle = 'rgba(14,1,22,.55)'; ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 1300, 0);
      g.addColorStop(0, 'rgba(14,1,22,.8)'); g.addColorStop(1, 'rgba(14,1,22,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      eclat(ctx, 0.6 * (1 - tw(t, R0, 0.35)), '255,200,160');
      return;
    }
    if (t < t3) return this.tuner(ctx, t);
    // Album : la pochette vinyle sous la douche de lumière.
    fond(ctx, '#0B0112');
    douche(ctx, 520, 0.9, { largeur: 1000 });
    halo(ctx, 520, 900, 620, 'rgba(226,87,144,A)', 0.3);
    const a = ressort(t - t3 - 0.05, 120, 17);
    const im = img('officiel/candidats/c02.png');
    ctx.save();
    ctx.translate(500, 560 + (1 - clamp(a)) * 140);
    ctx.rotate(-0.05 + 0.02 * Math.sin((t - t3) * 1.4));
    ctx.scale(lerp(0.9, 1, clamp(a)), lerp(0.9, 1, clamp(a)));
    ctx.globalAlpha = clamp((t - t3) / 0.2);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 40;
    ctx.beginPath(); ctx.roundRect(-330, -330, 660, 660, 22); ctx.clip();
    if (im) ctx.drawImage(im, -330, -330, 660, 660);
    ctx.restore();
    eclat(ctx, 0.4 * (1 - tw(t, t3, 0.3)));
  },
  tuner(ctx, t) {
    fond(ctx, '#0B0112');
    flouRapide(ctx, img('officiel/radio-fond.jpg'), 0.28);
    douche(ctx, 960, 0.85, { largeur: 1300 });
    const pos = posTuner(t), k = Math.round(clamp(pos, 0, 5));
    // Échelle de fréquences qui défile et se cale sur chaque station.
    const y = 800, pas = 34, dec = pos * 300;
    ctx.save();
    for (let i = -40; i < 120; i++) {
      const x = 960 + i * pas - dec + 300 * 0;
      if (x < 60 || x > W - 60) continue;
      const fort = i % 5 === 0;
      const d = Math.abs(x - 960) / 900;
      ctx.strokeStyle = `rgba(255,244,232,${(fort ? 0.7 : 0.3) * (1 - d)})`;
      ctx.lineWidth = fort ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - (fort ? 34 : 18)); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
    // Aiguille.
    ctx.save();
    ctx.shadowColor = 'rgba(255,119,92,1)'; ctx.shadowBlur = 24;
    ctx.fillStyle = '#FF775C'; ctx.fillRect(958, y - 70, 4, 96);
    ctx.restore();
    halo(ctx, 960, y - 20, 160, 'rgba(255,119,92,A)', 0.6);
    // Logo de la station : il arrive avec un ressort à chaque cran.
    STATIONS.forEach((s, i) => {
      const d = i - pos;
      if (Math.abs(d) > 1.2) return;
      const im = img('officiel/' + s.logo);
      const a = clamp(1 - Math.abs(d));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(960 + d * 700, 400);
      const sc = lerp(0.7, 1, a);
      ctx.scale(sc, sc);
      // Chaque logo sur sa plaque claire (ils sont dessinés pour un fond clair).
      ctx.save();
      ctx.shadowColor = 'rgba(255,151,69,.55)'; ctx.shadowBlur = 70;
      ctx.fillStyle = '#FFF4E8';
      ctx.beginPath(); ctx.roundRect(-440, -250, 880, 500, 44); ctx.fill();
      ctx.restore();
      contenir(ctx, im, 0, 0, 740, 380);
      ctx.restore();
    });
    this.egaliseur(ctx, t, 0.9);
    eclat(ctx, 0.18 * (1 - tw(t, ST0 + k * TEMPS, 0.2)));
  },
  // Égaliseur : 40 barres qui suivent le spectre réel de la bande-son (eq.json).
  egaliseur(ctx, t, force) {
    const eq = window.__eq;
    if (!eq) return;
    const f = clamp(Math.round(t * eq.fps), 0, eq.data.length - 1), v = eq.data[f], n = v.length;
    const larg = 1500 / n, x0 = 960 - 750;
    ctx.save();
    ctx.globalAlpha = force;
    ctx.fillStyle = gradientVI(ctx, 0, 1030, 0, 860);
    for (let i = 0; i < n; i++) {
      const h = 6 + v[i] * 150;
      ctx.beginPath(); ctx.roundRect(x0 + i * larg + 4, 1030 - h, larg - 8, h, 4); ctx.fill();
    }
    ctx.restore();
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    const t3 = R0 + 2.5 * B;
    reveler(this.titre, t, R0 + 0.1, { pas: 0.1, t1: ST0 - 0.45 });
    majPastille(this.k, t, R0 + 0.45, { x: 126, y: 260, ancre: 'gauche', t1: ST0 - 0.2 });
    reveler(this.sous, t, R0 + 0.7, { pas: 0.04, t1: ST0 - 0.45 });
    const pos = posTuner(t);
    this.genre.forEach((p, i) => {
      const ta = ST0 + i * TEMPS;
      const actif = t >= ta && (i === 5 || t < ta + TEMPS);
      if (!actif || t >= t3 - 0.15) { vis(p, 0); return; }
      majPastille(p, t, ta + 0.05, { x: 960, y: 690, t1: i === 5 ? t3 - 0.3 : null });
    });
    void pos;
    majPastille(this.ecoute, t, R0 + 0.8, { x: 1824, y: 140, ancre: 'droite', t1: this.fin - 0.3 });
    reveler(this.tAlbum, t, t3 + 0.15, { pas: 0.09, t1: this.fin - 0.3 });
    const q = E.sortie(prog(t, t3 + 0.35, 1.0)), q2 = E.sortie(prog(t - 1 / 60, t3 + 0.35, 1.0));
    majCompteur(this.cptNb, 34 * q, 34 * (q - q2) * 60);
    vis(this.nb, clamp((t - t3 - 0.3) / 0.25) * (1 - E.entree(prog(t, this.fin - 0.3, 0.3))));
    reveler(this.nbL, t, t3 + 0.6, { pas: 0.06, t1: this.fin - 0.3 });
    majPastille(this.sortie, t, t3 + 0.8, { x: 900, y: 760, ancre: 'gauche', t1: this.fin - 0.3 });
    vis(this.bande, vie(t, t3 + 0.3, this.fin, 0.4) * 0.85);
    style(this.bande, 'transform', `translateX(${(-260 * (t - t3)).toFixed(1)}px)`);
  },
};

// ───────────────────────────────────────── Final [62.90, 75.50)
const F0 = mesure(34);
const lc = document.createElement('canvas');
lc.width = W; lc.height = H;
const lx = lc.getContext('2d');
const LOGO = F0 + 2.89;   // le coup du logo dans la musique (trailer 2, 2:36.47)
const DATE = LOGO + 1.8;

export const final = {
  debut: F0, fin: DUREE,
  coupes: [F0, LOGO],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.rdv = texte(this.r, 'Rendez-vous à Leonida.', 'serif', { x: 960, y: 820, ancre: 'centre' });
    this.rdv.style.fontSize = '96px';
    this.kDate = texte(this.r, 'Disponible le', 'mono', { x: 960, y: 560, ancre: 'centre' });
    this.date = el('div', 'abs geant degrade', '', this.r);
    Object.assign(this.date.style, { left: '960px', top: '600px', fontSize: '230px', transform: 'translateX(-50%)' });
    this.cpt = compteur(this.date, '99.99.9999');
    this.plat = pastille(this.r, '<b>PS5</b> PlayStation 5 · <b>XBOX</b> Series X|S', '');
    this.cta = pastille(this.r, 'Précommandez dès maintenant', 'grande');
    this.pegi = el('div', 'abs', '<b>18</b><span>PEGI</span>', this.r);
    Object.assign(this.pegi.style, { right: '96px', bottom: '84px', width: '74px', height: '90px', background: '#E2231A', color: '#fff', borderRadius: '6px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--titre)', lineHeight: '1' });
    this.pegi.firstChild.style.fontSize = '46px';
    this.pegi.lastChild.style.cssText = 'font-family:var(--mono);font-size:13px;letter-spacing:.1em;margin-top:4px';
    this.jm = el('div', 'abs', '', this.r);
    Object.assign(this.jm.style, { left: '96px', right: '96px', bottom: '58px', height: '3px', background: 'rgba(255,244,232,.14)', borderRadius: '2px' });
    this.jmB = el('i', '', '', this.jm);
    Object.assign(this.jmB.style, { position: 'absolute', left: '0', top: '0', bottom: '0', width: '100%', transformOrigin: '0 50%', background: 'var(--vi-h)', boxShadow: '0 0 14px rgba(255,151,69,.9)' });
    this.jmT = el('div', 'abs mono', 'J-41 avant la sortie', this.r);
    Object.assign(this.jmT.style, { left: '96px', bottom: '78px', color: 'var(--creme)' });
  },
  film(ctx, t) {
    const sombre = E.doux(prog(t, LOGO - 0.4, 0.8));
    const im = plan('couchant', t - F0, { vitesse: 0.62 });
    couvrir(ctx, im, 0, 0, W, H, { zoom: 1.04 + 0.08 * prog(t, F0, 4), fy: 0.6 });
    if (sombre > 0) {
      ctx.fillStyle = `rgba(14,1,22,${0.82 * sombre})`; ctx.fillRect(0, 0, W, H);
      flouRapide(ctx, im, 0.3 * sombre);
    }
    eclat(ctx, 0.5 * (1 - tw(t, F0, 0.35)));
    if (t < LOGO) return;
    // Le logo se construit : le VI frappe, le titre glisse, une bande de lumière le traverse.
    const monte = E.traversee(prog(t, DATE - 0.5, 0.8));
    const s0 = lerp(560, 340, monte) / VI.h;
    const a = ressort(t - LOGO, 150, 16), b = ressort(t - LOGO - 0.25, 150, 18);
    const s = s0 * lerp(1.25, 1, a);
    const cx = 960, cy = lerp(520, 300, monte);
    const vi = img('logo/gta6-logo-calque-VI.png'), ti = img('logo/gta6-logo-calque-grand-theft-auto.png');
    halo(ctx, cx, cy, 700, 'rgba(226,87,144,A)', 0.4 * clamp(a));
    lx.clearRect(0, 0, W, H);
    lx.globalCompositeOperation = 'source-over';
    lx.globalAlpha = clamp((t - LOGO) / 0.08);
    if (vi) lx.drawImage(vi, cx - (VI.w * s) / 2, cy - (VI.h * s) / 2, VI.w * s, VI.h * s);
    if (ti && t > LOGO + 0.25) {
      lx.globalAlpha = clamp((t - LOGO - 0.25) / 0.1);
      const x = cx - (VI.w * s) / 2 + VI.titreX * s + (1 - clamp(b)) * 160, y = cy - (VI.h * s) / 2 + VI.titreY * s;
      lx.drawImage(ti, x, y, 626 * s, 498 * s);
    }
    lx.globalAlpha = 1;
    // Bande de lumière sur le logo seul (même geste que l'ouverture : le film se referme sur lui-même).
    const p = prog(t, LOGO + 0.5, 1.2);
    if (p > 0 && p < 1) {
      const bx = lerp(cx - 600, cx + 600, E.doux(p));
      lx.globalCompositeOperation = 'source-atop';
      const g = lx.createLinearGradient(bx - 160, 0, bx + 160, 0);
      g.addColorStop(0, 'rgba(255,244,232,0)'); g.addColorStop(0.5, 'rgba(255,244,232,.7)'); g.addColorStop(1, 'rgba(255,244,232,0)');
      lx.fillStyle = g;
      lx.fillRect(0, 0, W, H);
      lx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(lc, 0, 0);
    eclat(ctx, 0.9 * (1 - tw(t, LOGO, 0.4)), '255,210,170');
    // Fondu au noir final.
    const n = E.doux(prog(t, DUREE - 0.9, 0.9));
    if (n > 0) { ctx.fillStyle = `rgba(0,0,0,${n})`; ctx.fillRect(0, 0, W, H); }
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    const noir = 1 - E.doux(prog(t, DUREE - 0.9, 0.9));
    style(this.r, 'opacity', noir.toFixed(3));
    reveler(this.rdv, t, F0 + 0.4, { pas: 0.12, t1: LOGO - 0.35, d: 0.8 });
    reveler(this.kDate, t, DATE, { pas: 0.06 });
    const q = E.sortie(prog(t, DATE, 1.3)), q2 = E.sortie(prog(t - 1 / 60, DATE, 1.3));
    majCompteur(this.cpt, 19112026 * q, 19112026 * (q - q2) * 60);
    vis(this.date, clamp((t - DATE) / 0.25));
    style(this.date, 'filter', 'drop-shadow(0 0 40px rgba(255,119,92,.45))');
    majPastille(this.plat, t, DATE + 0.9, { x: 960, y: 860 });
    majPastille(this.cta, t, DATE + 1.4, { x: 960, y: 952, tours: 0.7 });
    const pg = ressort(t - DATE - 1.9, 150, 18);
    vis(this.pegi, clamp((t - DATE - 1.9) / 0.2));
    style(this.pegi, 'transform', `scale(${lerp(0.8, 1, clamp(pg)).toFixed(4)})`);
    // Compte à rebours : 337 jours sur 378 depuis l'annonce de la date (6 novembre 2025).
    const jp = E.sortie(prog(t, DATE + 2.2, 1.6));
    vis(this.jm, clamp((t - DATE - 2.1) / 0.3));
    style(this.jmB, 'transform', `scaleX(${(jp * 337 / 378).toFixed(4)})`);
    vis(this.jmT, clamp((t - DATE - 2.4) / 0.3));
  },
};
