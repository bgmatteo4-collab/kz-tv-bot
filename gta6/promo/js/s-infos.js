// 04 · Le phénomène (graphique lumineux), 05 · Les éditions, 06 · La collection.
// Langage de la référence TikTok : fond noir, douche de lumière, éléments qui brillent,
// formes qui se transforment, compteurs qui défilent, mise au point qui glisse.
import { W, H, E, prog, clamp, lerp, tw, vie, el, vis, style, mesure, TEMPS, ressort, bump } from './outils.js';
import { img, plan, sticker, contenir, couvrir } from './medias.js';
import { fond, douche, halo, eclat, liseré, flouRapide, C } from './film.js';
import { texte, reveler, largeur, pastille, majPastille, compteur, majCompteur } from './ui.js';

const B = mesure(1);

// ───────────────────────────────────────── 04 · Le phénomène [35.15, 40.70)
const R0 = mesure(19);
const HAUT = 540; // hauteur 3D de la barre la plus haute
const BARRES = [
  { x: -270, v: 90.4, t: R0 + 0.55 },
  { x: 270, v: 475, t: R0 + 1.4 },
];

// Projection simple : lacet a, plongée b, caméra à distance D visant (0, 230, 0).
function projeteur(a, b) {
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), D = 1700, f = 1500;
  return (x, y, z) => {
    const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y1 = y - 230;
    const yc = y1 * cb + z1 * sb, zc = -y1 * sb + z1 * cb + D;
    return [960 + (f * x1) / zc, 640 - (f * yc) / zc, zc];
  };
}

function boite(ctx, P, x, z, l, h, remplir) {
  const s = l / 2;
  const c = [[-s, 0, -s], [s, 0, -s], [s, 0, s], [-s, 0, s], [-s, h, -s], [s, h, -s], [s, h, s], [-s, h, s]].map(([a, b, d]) => P(x + a, b, z + d));
  const faces = [[0, 1, 5, 4, 'avant'], [1, 2, 6, 5, 'cote'], [2, 3, 7, 6, 'arriere'], [3, 0, 4, 7, 'cote'], [4, 5, 6, 7, 'dessus']];
  faces.forEach(([a, b, e, d, nom]) => {
    const p = [c[a], c[b], c[e], c[d]];
    let aire = 0;
    for (let i = 0; i < 4; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % 4]; aire += x1 * y2 - x2 * y1; }
    if (aire >= 0) return; // face tournée vers l'arrière
    ctx.beginPath();
    p.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    remplir(nom, p);
  });
  return c;
}

