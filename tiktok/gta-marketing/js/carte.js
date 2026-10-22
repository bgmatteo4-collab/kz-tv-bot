// La carte animée, fil conducteur du film : données Natural Earth / us-atlas, projection de
// Mercator, puis une vraie perspective (inclinaison de caméra) calculée ici, pour que les traits
// restent nets à toutes les profondeurs et que les étiquettes restent droites face à l'écran.
import { W, H, C, rgba, clamp, lerp } from './outils.js';

const d3 = window.d3, topojson = window.topojson;
export const RAD = Math.PI / 180;
const merc = d3.geoMercator().scale(1).translate([0, 0]); // coordonnées planes unitaires
export const plan = (lon, lat) => merc([lon, lat]);
export const enLonLat = (x, y) => merc.invert([x, y]);

export const LIEUX = {
  losAngeles: [-118.243, 34.052],
  miami: [-80.187, 25.781],        // Kaseya Center (l'enseigne, le match du Heat)
  wynwood: [-80.1985, 25.8013],    // bornes de NW 26th St et Wynwood Walls
  baie: [-80.168, 25.789],         // le ciel au-dessus de la baie (dirigeable)
  keyBiscayne: [-80.162, 25.693],  // voitures, 15 octobre
  southBeach: [-80.131, 25.775],   // chaises, parasols, avions-banderoles
  brooklyn: [-73.9575, 40.7215],   // Wythe Ave et N 11th St
  hollywood: [-118.326, 34.1016],  // Hollywood Boulevard
  bagnolet: [2.4166, 48.8624],     // tours Mercuriales, porte de Bagnolet
};

// Noms de quartiers affichés de près sur Miami (discrets, en capitales espacées).
export const QUARTIERS = [
  ['DOWNTOWN', -80.196, 25.772], ['WYNWOOD', -80.207, 25.806], ['MIAMI BEACH', -80.133, 25.808],
  ['BISCAYNE BAY', -80.172, 25.735], ['KEY BISCAYNE', -80.157, 25.676], ['LITTLE HAVANA', -80.228, 25.766],
];

let D = null;
export async function chargerCarte() {
  const j = (u) => fetch(u).then((r) => r.json());
  const [land, landLeger, pays, etats, routes, zones, lacs, villes, cotesFL, routesFL, eauxMiami] = await Promise.all([
    j('vendor/data/land-10m.json'), j('vendor/data/land-50m.json'), j('vendor/data/countries-50m.json'), j('vendor/data/states-10m.json'),
    j('vendor/data/routes.json'), j('vendor/data/villes-zones.json'), j('vendor/data/lacs.json'), j('vendor/data/villes.json'),
    j('vendor/data/floride-cotes.json'), j('vendor/data/floride-routes.json'), j('vendor/data/miami-eaux.json'),
  ]);
  D = {
    terre: topojson.feature(land, land.objects.land),
    terreLegere: topojson.feature(landLeger, landLeger.objects.land),
    frontieres: topojson.mesh(pays, pays.objects.countries, (a, b) => a !== b),
    etats: topojson.mesh(etats, etats.objects.states, (a, b) => a !== b),
    grandesRoutes: { type: 'FeatureCollection', features: routes.features.filter((f) => f.properties.type !== 'Secondary Highway') },
    petitesRoutes: { type: 'FeatureCollection', features: routes.features.filter((f) => f.properties.type === 'Secondary Highway') },
    zones, lacs,
    grandesZones: { type: 'FeatureCollection', features: zones.features.filter((f) => f.properties.area_sqkm > 250) },
    villes: villes.features.map((f) => ({ nom: f.properties.name, pop: f.properties.pop_max, pays: f.properties.adm0_a3, ll: f.geometry.coordinates })),
    grille: d3.geoGraticule().step([5, 5]).extentMajor([[-180, -80], [180, 80]])(),
    // Détail de Miami (recensement américain 2023, 1:500 000) : côtes, plans d'eau, grands axes.
    cotesFL, eauxMiami,
    autoroutesFL: { type: 'FeatureCollection', features: routesFL.features.filter((f) => f.properties.MTFCC === 'S1100') },
    axesFL: { type: 'FeatureCollection', features: routesFL.features.filter((f) => f.properties.MTFCC === 'S1200') },
  };
  return D;
}
export const donnees = () => D;

