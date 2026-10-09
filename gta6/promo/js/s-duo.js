// 02 · Lucia & Jason (mosaïque épinglée, portraits) et 03 · Les visages (carrousel aimanté).
import { W, H, E, prog, clamp, lerp, tw, vie, el, vis, style, mesure, TEMPS, ressort, setText } from './outils.js';
import { img, plan, couvrir, dureePlan } from './medias.js';
import { fond, douche, halo, eclat, liseré, biais, flouRapide } from './film.js';
import { dessinerMontage, flashCoupe, zoomExp } from './montage.js';
import { texte, reveler, largeur } from './ui.js';

const B = mesure(1);
const D0 = mesure(9); // 16,65

// Mosaïque façon jaquette : 9 cases inclinées, le logo au centre.
const CASES = [
  { id: 'lucia_pose', x: 96, y: 96, w: 560, h: 280 },
  { id: 'jetski', x: 680, y: 96, w: 560, h: 280 },
  { id: 'helico', x: 1264, y: 96, w: 560, h: 280 },
  { id: 'club_bleu', x: 96, y: 400, w: 560, h: 280 },
  { id: null, x: 680, y: 400, w: 560, h: 280 },
  { id: 'jason_volant', x: 1264, y: 400, w: 560, h: 280 },
  { id: 'explosion', x: 96, y: 704, w: 560, h: 280 },
  { id: 'quad', x: 680, y: 704, w: 560, h: 280 },
  { id: 'duo_marche', x: 1264, y: 704, w: 560, h: 280 },
];
const ORDRE = [4, 0, 2, 6, 8, 1, 3, 5, 7]; // le logo d'abord, puis les coins, puis les côtés
const ZOOM_T = D0 + 1.5 * B; // la caméra plonge dans la case de Lucia

const DUO = [
  [D0 + 4 * B, 'bar_duo', { vitesse: 0.8 }],
  [D0 + 4 * B + 2 * TEMPS, 'duo_marche', { vitesse: 0.8 }],
  [D0 + 5 * B, 'baiser', { vitesse: 0.8 }],
  [D0 + 5 * B + 2 * TEMPS, 'duo_voiture', { vitesse: 0.9 }],
];