export const records = {
  debut: R0, fin: mesure(22),
  coupes: [R0, BARRES[0].t, BARRES[1].t],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.compteur = el('div', 'abs geant degrade', '', this.r);
    Object.assign(this.compteur.style, { left: '960px', top: '120px', fontSize: '170px', transform: 'translateX(-50%)', fontStretch: '70%' });
    this.cpt = compteur(this.compteur, '999 999 999');
    this.legende = texte(this.r, 'vues en 24 heures <span style="color:var(--orange)">●</span> trailer 2, toutes plateformes', 'mono', { x: 960, y: 310, ancre: 'centre' });
    this.p1 = pastille(this.r, '<b>T1</b> Record Guinness · 90,4 M de vues YouTube en 24 h', 'petite');
    this.p2 = pastille(this.r, '<b>T2</b> 475 M de vues en 24 h', '');
  },
  film(ctx, t) {
    fond(ctx, '#0B0112');
    const sortie = E.entree(prog(t, this.fin - 0.55, 0.55));
    douche(ctx, 960, 0.75 * (1 - sortie * 0.5), { largeur: 1300 });
    const a = lerp(-0.42, -0.18, E.doux(prog(t, R0, B * 3))), b = 0.33;
    const P = projeteur(a, b);
    // Sol : grille qui s'éteint au loin (lignes « moyenne » façon tableau de bord).
    ctx.save();
    ctx.lineWidth = 1.2;
    for (let k = -6; k <= 6; k++) {
      const [x1, y1] = P(k * 110, 0, -500), [x2, y2] = P(k * 110, 0, 700);
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, 'rgba(255,244,232,.14)'); g.addColorStop(1, 'rgba(255,244,232,0)');
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    for (let k = -4; k <= 6; k++) {
      const [x1, y1] = P(-700, 0, k * 120), [x2, y2] = P(700, 0, k * 120);
      ctx.strokeStyle = `rgba(255,244,232,${0.12 * (1 - (k + 4) / 11)})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    ctx.restore();
    // Ligne pointillée au niveau du trailer 1.
    const h1 = HAUT * (90.4 / 475) * clamp(ressort(t - BARRES[0].t, 120, 16));
    if (h1 > 2) {
      const [x1, y1] = P(-620, h1, 0), [x2, y2] = P(620, h1, 0);
      ctx.save(); ctx.setLineDash([14, 12]); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,244,232,.55)';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    }
    BARRES.forEach((br, i) => {
      const r = ressort(t - br.t, 120, 16);
      const h = Math.max(2, HAUT * (br.v / 475) * r);
      const chaud = i === 1;
      const [bx, by] = P(br.x, h, 0), [fx, fy] = P(br.x, 0, 0);
      if (chaud) {
        // La barre du trailer 2 s'allume : cœur bleu, halo qui vire au corail puis à l'orange.
        const e = clamp(r);
        halo(ctx, bx, (by + fy) / 2, 520, 'rgba(255,119,92,A)', 0.55 * e);
        halo(ctx, bx, by, 300, 'rgba(255,151,69,A)', 0.7 * e);
        halo(ctx, fx, fy - 40, 360, 'rgba(63,69,187,A)', 0.6 * e);
      }
      ctx.save();
      if (chaud) { ctx.shadowColor = 'rgba(255,151,69,.9)'; ctx.shadowBlur = 50; }
      boite(ctx, P, br.x, 0, 190, h, (nom, p) => {
        if (chaud) {
          const g = ctx.createLinearGradient(0, fy, 0, by);
          g.addColorStop(0, '#5A62FF'); g.addColorStop(0.4, '#B04BD8'); g.addColorStop(0.7, '#FF6A8E'); g.addColorStop(1, '#FFC27A');
          ctx.fillStyle = nom === 'dessus' ? '#FFF1DE' : g;
          ctx.globalAlpha = nom === 'cote' ? 0.75 : 1;
        } else {
          const g = ctx.createLinearGradient(0, fy, 0, by);
          g.addColorStop(0, 'rgba(255,244,232,.18)'); g.addColorStop(1, 'rgba(255,244,232,.62)');
          ctx.fillStyle = nom === 'dessus' ? 'rgba(255,244,232,.85)' : g;
          ctx.globalAlpha = nom === 'cote' ? 0.6 : 0.9;
        }
        ctx.fill();
      });
      ctx.restore();
    });
    // Sortie : la lumière de la barre envahit l'image et devient la scène suivante.
    eclat(ctx, 0.9 * sortie, '255,200,160');
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    const t0 = BARRES[1].t, d = 1.6;
    const p = E.sortie(prog(t, t0, d)), p2 = E.sortie(prog(t - 1 / 60, t0, d));
    majCompteur(this.cpt, 475e6 * p, (475e6 * (p - p2)) * 60);
    const o = clamp((t - t0 + 0.2) / 0.3) * (1 - E.entree(prog(t, this.fin - 0.5, 0.45)));
    vis(this.compteur, o);
    style(this.compteur, 'filter', `blur(${((1 - clamp((t - t0 + 0.2) / 0.4)) * 10 + E.entree(prog(t, this.fin - 0.5, 0.45)) * 20).toFixed(1)}px) drop-shadow(0 0 30px rgba(255,119,92,.45))`);
    reveler(this.legende, t, t0 + 0.4, { pas: 0.04, t1: this.fin - 0.5 });
    const a = lerp(-0.42, -0.18, E.doux(prog(t, R0, B * 3)));
    const P = projeteur(a, 0.33);
    const h1 = HAUT * (90.4 / 475), [x1, y1] = P(-270, h1, 0), [x2, y2] = P(270, HAUT, 0);
    majPastille(this.p1, t, BARRES[0].t + 0.35, { x: x1, y: y1 - 70, t1: this.fin - 0.45 });
    majPastille(this.p2, t, BARRES[1].t + 0.9, { x: x2, y: y2 - 80, t1: this.fin - 0.45 });
  },
};

// ───────────────────────────────────────── 05 · Les éditions [40.70, 49.95)
const E0 = mesure(22);
const ULTIME = ['’95 Grotti Cheetah', 'Revolvers Hawk & Little Morgan', 'Plus de 50 tatouages signés FAILE', 'Classic Car Collection', 'Ateliers Rideout Customs'];
const BONUS = ['Vapid Stanier ’55 et son garage', 'Tenues et coiffures exclusives', 'Motif d’arme Vintage Vice City', '1 mois de GTA+ offert (numérique)'];

export const editions = {
  debut: E0, fin: mesure(27),
  coupes: [E0, E0 + B, E0 + 2 * B, E0 + 3 * B, E0 + 4 * B],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.r.style.perspective = '1600px';
    this.cartes = [['logo/jaquette-standard-edition.jpg', 'Standard', '7999'], ['logo/jaquette-ultimate-edition-fr.jpg', 'Édition Ultime', '9999']].map(([src, nom]) => {
      const c = el('div', 'abs', '', this.r);
      Object.assign(c.style, { left: '0', top: '0', width: '400px', height: '500px', borderRadius: '20px', overflow: 'hidden', transformStyle: 'preserve-3d',
        boxShadow: '0 40px 90px rgba(0,0,0,.6), 0 0 0 1.5px rgba(255,244,232,.25)' });
      const im = el('img', '', undefined, c);
      im.src = '../assets/' + src;
      Object.assign(im.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
      c.reflet = el('div', 'abs', '', c);
      Object.assign(c.reflet.style, { inset: '0', background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.38) 45%, transparent 60%)', mixBlendMode: 'screen' });
      c.nom = pastille(this.r, nom, 'petite');
      return c;
    });
    this.precom = pastille(this.r, '<b>●</b> Précommandes ouvertes', '');
    this.prix = [['Standard', '79,99 €'], ['Édition Ultime', '99,99 €']].map(([nom, g]) => {
      const p = pastille(this.r, `<b>${nom}</b> `, 'grande');
      p.lastChild.appendChild(compteur(p.lastChild, g.replace(/\d/g, '9')));
      p.cpt = p.lastChild.querySelector('.compteur');
      p.style.fontStretch = '70%'; p.style.fontWeight = '800';
      return p;
    });
    // Liens lumineux (SVG) : la pastille du haut se divise vers les deux prix, puis l'arbre de l'Ultime.
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', W); this.svg.setAttribute('height', H);
    Object.assign(this.svg.style, { position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 0 6px rgba(255,244,232,.9)) drop-shadow(0 0 14px rgba(255,151,69,.8))' });
    this.r.appendChild(this.svg);
    this.liens = Array.from({ length: 7 }, () => {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#FFF4E8'); p.setAttribute('stroke-width', '2.5'); p.setAttribute('stroke-linecap', 'round');
      this.svg.appendChild(p);
      return p;
    });
    this.contenu = ULTIME.map((s) => pastille(this.r, s, 'petite'));
    this.kUltime = texte(this.r, 'Édition Ultime <span style="color:var(--orange)">●</span> ce qu’elle ajoute', 'mono', { x: 1060, y: 250 });
    // Bonus de précommande.
    this.pack = el('div', 'abs', '', this.r);
    Object.assign(this.pack.style, { left: '120px', top: '230px', width: '1000px', height: '562px', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,.6), 0 0 0 1.5px rgba(255,244,232,.25)' });
    const pi = el('img', '', undefined, this.pack);
    pi.src = '../assets/officiel/vintage-pack.jpg';
    Object.assign(pi.style, { width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
    this.packImg = pi;
    this.kBonus = texte(this.r, 'Bonus de précommande <span style="color:var(--orange)">●</span> toutes éditions', 'mono', { x: 1200, y: 250 });
    this.tBonus = texte(this.r, 'Pack Vintage|<span class="degrade">Vice City</span>', 'geant', { x: 1196, y: 300 });
    this.tBonus.style.fontSize = '104px';
    this.bonus = BONUS.map((s) => pastille(this.r, s, 'petite'));
    this.avant = texte(this.r, 'à précommander avant le 20 novembre', 'serif', { x: 1200, y: 880 });
    this.avant.style.fontSize = '44px';
    // Préchargement.
    this.kPre = texte(this.r, 'Préchargement dès le', 'mono', { x: 960, y: 250, ancre: 'centre' });
    this.date = el('div', 'abs geant degrade', '', this.r);
    Object.assign(this.date.style, { left: '960px', top: '300px', fontSize: '330px', transform: 'translateX(-50%)' });
    this.jour = compteur(this.date, '99.99');
    this.plateformes = pastille(this.r, '<b>19.11</b> Sortie · PS5 · Xbox Series X|S', 'grande');
  },
  film(ctx, t) {
    fond(ctx, '#0B0112');
    douche(ctx, 960, 0.6, { largeur: 1300 });
    // Lueur VI sous les cartes.
    halo(ctx, 960, 1060, 820, 'rgba(154,57,187,A)', 0.2);
    halo(ctx, 960, 1100, 560, 'rgba(255,119,92,A)', 0.14);
    eclat(ctx, 0.85 * (1 - tw(t, E0, 0.45)), '255,200,160');
    [E0 + 2 * B, E0 + 3 * B, E0 + 4 * B].forEach((c) => { if (t >= c) eclat(ctx, 0.22 * (1 - tw(t, c, 0.25))); });
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    const t2 = E0 + 2 * B, t3 = E0 + 3 * B, t4 = E0 + 4 * B;
    // a) les deux éditions entrent, tournent, puis l'Ultime prend la place.
    const focus = E.traversee(prog(t, t2 - 0.1, 0.8));
    this.cartes.forEach((c, i) => {
      const t0 = E0 + 0.2 + i * 0.12;
      const a = ressort(t - t0, 120, 17);
      let x = i ? 1140 : 380, y = 200, s = 1, rot = (i ? -1 : 1) * lerp(38, 14, clamp(a)) + 6 * Math.sin((t - E0) * 0.9 + i);
      let o = clamp((t - t0) / 0.25), f = (1 - clamp(a)) * 14;
      if (i === 0) { x -= focus * 700; o *= 1 - focus; f += focus * 18; }
      else { x = lerp(x, 330, focus); y = lerp(y, 220, focus); s = lerp(1, 1.12, focus); rot = lerp(rot, 18, focus); }
      o *= 1 - E.entree(prog(t, t3 - 0.35, 0.35));
      style(c, 'transform', `translate(${x.toFixed(1)}px, ${(y + (1 - clamp(a)) * 160).toFixed(1)}px) rotateY(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})`);
      style(c, 'filter', f > 0.3 ? `blur(${f.toFixed(1)}px)` : 'none');
      vis(c, o);
      style(c.reflet, 'transform', `translateX(${lerp(-120, 120, ((t - E0) * 0.35 + i * 0.3) % 1.4 / 1.4).toFixed(0)}%)`);
      vis(c.nom, 0);
    });
    // La pastille « Précommandes ouvertes » se divise vers les deux prix.
    majPastille(this.precom, t, E0 + 0.5, { x: 960, y: 130, t1: t2 - 0.3 });
    const split = E.sortie(prog(t, E0 + B - 0.1, 0.7));
    const prixX = [580, 1340];
    this.prix.forEach((p, i) => {
      const t0 = E0 + B + 0.25 + i * 0.1;
      majPastille(p, t, t0, { x: prixX[i], y: 860, t1: t2 - 0.3 });
      const q = E.sortie(prog(t, t0, 1.0)), q2 = E.sortie(prog(t - 1 / 60, t0, 1.0));
      const v = i ? 9999 : 7999;
      majCompteur(p.cpt, v * q, v * (q - q2) * 60);
    });
    const lienA = (k, d, x1, y1, x2, y2, t0, t1) => {
      const L = this.liens[k];
      const p = E.sortie(prog(t, t0, 0.6)) * (1 - E.entree(prog(t, t1, 0.3)));
      L.setAttribute('d', d);
      const long = Math.hypot(x2 - x1, y2 - y1) * 1.4 + 10;
      L.setAttribute('stroke-dasharray', `${long} ${long}`);
      L.setAttribute('stroke-dashoffset', String(long * (1 - p)));
      L.style.opacity = p > 0.001 ? '1' : '0';
    };
    // Branches du haut vers les prix (traversent l'écran derrière les cartes).
    lienA(0, `M 960 165 L 960 560 C 960 760, 580 700, 580 815`, 960, 165, 580, 815, E0 + B - 0.1, t2 - 0.35);
    lienA(1, `M 960 165 L 960 560 C 960 760, 1340 700, 1340 815`, 960, 165, 1340, 815, E0 + B - 0.05, t2 - 0.35);
    // b) arbre de l'Ultime : un tronc depuis la carte, une branche par contenu.
    reveler(this.kUltime, t, t2 + 0.2, { pas: 0.05, t1: t3 - 0.3 });
    ULTIME.forEach((_, i) => {
      const y = 360 + i * 120, t0 = t2 + 0.3 + i * 0.12;
      if (i < 5) lienA(2 + i, `M 790 ${500} C 920 ${500}, 940 ${y}, 1060 ${y}`, 790, 500, 1060, y, t0 - 0.1, t3 - 0.35);
      majPastille(this.contenu[i], t, t0 + 0.15, { x: 1060, y, ancre: 'gauche', t1: t3 - 0.35 });
    });
    // c) bonus de précommande.
    const pb = ressort(t - t3 - 0.05, 120, 18);
    vis(this.pack, clamp((t - t3) / 0.25) * (1 - E.entree(prog(t, t4 - 0.35, 0.35))));
    style(this.pack, 'transform', `translateY(${((1 - clamp(pb)) * 120).toFixed(1)}px) scale(${lerp(0.94, 1, clamp(pb)).toFixed(4)})`);
    style(this.packImg, 'transform', `scale(${(1.12 - 0.08 * prog(t, t3, B)).toFixed(4)})`);
    reveler(this.kBonus, t, t3 + 0.15, { pas: 0.04, t1: t4 - 0.35 });
    reveler(this.tBonus, t, t3 + 0.25, { pas: 0.1, t1: t4 - 0.35 });
    this.bonus.forEach((p, i) => majPastille(p, t, t3 + 0.6 + i * 0.12, { x: 1200, y: 580 + i * 70, ancre: 'gauche', t1: t4 - 0.35 }));
    reveler(this.avant, t, t3 + 1.1, { pas: 0.05, t1: t4 - 0.35 });
    // d) préchargement : la date défile jusqu'au 12.11.
    reveler(this.kPre, t, t4 + 0.1, { pas: 0.06, t1: this.fin - 0.3 });
    const q = E.sortie(prog(t, t4 + 0.1, 1.1)), q2 = E.sortie(prog(t - 1 / 60, t4 + 0.1, 1.1));
    majCompteur(this.jour, 1211 * q, 1211 * (q - q2) * 60);
    const od = clamp((t - t4 - 0.05) / 0.25) * (1 - E.entree(prog(t, this.fin - 0.3, 0.3)));
    vis(this.date, od);
    style(this.date, 'filter', `drop-shadow(0 0 40px rgba(255,119,92,.4))`);
    majPastille(this.plateformes, t, t4 + 0.7, { x: 960, y: 760, t1: this.fin - 0.3 });
  },
};

// ───────────────────────────────────────── 06 · La collection [49.95, 55.50)
const C0 = mesure(27);
const OBJETS = ['Figurine Macca the Gator', 'Lunettes Oakley Frogskins', 'Casquette New Era 9FORTY', 'Miroir Macca the Gator', 'Cuillère à cocktail Vice City',
  'Porte-clés lame de rasoir', 'Sac bandoulière Leonida Keys', 'Verre à shot Chunkee', 'Set de pin’s', 'Stickers premium', 'Poster carte de Leonida'];
// Les stickers animés du site officiel : ils sautent un à un, puis s'écartent quand l'illustration arrive.
const STICK = [
  { n: 'alligator', x: 560, y: 610, fx: -320, fy: 760, s: 470, t: 0.1, r: -6 },
  { n: 'soleil', x: 960, y: 330, fx: 960, fy: -420, s: 420, t: 0.22, r: -4 },
  { n: 'flamant', x: 1330, y: 520, fx: 2250, fy: 420, s: 460, t: 0.34, r: 6 },
  { n: 'lamantin', x: 1300, y: 830, fx: 2150, fy: 1350, s: 430, t: 0.46, r: 4 },
  { n: 'palmier', x: 400, y: 330, fx: -320, fy: 80, s: 440, t: 0.58, r: -3 },
  { n: 'voiture', x: 930, y: 800, fx: 930, fy: 1550, s: 500, t: 0.7, r: 0 },
  { n: 'crabe', x: 1580, y: 280, fx: 2300, fy: -160, s: 380, t: 0.82, r: -7 },
];

export const collection = {
  debut: C0, fin: mesure(30),
  coupes: [C0, C0 + B, C0 + 2 * B],
  init(ui) {
    this.r = el('div', 'scene', '', ui);
    this.k = pastille(this.r, '<b>●</b> Coffret collector · jeu non inclus', '');
    this.titre = texte(this.r, 'The Goodtime State|<span class="degrade-h">Vice City Collection</span>', 'geant ombre', { x: 1080, y: 150 });
    this.titre.style.fontSize = '92px';
    this.prix = el('div', 'abs geant degrade', '', this.r);
    Object.assign(this.prix.style, { left: '1076px', top: '345px', fontSize: '190px', fontStretch: '70%' });
    this.cpt = compteur(this.prix, '999,99 €');
    this.legende = texte(this.r, '11 objets <span style="color:var(--orange)">●</span> un coffret par client', 'mono', { x: 1084, y: 545 });
    this.objets = OBJETS.map((o) => pastille(this.r, o, 'petite'));
    // Manettes.
    this.tMan = texte(this.r, 'Manettes DualSense|<span class="degrade-h">édition limitée</span>', 'geant ombre', { x: 960, y: 90, ancre: 'centre' });
    this.tMan.style.fontSize = '112px';
    this.tMan.style.textAlign = 'center';
    this.pMan = pastille(this.r, '<b>84,99 €</b> Noire ou blanche · 19.11', 'grande');
  },
  film(ctx, t) {
    const t1 = C0 + B, t2 = C0 + 2 * B;
    if (t < t2) {
      fond(ctx, '#1A1B3C');
      douche(ctx, 960, 0.7, { largeur: 1400 });
      // L'illustration officielle arrive sous les stickers, puis se range à gauche.
      const k = img('officiel/collection-coffret.jpg');
      const arrive = E.sortie(prog(t, C0 + 0.95, 0.6));
      const r = E.traversee(prog(t, t1 - 0.15, 0.7));
      if (arrive > 0) {
        const x = lerp(0, 90, r), y = lerp(0, 240, r), w = lerp(W, 900, r), h = w * 9 / 16;
        ctx.save();
        ctx.globalAlpha = arrive;
        ctx.beginPath(); ctx.roundRect(x, y, w, h, 28 * r); ctx.clip();
        couvrir(ctx, k, x, y, w, h, { zoom: lerp(1.3, 1.06, arrive) - 0.04 * prog(t, C0, 2 * B) });
        ctx.restore();
        if (r > 0) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 28 * r); liseré(ctx, 2 * (w + h), (t - t1) * 0.5); ctx.restore(); }
      }
      eclat(ctx, 0.7 * (1 - tw(t, C0, 0.4)), '255,200,160');
      STICK.forEach((s, i) => {
        const t0 = C0 + s.t;
        if (t < t0) return;
        const fuite = E.entree(prog(t, C0 + 0.95 + i * 0.03, 0.55));
        if (fuite >= 1) return;
        const im = sticker(s.n, t - t0);
        if (!im) return;
        const a = ressort(t - t0, 170, 13);
        const e = lerp(0.3, 1, a) * (1 - 0.3 * fuite) * s.s / Math.max(im.naturalWidth, im.naturalHeight);
        ctx.save();
        ctx.translate(lerp(s.x, s.fx, fuite), lerp(s.y, s.fy, fuite));
        ctx.rotate((s.r + 4 * Math.sin((t - t0) * 2.2 + i)) * Math.PI / 180);
        ctx.scale(e, e);
        ctx.globalAlpha = clamp((t - t0) / 0.1);
        ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 24;
        ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
        ctx.restore();
      });
      return;
    }
    // c) les manettes, éclairées par la douche, sur fond noir.
    fond(ctx, '#0B0112');
    douche(ctx, 960, 0.85, { largeur: 1500 });
    halo(ctx, 960, 900, 700, 'rgba(90,98,255,A)', 0.35);
    halo(ctx, 960, 980, 520, 'rgba(154,57,187,A)', 0.3);
    eclat(ctx, 0.6 * (1 - tw(t, t2, 0.35)), '255,200,160');
    [['produits/manette-noire-profil.png', -1], ['produits/manette-blanche-profil.png', 1]].forEach(([src, cote], i) => {
      const im = img('promo/' + src);
      if (!im) return;
      const a = ressort(t - t2 - 0.12 - i * 0.12, 110, 15);
      const x = 960 + cote * lerp(1200, 330, a), y = 620 + 16 * Math.sin((t - t2) * 1.6 + i * 1.3);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(cote * lerp(0.5, 0.1, clamp(a)) + 0.03 * Math.sin((t - t2) * 1.1 + i));
      ctx.shadowColor = 'rgba(255,119,92,.45)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
      contenir(ctx, im, 0, 0, 640, 560, { echelle: 1 });
      ctx.restore();
    });
  },
  ui(t) {
    const on = t >= this.debut && t < this.fin;
    vis(this.r, on ? 1 : 0);
    if (!on) return;
    const t1 = C0 + B, t2 = C0 + 2 * B;
    majPastille(this.k, t, C0 + 0.35, { x: 960, y: 1000, t1: t1 - 0.3 });
    reveler(this.titre, t, t1 + 0.1, { pas: 0.08, t1: t2 - 0.3 });
    const q = E.sortie(prog(t, t1 + 0.3, 1.0)), q2 = E.sortie(prog(t - 1 / 60, t1 + 0.3, 1.0));
    majCompteur(this.cpt, 39999 * q, 39999 * (q - q2) * 60);
    vis(this.prix, clamp((t - t1 - 0.25) / 0.25) * (1 - E.entree(prog(t, t2 - 0.3, 0.3))));
    reveler(this.legende, t, t1 + 0.6, { pas: 0.05, t1: t2 - 0.3 });
    // Les 11 objets défilent sur deux bandes horizontales, en sens contraires.
    if (!this.larg) this.larg = this.objets.map((o) => o.offsetWidth);
    const rangs = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10]];
    rangs.forEach((r, k) => {
      const total = r.reduce((s, i) => s + this.larg[i] + 22, 0);
      const dep = (k ? -1 : 1) * 220 * (t - t1);
      let x = k ? 1824 - total + 380 : 96;
      r.forEach((i, j) => {
        majPastille(this.objets[i], t, t1 + 0.55 + (k * 6 + j) * 0.06, { x: x - dep, y: k ? 940 : 862, ancre: 'gauche', t1: t2 - 0.3 });
        x += this.larg[i] + 22;
      });
    });
    reveler(this.tMan, t, t2 + 0.15, { pas: 0.08, t1: this.fin - 0.25 });
    majPastille(this.pMan, t, t2 + 0.55, { x: 960, y: 960, t1: this.fin - 0.25 });
  },
};