// Caméra : centre (lon, lat), largeur visible au pivot (en degrés de longitude), inclinaison.
export function vue(lon, lat, largeur, incl = 0) {
  const [x, y] = plan(lon, lat);
  return { x, y, w: largeur * RAD, incl };
}
// Vol « zoom fluide » (van Wijk & Nuij, via d3) entre deux vues : renvoie une fonction de p ∈ [0,1].
export function vol(a, b) {
  const i = d3.interpolateZoom([a.x, a.y, a.w], [b.x, b.y, b.w]);
  return (p) => { const [x, y, w] = i(p); return { x, y, w, incl: lerp(a.incl, b.incl, p) }; };
}

// Projection écran d'une caméra : Mercator → plan de la caméra → perspective.
const PIVOT = H * 0.56, DIST = 1750;
export function projeteur(cam) {
  const k = W / cam.w, c = Math.cos(cam.incl), s = Math.sin(cam.incl);
  const ecran = (X, Y) => {
    const dx = (X - cam.x) * k, dy = (Y - cam.y) * k;
    const f = DIST / Math.max(80, DIST - dy * s);
    return [W / 2 + dx * f, PIVOT + dy * c * f, f];
  };
  const inverse = (sx, sy) => {
    const Y = sy - PIVOT;
    const dy = (Y * DIST) / (DIST * c + Y * s);
    const f = DIST / (DIST - dy * s);
    return [cam.x + (sx - W / 2) / f / k, cam.y + dy / k];
  };
  // Zone plane visible (avec marge) pour couper tôt ce qui est hors champ. Au-delà d'environ 57°
  // d'inclinaison, l'horizon entre dans l'image : la zone s'arrête juste sous lui (sinon
  // l'inverse passe « derrière » la caméra et la zone de coupe se retourne).
  const horizon = s > 0 ? PIVOT - (DIST * c) / s : -Infinity;
  const haut = Math.max(-60, horizon + 40);
  const coins = [[-80, haut], [W + 80, haut], [-80, H + 60], [W + 80, H + 60]].map(([a, b]) => inverse(a, b));
  const xs = coins.map((p) => p[0]), ys = coins.map((p) => p[1]);
  const coupe = d3.geoMercator().scale(1).translate([0, 0]).precision(0.6 / k)
    .clipExtent([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]]);
  const persp = d3.geoTransform({ point(x, y) { const p = ecran(x, y); this.stream.point(p[0], p[1]); } });
  const proj = { stream: (st) => coupe.stream(persp.stream(st)) };
  return { k, ecran, inverse, ll: (lon, lat) => { const [x, y] = plan(lon, lat); return ecran(x, y); }, chemin: (ctx) => d3.geoPath(proj, ctx) };
}