export const duo = {
  debut: D0, fin: mesure(15),
  coupes: [D0, D0 + 2 * B, D0 + 3 * B, ...DUO.map((d) => d[0])],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.titre = texte(this.r, 'Lucia|<span class="serif" style="text-transform:none;font-size:.7em;color:var(--orange)">&amp;</span> Jason', 'geant ombre', { x: 960, y: 418, ancre: 'centre' });
    this.titre.style.fontSize = '112px';
    this.titre.style.textAlign = 'center';
    this.persos = [
      { n: '01', p: 'Lucia', nom: 'Caminos', d: 'Tout juste sortie de prison,|elle veut une vie meilleure.' },
      { n: '02', p: 'Jason', nom: 'Duval', d: 'Ancien militaire,|il travaille pour des trafiquants.' },
    ].map((q) => {
      const c = el('div', 'abs', '', this.r);
      Object.assign(c.style, { left: '120px', top: '500px' });
      c.k = el('div', 'mono', `Personnage ${q.n} <span style="color:var(--orange)">●</span> protagoniste`, c);
      c.p = el('div', 'geant ombre', q.p, c);
      Object.assign(c.p.style, { fontSize: '230px', marginTop: '10px' });
      c.nom = el('div', 'geant', q.nom, c);
      Object.assign(c.nom.style, { fontSize: '110px', marginTop: '-6px', webkitTextStroke: '2px var(--creme)', color: 'transparent' });
      c.d = texte(this.r, q.d.replace('|', ' '), 'serif', { x: 126, y: 905 });
      c.d.style.fontSize = '42px';
      return c;
    });
    this.deux = texte(this.r, 'Deux histoires.', 'serif', { x: 960, y: 430, ancre: 'centre' });
    this.deux.style.fontSize = '150px';
    this.destin = texte(this.r, 'Un seul <span class="degrade">destin.</span>', 'serif', { x: 960, y: 430, ancre: 'centre' });
    this.destin.style.fontSize = '150px';
  },
  film(ctx, t) {
    if (t < D0 + 2 * B) return this.mosaique(ctx, t);
    if (t < D0 + 4 * B) {
      const lucia = t < D0 + 3 * B, t0 = lucia ? D0 + 2 * B : D0 + 3 * B;
      const id = lucia ? 'perso_lucia' : 'perso_jason';
      const v = dureePlan(id) / (B + 0.05);
      couvrir(ctx, plan(id, t - t0, { vitesse: v }), 0, 0, W, H, { zoom: 1.04 + 0.05 * prog(t, t0, B), fx: lucia ? 0.62 : 0.5 });
      const g = ctx.createLinearGradient(0, 0, 1200, 0);
      g.addColorStop(0, 'rgba(20,2,31,.82)'); g.addColorStop(1, 'rgba(20,2,31,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      eclat(ctx, 0.45 * (1 - tw(t, t0, 0.3)));
      return;
    }
    dessinerMontage(ctx, DUO, t, { punch: 0.05 });
    ctx.fillStyle = 'rgba(20,2,31,.45)'; ctx.fillRect(0, 0, W, H);
    eclat(ctx, 0.3 * flashCoupe(DUO, t));
  },
  // La mosaïque reste épinglée pendant que ses cases s'allument une à une, puis on plonge dans Lucia.
  mosaique(ctx, t) {
    fond(ctx);
    douche(ctx, 960, 0.55);
    const zp = E.traversee(prog(t, ZOOM_T, 1.3));
    const c0 = CASES[0];
    const fx = c0.x + c0.w / 2, fy = c0.y + c0.h / 2, z = zoomExp(zp, 1, 3.6);
    ctx.save();
    ctx.translate(lerp(fx, 960, zp), lerp(fy, 540, zp));
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
    ORDRE.forEach((k, rang) => {
      const c = CASES[k];
      const t0 = D0 + 0.1 + rang * 0.06 * 2;
      const a = ressort(t - t0, 140, 20);
      if (t < t0) return;
      // Parallaxe : chaque case dérive à sa propre vitesse.
      const dz = 1 + 0.08 * ((k * 37) % 5) / 5;
      const dx = (t - D0) * 10 * (dz - 1) * 10 * (k % 2 ? 1 : -1);
      const s = lerp(0.86, 1, a);
      ctx.save();
      ctx.translate(c.x + c.w / 2 + dx, c.y + c.h / 2);
      ctx.scale(s, s);
      ctx.globalAlpha = clamp((t - t0) / 0.2);
      biais(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 0.18);
      ctx.save();
      ctx.clip();
      if (c.id) couvrir(ctx, plan(c.id, t - t0, { vitesse: 0.7, boucle: true }), -c.w / 2 - 40, -c.h / 2, c.w + 80, c.h, { zoom: 1.05 });
      else {
        ctx.fillStyle = '#1D002E'; ctx.fillRect(-c.w / 2 - 60, -c.h / 2, c.w + 120, c.h);
        const g = ctx.createRadialGradient(0, c.h / 2, 0, 0, c.h / 2, c.w * 0.8);
        g.addColorStop(0, 'rgba(226,87,144,.55)'); g.addColorStop(0.5, 'rgba(154,57,187,.25)'); g.addColorStop(1, 'rgba(63,69,187,0)');
        ctx.fillStyle = g; ctx.fillRect(-c.w / 2 - 60, -c.h / 2, c.w + 120, c.h);
      }
      ctx.restore();
      biais(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 0.18);
      liseré(ctx, 2 * (c.w + c.h), (t - t0) * 0.45 + rang * 0.11, '255,244,232', 2.5);
      ctx.restore();
    });
    ctx.restore();
    eclat(ctx, 0.25 * (1 - tw(t, D0, 0.3)));
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    // Le titre « Lucia & Jason » sur la case du logo, avant la plongée.
    reveler(this.titre, t, D0 + 0.55, { pas: 0.12, t1: ZOOM_T - 0.15, monte: 30 });
    style(this.titre, 'filter', 'drop-shadow(0 10px 40px rgba(20,2,31,.9))');
    this.persos.forEach((c, i) => {
      const t0 = D0 + (2 + i) * B, t1 = t0 + B;
      const o = vie(t, t0 + 0.08, t1, 0.45);
      vis(c, o);
      if (o > 0) {
        largeur(c.p, t, t0 + 0.08, 0.9);
        style(c, 'transform', `translateX(${(-60 * prog(t, t0, B)).toFixed(1)}px)`);
        style(c.nom, 'opacity', E.sortie(prog(t, t0 + 0.3, 0.5)).toFixed(3));
      }
      reveler(c.d, t, t0 + 0.45, { pas: 0.05, t1: t1 - 0.2 });
    });
    const t4 = D0 + 4 * B;
    reveler(this.deux, t, t4 + 0.15, { pas: 0.14, t1: t4 + B - 0.1, monte: 30 });
    reveler(this.destin, t, t4 + B + 0.05, { pas: 0.14, t1: t4 + 2 * B - 0.25, monte: 30 });
  },
};

