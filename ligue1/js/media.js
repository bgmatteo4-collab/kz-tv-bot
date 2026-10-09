// Images, plans vidéo et décor commun.
// Les plans viennent de la vidéo d'intro officielle du site (25 i/s), extraite
// en JPEG dans assets/frames/intro/0001.jpg… (0001 = t 0 s) : le Chromium de
// rendu ne lit pas le H.264, on dessine donc les images une par une.
'use strict';

// ───────────── Cache d'images décodées
const CACHE = new Map();
function image(src) {
  let e = CACHE.get(src);
  if (!e) {
    const im = new Image();
    e = { im, ready: new Promise((ok) => { im.onload = () => im.decode().then(ok, ok); im.onerror = ok; }) };
    im.src = src;
    CACHE.set(src, e);
    // Les images de plans sont nombreuses : on oublie les plus anciennes.
    if (CACHE.size > 220) for (const k of CACHE.keys()) { if (k.includes('/frames/')) { CACHE.delete(k); break; } }
  }
  return e;
}
async function charger(src) { const e = image(src); await e.ready; return e.im; }

// ───────────── Plans (secondes dans la vidéo source, sans texte incrusté)
const PLANS = {
  action: [0.0, 2.3],   // phase de jeu, plan large
  celeb: [2.4, 3.72],   // joueur qui célèbre devant la tribune (le texte d'origine arrive à 3,76 s)
  tifo: [6.0, 7.3],     // stade, fumigènes
  rennes: [9.0, 9.95],  // vestiaire de Rennes en fête
  gardien: [11.4, 13.3],
  ol: [13.5, 17.3],     // joueurs de l'OL, sourires
  logo: [17.4, 20.8],   // animation officielle du logo Ligue 1+
};
function imagePlan(nom, tl, vitesse = 1) {
  const [a, b] = PLANS[nom];
  const s = clamp(a + tl * vitesse, a, b - 0.02);
  return `assets/frames/intro/${String(Math.floor(s * 25) + 1).padStart(4, '0')}.jpg`;
}
async function plan(nom, tl, vitesse = 1) { return charger(imagePlan(nom, tl, vitesse)); }

// Dessine une image en « cover » dans une boîte, avec zoom et point focal.
function couvrir(ctx, im, x, y, w, h, { zoom = 1, fx = 0.5, fy = 0.5, alpha = 1 } = {}) {
  if (!im || !im.naturalWidth) return;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom;
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  ctx.globalAlpha = alpha;
  ctx.drawImage(im, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
  ctx.globalAlpha = 1;
}

// ───────────── Faisceaux bleus en diagonale (motif du site Ligue 1+)
const PENTE = 0.46; // décalage horizontal par pixel de hauteur
function dessinerFaisceaux(ctx, t, { intensite = 1, vitesse = 60, eclat = 0 } = {}) {
  ctx.fillStyle = '#0B0B0B';
  ctx.fillRect(0, 0, W, H);
  if (intensite <= 0) return;
  const bandes = [[0, 360], [560, 260], [980, 420], [1560, 300], [2020, 380], [2560, 280]];
  const span = 3100;
  for (let k = 0; k < bandes.length; k++) {
    const [base, larg] = bandes[k];
    const x = ((base + t * vitesse) % span + span) % span - 700; // x du bord gauche, en bas
    const top = x + H * PENTE;
    // Panneau légèrement plus clair
    const g = ctx.createLinearGradient(x, 0, x + larg, 0);
    g.addColorStop(0, `rgba(255,255,255,${0.035 * intensite})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(top, 0); ctx.lineTo(top + larg, 0); ctx.lineTo(x + larg, H); ctx.closePath(); ctx.fill();
    // Arête lumineuse : forte en bas, qui s'éteint vers le haut
    const a = intensite * (0.55 + 0.45 * Math.sin(t * 0.9 + k * 1.7)) + eclat;
    const lg = ctx.createLinearGradient(0, H, 0, 0);
    lg.addColorStop(0, `rgba(80,170,255,${clamp(a)})`);
    lg.addColorStop(0.55, `rgba(8,95,255,${clamp(a * 0.6)})`);
    lg.addColorStop(1, 'rgba(8,95,255,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = lg;
    for (const [lw, al] of [[46, 0.06], [16, 0.18], [3, 1]]) {
      ctx.globalAlpha = al;
      ctx.lineWidth = lw;
      ctx.beginPath(); ctx.moveTo(x, H + 20); ctx.lineTo(top + 20 * PENTE, -20); ctx.stroke();
    }
    ctx.restore();
  }
}

// ───────────── Transitions
// Volet bleu incliné qui balaie tout l'écran ; la scène change à mi-course.
const VOLETS = [12.05, 26.05, 38.45];
function etatVolet(t) {
  for (const t0 of VOLETS) {
    const p = prog(t, t0 - 0.32, 0.64);
    if (p > 0 && p < 1) return E.inOut(p);
  }
  return null;
}
// Ouverture en parallélogramme (la forme du « 1 ») : renvoie un clip-path.
function tranche(p) {
  if (p >= 1) return 'none';
  const e = E.out(p);
  const hw = lerp(0, 1500, e), sk = 240 * (1 - e * 0.5);
  const cx = 960, top = cx - hw + sk, bot = cx - hw - sk;
  return `polygon(${top}px 0, ${cx + hw + sk}px 0, ${cx + hw - sk}px 1080px, ${bot}px 1080px)`;
}