// Fond de carte. a = opacité générale (0 → seulement le fond marine).
export function dessinerCarte(ctx, cam, { a = 1, lueurZones = 0, alerte = 0 } = {}) {
  const P = projeteur(cam), chemin = P.chemin(ctx), zoom = 34 / (cam.w / RAD); // 1 = vue États-Unis
  ctx.fillStyle = C.marine;
  ctx.fillRect(0, 0, W, H);
  if (a <= 0) return P;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const trace = (geo, style, largeur, remplir = false) => {
    ctx.beginPath();
    chemin(geo);
    if (remplir) { ctx.fillStyle = style; ctx.fill(); } else { ctx.strokeStyle = style; ctx.lineWidth = largeur; ctx.stroke(); }
  };
  trace(D.grille, rgba(C.beurre, 0.045), 1);
  // Niveaux de détail : vue de loin, les côtes au 1:50 M, seulement les grandes agglomérations
  // et pas de routes (invisibles à cette échelle, mais très chères à tracer) ; de près, tout.
  const largeur = cam.w / RAD, terre = largeur < 8 ? D.terre : D.terreLegere;
  trace(terre, C.terre, 0, true);
  trace(D.lacs, C.marine, 0, true);
  trace(largeur < 12 ? D.zones : D.grandesZones, rgba(C.beurre, 0.07 + 0.05 * lueurZones), 0, true);
  if (zoom > 2.2) trace(D.petitesRoutes, rgba(C.beurre, clamp((zoom - 2.2) / 3) * 0.07), 1);
  if (largeur < 22) trace(D.grandesRoutes, rgba(C.beurre, 0.05 + 0.05 * clamp((zoom - 1) / 4)), 1.1);
  trace(D.etats, rgba(C.beurre, 0.13), 1);
  trace(D.frontieres, rgba(C.beurre, 0.26), 1.3);
  // De près sur Miami, la couche détaillée prend le relais (fondu entre 3° et 1,5° de large).
  const detail = clamp((3 - largeur) / 1.5);
  if (detail > 0) {
    trace(D.cotesFL, C.terre, 0, true);
    trace(D.eauxMiami, C.marine, 0, true);
    if (largeur < 1.6) {
      const r = clamp((1.6 - largeur) / 0.8);
      trace(D.axesFL, rgba(C.beurre, 0.09 * r), 1.1);
      trace(D.autoroutesFL, rgba(C.beurre, 0.08 * r), 5);
      trace(D.autoroutesFL, rgba(C.beurre, 0.3 * r), 1.8);
    }
  }
  // Côtes : une lueur large et douce, puis un trait fin.
  ctx.globalAlpha = a * (1 - detail);
  trace(terre, rgba(C.beurre, 0.06), 8);
  trace(terre, rgba(C.beurre, 0.42), 1.5);
  if (detail > 0) {
    ctx.globalAlpha = a * detail;
    for (const g of [D.cotesFL, D.eauxMiami]) { trace(g, rgba(C.beurre, 0.06), 8); trace(g, rgba(C.beurre, 0.4), 1.4); }
  }
  ctx.restore();

  // Lumière douce venue d'au-dessus du point visé : donne du relief au plateau.
  const l = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, 980);
  l.addColorStop(0, rgba(C.beurre, 0.07 * a));
  l.addColorStop(1, rgba(C.beurre, 0));
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = l; ctx.fillRect(0, 0, W, H); ctx.restore();
  // Brume au loin : la carte se fond dans le marine vers le haut, comme un horizon.
  const brume = clamp(cam.incl / (40 * RAD));
  if (brume > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    g.addColorStop(0, rgba(C.marine, 0.92 * brume));
    g.addColorStop(0.55, rgba(C.marine, 0.35 * brume));
    g.addColorStop(1, rgba(C.marine, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H * 0.55);
  }
  // Alerte (la mairie proteste) : la carte vire au cerise sombre. Seule la teinte change
  // (fondu « hue ») : la luminosité est gardée, terre et mer restent distinctes.
  if (alerte > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'hue';
    ctx.globalAlpha = 0.9 * alerte;
    ctx.fillStyle = C.cerise;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return P;
}

// ---------------------------------------------------------------- trajets

// Un trajet en arc entre deux lieux (courbe de Bézier dans le plan), parcouru à vitesse constante.
export function trajet(a, b, cambrure = 0.2, n = 260) {
  const A = plan(...a), B = plan(...b);
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1];
  const L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L; // perpendiculaire
  const sens = ny < 0 ? 1 : -1;                          // toujours bombé vers le nord
  const P1 = [mx + nx * L * cambrure * sens, my + ny * L * cambrure * sens];
  const pts = [], cum = [0];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    pts.push([v * v * A[0] + 2 * v * u * P1[0] + u * u * B[0], v * v * A[1] + 2 * v * u * P1[1] + u * u * B[1]]);
    if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[n];
  const point = (p) => {
    const d = clamp(p) * total;
    let i = 1;
    while (i < n && cum[i] < d) i++;
    const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
  };
  // Fraction du trajet la plus proche d'un lieu (pour allumer les villes au passage).
  const passage = (ll) => {
    const q = plan(...ll);
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d < bd) { bd = d; best = i; } });
    return { p: cum[best] / total, distance: bd };
  };
  return { pts, cum, total, point, passage };
}

