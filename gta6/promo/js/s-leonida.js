// Ouverture (le « VI » s'allume puis la caméra plonge dedans) et chapitre 01 : Leonida.
import { W, H, E, prog, clamp, lerp, tw, vie, el, vis, style, mesure, TEMPS, ressort, bump } from './outils.js';
import { img, plan, couvrir } from './medias.js';
import { fond, douche, halo, eclat, fuite } from './film.js';
import { dessinerMontage, flashCoupe, zoomExp } from './montage.js';
import { texte, reveler, largeur } from './ui.js';

const calque = document.createElement('canvas');
calque.width = W; calque.height = H;
const cx = calque.getContext('2d');

// Logo « VI » : 896 × 697 ; la barre du I occupe x 629–887. Le titre « grand theft auto »
// se pose à (226, 54) dans le logo complet.
export const VI = { w: 896, h: 697, iX: 758, iY: 348, titreX: 226, titreY: 54 };

export const IMPACT = 2.22; // premier coup de la chanson (trailer 2, 1:07.0)

// ───────────────────────────────────────── Ouverture + plongée [0, 5.55)
export const ouverture = {
  debut: 0, fin: mesure(3),
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.kicker = texte(this.r, 'Rockstar Games présente', 'mono', { x: 960, y: 880, ancre: 'centre' });
    this.kicker.style.letterSpacing = '.5em';
    this.bienvenue = texte(this.r, 'Bienvenue à', 'serif', { x: 120, y: 520 });
    this.bienvenue.style.fontSize = '84px';
    this.leonida = el('div', 'abs geant ombre', 'Leonida', this.r);
    Object.assign(this.leonida.style, { left: '112px', top: '600px', fontSize: '300px' });
    this.trait = el('div', 'abs', '', this.r);
    Object.assign(this.trait.style, { left: '120px', top: '880px', height: '8px', width: '520px', background: 'var(--vi-h)', transformOrigin: '0 50%', boxShadow: '0 0 24px rgba(255,151,69,.7)' });
  },
  film(ctx, t) {
    fond(ctx);
    const s = 600 / VI.h, w = VI.w * s, h = VI.h * s, x0 = 960 - w / 2, y0 = 540 - h / 2 - 20;
    const vi = img('logo/gta6-logo-calque-VI.png');
    if (t < IMPACT) {
      douche(ctx, 960, 0.2 + 0.5 * tw(t, 0, 1.6));
      if (!vi) return;
      // Le VI sort de l'ombre, une bande de lumière le balaie de gauche à droite.
      ctx.globalAlpha = 0.16 * tw(t, 0.2, 1.2);
      ctx.drawImage(vi, x0, y0, w, h);
      ctx.globalAlpha = 1;
      const bx = lerp(x0 - 300, x0 + w + 300, E.doux(prog(t, 0.55, 1.6)));
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'source-over';
      cx.drawImage(vi, x0, y0, w, h);
      cx.globalCompositeOperation = 'destination-in';
      const g = cx.createLinearGradient(bx - 260, 0, bx + 260, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g;
      cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = 'source-over';
      ctx.drawImage(calque, 0, 0);
      halo(ctx, bx, 540, 380, 'rgba(255,151,69,A)', 0.35 * bump(prog(t, 0.55, 1.6)));
      // Montée : le VI se gonfle d'un rien juste avant l'impact.
      return;
    }
    // Impact : le footage apparaît dans le VI, puis la caméra plonge dans la barre du I.
    const p = E.traversee(prog(t, 2.6, 1.1));
    const z = zoomExp(p, 1, 12);
    const fxp = x0 + VI.iX * s, fyp = y0 + VI.iY * s; // point visé
    const tx = lerp(fxp, 960, p), ty = lerp(fyp, 540, p);
    if (t < 3.7) {
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'source-over';
      couvrir(cx, plan('vc_aerien', t - IMPACT, { vitesse: 0.9 }), 0, 0, W, H, { zoom: 1.08 - 0.05 * p });
      cx.globalCompositeOperation = 'destination-in';
      if (vi) cx.drawImage(vi, tx + (x0 - fxp) * z, ty + (y0 - fyp) * z, w * z, h * z);
      cx.globalCompositeOperation = 'source-over';
      douche(ctx, 960, 0.5 * (1 - p));
      // Les couleurs du VI restent en surimpression puis s'effacent.
      if (vi) {
        ctx.globalAlpha = 0.9 * (1 - tw(t, IMPACT, 0.5));
        ctx.drawImage(vi, tx + (x0 - fxp) * z, ty + (y0 - fyp) * z, w * z, h * z);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(calque, 0, 0);
      eclat(ctx, 0.85 * (1 - tw(t, IMPACT, 0.35)));
      return;
    }
    // Plein cadre : Ocean Drive de nuit, le titre se pose.
    couvrir(ctx, plan('ocean_drive', t - 3.7, { vitesse: 0.85 }), 0, 0, W, H, { zoom: 1.12 - 0.06 * prog(t, 3.7, 1.85) });
    const v = ctx.createLinearGradient(0, 380, 0, H);
    v.addColorStop(0, 'rgba(20,2,31,0)'); v.addColorStop(1, 'rgba(20,2,31,.82)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    eclat(ctx, 0.5 * (1 - tw(t, 3.7, 0.3)));
  },
  ui(t) {
    vis(this.r, t < this.fin ? 1 : 0);
    if (t >= this.fin) return;
    reveler(this.kicker, t, 0.35, { pas: 0.09, t1: 2.0, d: 0.7 });
    reveler(this.bienvenue, t, 3.85, { pas: 0.1, t1: 5.15 });
    const p = largeur(this.leonida, t, 3.95, 1.2);
    const sortie = E.entree(prog(t, 5.2, 0.35));
    vis(this.leonida, clamp((t - 3.95) / 0.3) * (1 - sortie));
    style(this.leonida, 'transform', `translateY(${((1 - p) * 30 - sortie * 40).toFixed(1)}px)`);
    style(this.leonida, 'filter', sortie > 0.01 ? `blur(${(sortie * 16).toFixed(1)}px)` : 'none');
    const tr = E.sortie(prog(t, 4.35, 0.8));
    style(this.trait, 'transform', `scaleX(${(tr * (1 - sortie)).toFixed(4)})`);
  },
};

// ───────────────────────────────────────── 01 · Leonida [5.55, 16.65)
const B = mesure(1);
const L0 = mesure(3);
const SON = [ // plans plein cadre (les cases du triptyque sont à part)
  [L0, 'keys_aerien', { vitesse: 0.75, derive: -60, pousse: 0.07 }],
  [L0 + B, 'marais', { vitesse: 0.8 }],
  [L0 + B + 2 * TEMPS, 'flamants', { vitesse: 0.8 }],
  [L0 + 2 * B, 'vc_aerien', { vitesse: 0.7, derive: 50 }],
  [L0 + 3 * B, 'triptyque'],
  [L0 + 4 * B, 'jetski', { vitesse: 0.85, pousse: 0.04 }],
  [L0 + 5 * B, 'rue_jour', { vitesse: 1 }],
  [L0 + 5 * B + TEMPS, 'horsbord', { vitesse: 1 }],
  [L0 + 5 * B + 2 * TEMPS, 'moto_avion', { vitesse: 1, depart: 0.4 }],
  [L0 + 5 * B + 3 * TEMPS, 'helico2', { vitesse: 1 }],
];
const REGIONS = [
  { t: L0, n: '01', nom: 'Leonida Keys', sous: 'les îles du Sud' },
  { t: L0 + B, n: '02', nom: 'Grassrivers', sous: 'les marais' },
  { t: L0 + 2 * B, n: '03', nom: 'Vice City', sous: 'la ville néon' },
];
const TRIPTYQUE = [['plage', 'Soleil.'], ['vice', 'Excès.'], ['ocean_drive', 'Vice.']];

export const leonida = {
  debut: L0, fin: mesure(9),
  coupes: SON.map((s) => s[0]),
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.cartes = REGIONS.map((g) => {
      const c = el('div', 'abs', '', this.r);
      Object.assign(c.style, { left: '120px', top: '690px' });
      c.k = el('div', 'mono', `Région ${g.n} <span style="color:var(--orange)">●</span> Leonida`, c);
      c.nom = el('div', 'geant ombre', g.nom, c);
      Object.assign(c.nom.style, { fontSize: '168px', marginTop: '14px' });
      c.sous = el('div', 'serif', g.sous, c);
      Object.assign(c.sous.style, { fontSize: '54px', marginTop: '8px', color: 'var(--creme)' });
      return c;
    });
    this.mots = TRIPTYQUE.map(([, m], i) => {
      const d = el('div', 'abs geant ombre', m, this.r);
      Object.assign(d.style, { top: '820px', fontSize: '118px', width: '560px', textAlign: 'center', left: `${150 + i * 560}px` });
      return d;
    });
    this.seulement = texte(this.r, 'Seulement|<span class="serif" style="text-transform:none;font-size:.6em">à</span> <span class="degrade">Leonida</span>', 'geant ombre', { x: 120, y: 520 });
    this.seulement.style.fontSize = '210px';
    this.only = texte(this.r, '« Only in Leonida »', 'mono', { x: 126, y: 940 });
    // Bande horizontale des régions officielles (défilement horizontal).
    this.bande = el('div', 'abs geant', '', this.r);
    Object.assign(this.bande.style, { top: '470px', left: '0', whiteSpace: 'nowrap', fontSize: '150px', fontStretch: '70%' });
    const noms = ['Vice City', 'Leonida Keys', 'Grassrivers', 'Port Gellhorn', 'Ambrosia', 'Mount Kalaga'];
    this.bande.innerHTML = [...noms, ...noms].map((n, i) => `<span style="${i % 2 ? '-webkit-text-stroke:2px var(--creme);color:transparent' : ''}">${n}</span>`).join('<span style="color:var(--orange)"> ✦ </span>');
  },
  film(ctx, t) {
    if (t >= L0 + 3 * B && t < L0 + 4 * B) return this.triptyque(ctx, t);
    dessinerMontage(ctx, SON, t);
    // Voile bas pour la lisibilité des cartes de région.
    if (t < L0 + 3 * B) {
      const g = ctx.createLinearGradient(0, 520, 0, H);
      g.addColorStop(0, 'rgba(20,2,31,0)'); g.addColorStop(1, 'rgba(20,2,31,.78)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (t >= L0 + 4 * B && t < L0 + 5 * B) {
      const g = ctx.createLinearGradient(0, 0, 1100, 0);
      g.addColorStop(0, 'rgba(20,2,31,.7)'); g.addColorStop(1, 'rgba(20,2,31,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (t >= L0 + 5 * B) { ctx.fillStyle = 'rgba(20,2,31,.35)'; ctx.fillRect(0, 0, W, H); }
    eclat(ctx, 0.35 * flashCoupe(SON, t));
    fuite(ctx, prog(t, L0 + 2 * B - 0.5, 1.2), 0.5);
  },
  // Trois panneaux inclinés entrent en cascade (défilement horizontal + cascade).
  triptyque(ctx, t) {
    fond(ctx);
    const t0 = L0 + 3 * B;
    douche(ctx, 960, 0.5);
    TRIPTYQUE.forEach(([id], i) => {
      const a = ressort(t - t0 - i * 0.12, 120, 18);
      const x = 150 + i * 560 + (1 - a) * 900, w = 520, y = 120, h = 660, d = 70;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + d, y); ctx.lineTo(x + w + d, y); ctx.lineTo(x + w - d, y + h); ctx.lineTo(x - d, y + h); ctx.closePath();
      ctx.clip();
      couvrir(ctx, plan(id, t - t0, { vitesse: 0.8 }), x - d, y, w + 2 * d, h, { zoom: 1.15 - 0.08 * prog(t, t0, B), fx: 0.5 });
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + d, y); ctx.lineTo(x + w + d, y); ctx.lineTo(x + w - d, y + h); ctx.lineTo(x - d, y + h); ctx.closePath();
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,244,232,${0.5 * clamp(a)})`; ctx.stroke();
      ctx.restore();
    });
    eclat(ctx, 0.3 * (1 - tw(t, t0, 0.25)));
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    REGIONS.forEach((g, i) => {
      const c = this.cartes[i], t0 = g.t + 0.12, t1 = g.t + B;
      const o = vie(t, t0, t1, 0.5);
      vis(c, o);
      if (o <= 0) return;
      // Parallaxe : la carte glisse plus vite que le footage.
      const p = prog(t, g.t, B);
      style(c, 'transform', `translateX(${(-90 * p + (1 - E.sortie(prog(t, t0, 0.6))) * 60).toFixed(1)}px)`);
      style(c.nom, 'fontVariationSettings', `"wdth" ${lerp(110, 62, E.sortie(prog(t, t0, 0.9))).toFixed(1)}, "wght" 900`);
      style(c.sous, 'opacity', E.sortie(prog(t, t0 + 0.25, 0.5)).toFixed(3));
    });
    const t3 = L0 + 3 * B;
    this.mots.forEach((m, i) => {
      const o = vie(t, t3 + 0.35 + i * 0.12, t3 + B, 0.5);
      vis(m, o);
      style(m, 'transform', `translateY(${((1 - E.sortie(prog(t, t3 + 0.35 + i * 0.12, 0.5))) * 50).toFixed(1)}px)`);
    });
    const t4 = L0 + 4 * B;
    reveler(this.seulement, t, t4 + 0.15, { pas: 0.12, t1: t4 + B - 0.3, monte: 60 });
    reveler(this.only, t, t4 + 0.6, { pas: 0.1, t1: t4 + B - 0.3 });
    const t5 = L0 + 5 * B;
    const ob = vie(t, t5, this.fin, 0.25);
    vis(this.bande, ob);
    style(this.bande, 'transform', `translateX(${(-200 - 1400 * prog(t, t5, B)).toFixed(1)}px)`);
  },
};