// ───────────────────────────────────────── 03 · Les visages [27.75, 35.15)
const V0 = mesure(15);
const VISAGES = [
  { id: 'perso_cal', nom: 'Cal Hampton', role: 'l’ami de Jason, branché sur les garde-côtes' },
  { id: 'perso_boobie', nom: 'Boobie Ike', role: 'immobilier, club et studio à Vice City' },
  { id: 'perso_drequan', nom: 'Dre’Quan Priest', role: 'producteur, fondateur d’Only Raw Records' },
  { id: 'perso_real', nom: 'Real Dimez', role: 'le duo rap de Bae-Luxe et Roxy' },
  { id: 'perso_raul', nom: 'Raul Bautista', role: 'braqueur de banques' },
  { id: 'perso_brian', nom: 'Brian Heder', role: 'trafiquant des Keys, trois épouses' },
];
const SNAP0 = V0 + 2 * TEMPS, PAS = 2 * TEMPS, ECART = 600;
const posCarrousel = (t) => VISAGES.reduce((s, _, i) => (i ? s + ressort(t - (SNAP0 + i * PAS), 190, 20) : s), 0);

export const visages = {
  debut: V0, fin: mesure(19),
  coupes: VISAGES.map((_, i) => SNAP0 + i * PAS),
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.titre = texte(this.r, 'Les visages|de <span class="degrade">Leonida</span>', 'geant ombre', { x: 960, y: 330, ancre: 'centre' });
    this.titre.style.fontSize = '170px';
    this.titre.style.textAlign = 'center';
    this.noms = VISAGES.map((v, i) => {
      const c = el('div', 'abs', '', this.r);
      Object.assign(c.style, { left: '960px', top: '790px', textAlign: 'center', transform: 'translateX(-50%)', width: '1200px' });
      c.k = el('div', 'mono', `${String(i + 1).padStart(2, '0')} / 06`, c);
      c.nom = el('div', 'geant ombre', v.nom, c);
      Object.assign(c.nom.style, { fontSize: '96px', marginTop: '8px' });
      c.sousTitre = el('div', 'serif', v.role, c);
      Object.assign(c.sousTitre.style, { fontSize: '40px', color: 'var(--brume)' });
      return c;
    });
  },
  film(ctx, t) {
    fond(ctx);
    const pos = posCarrousel(t);
    const actif = Math.round(clamp(pos, 0, VISAGES.length - 1));
    // Ambiance : le portrait actif, flou et sombre, en fond.
    flouRapide(ctx, plan(VISAGES[actif].id, t, { vitesse: 0.6, boucle: true }), 0.35);
    douche(ctx, 960, 0.6);
    const entree = E.sortie(prog(t, V0 + 0.75, 0.9)), sortie = E.entree(prog(t, this.fin - 0.5, 0.5));
    VISAGES.forEach((v, i) => {
      const d = i - pos;
      const x = 960 + d * ECART + (1 - entree) * 1400 - sortie * 1600;
      if (x < -400 || x > W + 400) return;
      const proche = clamp(1 - Math.abs(d));
      const s = lerp(0.78, 1, proche), w = 470 * s, h = 620 * s, y = 430 - h / 2 - 30 * proche;
      ctx.save();
      ctx.globalAlpha = lerp(0.45, 1, proche);
      ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, 26); ctx.clip();
      couvrir(ctx, plan(v.id, t - (SNAP0 + i * PAS) + 0.6, { vitesse: 0.75, boucle: true }), x - w / 2, y, w, h, { zoom: 1.02 });
      ctx.fillStyle = `rgba(20,2,31,${0.55 * (1 - proche)})`; ctx.fillRect(x - w / 2, y, w, h);
      ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, h, 26);
      if (proche > 0.5) liseré(ctx, 2 * (w + h), (t - SNAP0) * 0.6, '255,244,232', 3);
      else { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,244,232,.18)'; ctx.stroke(); }
      ctx.restore();
      if (proche > 0.5) halo(ctx, x, y + h, 420, 'rgba(255,119,92,A)', 0.25 * proche);
    });
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    reveler(this.titre, t, V0 + 0.05, { pas: 0.1, t1: V0 + 0.85 });
    const pos = posCarrousel(t);
    this.noms.forEach((c, i) => {
      const ta = i ? SNAP0 + i * PAS : V0 + 1.2;
      const o = clamp(1 - Math.abs(i - pos) * 2.2) * clamp((t - ta + 0.05) / 0.25) * (1 - E.entree(prog(t, this.fin - 0.45, 0.4)));
      vis(c, o);
      if (o > 0) {
        style(c, 'transform', `translateX(calc(-50% + ${((i - pos) * -220).toFixed(1)}px))`);
        style(c.nom, 'fontVariationSettings', `"wdth" ${lerp(100, 62, E.sortie(prog(t, ta, 0.6))).toFixed(1)}, "wght" 900`);
      }
    });
  },
};