// Trace le trajet jusqu'à p : lueur cerise, trait vif, tête lumineuse.
export function dessinerTrajet(ctx, P, tr, p, { a = 1, tete = 1 } = {}) {
  if (p <= 0 || a <= 0) return;
  const d = clamp(p) * tr.total, ecr = [];
  for (let i = 0; i < tr.pts.length && tr.cum[i] <= d; i++) ecr.push(P.ecran(...tr.pts[i]));
  const fin = P.ecran(...tr.point(p));
  ecr.push(fin);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ligne = () => { ctx.beginPath(); ecr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
  ctx.shadowColor = rgba(C.cerise, 0.9);
  ctx.shadowBlur = 26;
  ligne(); ctx.strokeStyle = rgba(C.cerise, 0.55); ctx.lineWidth = 9; ctx.stroke();
  ctx.shadowBlur = 0;
  ligne(); ctx.strokeStyle = C.ceriseVif; ctx.lineWidth = 3.6; ctx.stroke();
  // Pointillés beurre par-dessus : la « route » des cartes de jeu.
  ligne(); ctx.setLineDash([2, 16]); ctx.lineDashOffset = -d * 4000; ctx.strokeStyle = rgba(C.beurre, 0.85); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.setLineDash([]);
  if (tete > 0) {
    const [x, y] = fin;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 70);
    g.addColorStop(0, rgba(C.ceriseVif, 0.75 * tete));
    g.addColorStop(0.35, rgba(C.cerise, 0.25 * tete));
    g.addColorStop(1, rgba(C.cerise, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - 70, y - 70, 140, 140);
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = rgba(C.beurre, tete); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- repères et étiquettes

// Épingle : point, anneau, onde de choc (o ∈ [0,1] = progression de l'onde).
export function epingle(ctx, x, y, { a = 1, r = 8, onde = -1, couleur = C.ceriseVif, halo = 1 } = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (halo > 0) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 9);
    g.addColorStop(0, rgba(C.cerise, 0.45 * halo));
    g.addColorStop(1, rgba(C.cerise, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
  }
  if (onde >= 0 && onde < 1) {
    ctx.beginPath(); ctx.arc(x, y, r + onde * 120, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(C.ceriseVif, (1 - onde) ** 1.6 * 0.9); ctx.lineWidth = 3 * (1 - onde) + 0.5; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.strokeStyle = rgba(C.beurre, 0.75); ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = couleur; ctx.fill();
  ctx.restore();
}

export function texte(ctx, s, x, y, { taille = 24, poids = 500, police = 'JetBrains Mono', couleur = C.beurre, a = 1, aligne = 'left', base = 'alphabetic', espace = 0, etire = 'normal' } = {}) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `${poids} ${taille}px "${police}"`;
  ctx.fontStretch = etire;
  ctx.letterSpacing = `${espace}px`;
  ctx.textAlign = aligne;
  ctx.textBaseline = base;
  ctx.fillStyle = couleur;
  ctx.shadowColor = rgba(C.marine, 0.8);
  ctx.shadowBlur = 14;
  ctx.fillText(s, x, y);
  ctx.restore();
}

// Grande étiquette de lieu (nom de jeu), posée au-dessus de l'épingle.
// e ∈ [0,1] : apparition (ressort), les lettres se resserrent en arrivant.
export function etiquetteLieu(ctx, x, y, nom, sous, { e = 1, taille = 70, a = 1 } = {}) {
  if (e <= 0 || a <= 0) return;
  const montee = (1 - e) * 26;
  // L'étiquette reste dans la zone sûre, même si l'épingle est près du bord.
  ctx.save();
  ctx.font = `800 ${taille}px "Archivo"`; ctx.fontStretch = 'semi-condensed'; ctx.letterSpacing = '3px';
  const demi = ctx.measureText(nom).width / 2 + 10;
  ctx.restore();
  const dx = clamp(x, 90 + demi, 930 - demi) - x;
  texte(ctx, nom, x + dx, y - 34 - montee, { taille, poids: 800, police: 'Archivo', etire: 'semi-condensed', espace: lerp(18, 3, clamp(e)), a: a * clamp(e * 1.4), aligne: 'center' });
  if (sous) texte(ctx, sous, x + dx, y - 34 - taille * 0.98 - montee * 0.6, { taille: 23, poids: 500, espace: 3, a: a * clamp(e * 1.4 - 0.25) * 0.8, aligne: 'center' });
}

// Épingle numérotée (les 7 coups). etat : 0 éteinte, 1 active, 2 faite. e ∈ [0,1] : apparition.
// marque : le texte dans la pastille (« 1 » … « 7 », ou « ? » tant que le dernier est un mystère).
export function epingleNumero(ctx, x, y, marque, { etat = 0, e = 1, a = 1, onde = -1, f = 1 } = {}) {
  if (e <= 0 || a <= 0) return;
  const r = (etat === 1 ? 30 : 22) * clamp(f, 0.75, 1.3) * (0.4 + 0.6 * e);
  ctx.save();
  ctx.globalAlpha = a * clamp(e * 2);
  if (etat === 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, rgba(C.cerise, 0.5)); g.addColorStop(1, rgba(C.cerise, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  if (onde >= 0 && onde < 1) {
    ctx.beginPath(); ctx.arc(x, y, r + onde * 110, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(C.ceriseVif, (1 - onde) ** 1.6 * 0.9); ctx.lineWidth = 3 * (1 - onde) + 0.5; ctx.stroke();
  }
  // Petite ombre portée, puis la pastille : pleine (active, faite) ou cerclée (éteinte).
  ctx.beginPath(); ctx.arc(x + 3, y + 5, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = etat === 0 ? rgba(C.marine, 0.92) : etat === 1 ? C.cerise : rgba(C.cerise, 0.85);
  ctx.fill();
  ctx.lineWidth = etat === 0 ? 2.5 : 2;
  ctx.strokeStyle = etat === 0 ? rgba(C.beurre, 0.7) : C.beurre;
  ctx.stroke();
  ctx.font = `900 ${Math.round(r * 1.15)}px "Archivo"`;
  ctx.fontStretch = 'condensed';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C.beurre;
  ctx.fillText(marque, x, y + r * 0.05);
  ctx.restore();
}

// Noms de quartiers de Miami, visibles de près seulement.
export function quartiers(ctx, P, cam, { a = 1, zoneTitres = null } = {}) {
  const largeur = cam.w / RAD, v = clamp((0.7 - largeur) / 0.3) * a;
  if (v <= 0) return;
  for (const [nom, lon, lat] of QUARTIERS) {
    const [x, y, f] = P.ll(lon, lat);
    if (x < -200 || x > W + 200 || y < -100 || y > H + 100) continue;
    texte(ctx, nom, x, y, { taille: 20 * clamp(f, 0.8, 1.3), poids: 600, espace: 5, a: 0.42 * v * (zoneTitres ? zoneTitres(y) : 1), aligne: 'center' });
  }
}
