// Tableau 3 : « la régie ». Des écrans qui dérivent devant la caméra : le titre
// d'attente, les réseaux, les règles du chat, une check-list cochée par un curseur
// Chaque écran est dessiné en 2D puis posé en texture.
import * as THREE from 'three';
import { prog, E, lerp, clamp, onde, h2 } from './outils.js';
import { REGIE } from './camera.js';

export const RESEAUX = [
  ['YouTube', 'Kayx TV'],
  ['X / Twitter', '@Kayzx_tv'],
];
export const REGLES = ['Respect avant tout', 'Pas de spam ni de pub', 'Pas de spoil', 'Les modos ont le dernier mot'];
export const CHECKLIST = ['Micro', 'Caméra', 'Scène'];
export const CLICS = [51.5, 53.5, 55.5];

const C = { encre: '#061C1B', nuit: '#082624', teal: '#0F3D3A', teal2: '#1F6F66', teal3: '#5FA89C', teal4: '#9CCFC5', or: '#E3A83B', or2: '#F2C76E', brume: '#C9D1D1', blanc: '#EEF2F1' };
const TITRE = '"Insatiable Compressed"', TITRE2 = '"Insatiable Condensed"', MONO = '"JetBrains Mono"', TEXTE = '"Inter Tight"';

function arrondi(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Fond commun : carte sombre, liseré, diagonales lumineuses (langage Ligue 1+).
function fond(ctx, w, h, titre) {
  ctx.clearRect(0, 0, w, h);
  arrondi(ctx, 6, 6, w - 12, h - 12, 34);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0C3431'); g.addColorStop(1, C.encre);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  for (let k = 0; k < 4; k++) {
    const x = w * (0.35 + k * 0.22);
    const lg = ctx.createLinearGradient(0, h, 0, 0);
    lg.addColorStop(0, 'rgba(95,168,156,.5)'); lg.addColorStop(1, 'rgba(95,168,156,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = k % 2 ? 2 : 4;
    ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + h * 0.46, 0); ctx.stroke();
  }
  ctx.restore();
  arrondi(ctx, 6, 6, w - 12, h - 12, 34);
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(156,207,197,.45)'; ctx.stroke();
  if (titre) {
    ctx.fillStyle = C.or; ctx.font = `600 26px ${MONO}`;
    ctx.fillText(titre.toUpperCase().split('').join(' '), 56, 76);
    ctx.fillStyle = C.or; ctx.fillRect(56, 96, 70, 4);
  }
}

function ecran(w, h, dessiner) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex, dessiner, etat: null };
}

const principal = ecran(1400, 790, (ctx, w, h) => {
  fond(ctx, w, h, 'Kayzx TV · antenne');
  ctx.fillStyle = C.or; ctx.beginPath(); ctx.arc(76, 200, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.blanc; ctx.font = `150px ${TITRE}`;
  ctx.fillText('LE LIVE', 56, 360);
  ctx.fillText('COMMENCE BIENTÔT', 56, 520);
  ctx.fillStyle = C.or; ctx.save(); ctx.transform(1, 0, -0.32, 1, 0, 0); ctx.fillRect(250, 590, 260, 14); ctx.restore();
  ctx.fillStyle = C.teal4; ctx.font = `600 26px ${MONO}`;
  ctx.fillText('E N   A T T E N T E   D U   S I G N A L', 56, 690);
});

const reseaux = ecran(960, 760, (ctx, w, h) => {
  fond(ctx, w, h, 'Réseaux');
  RESEAUX.forEach(([nom, compte], i) => {
    const y = 180 + i * 250;
    arrondi(ctx, 56, y, 120, 120, 26); ctx.fillStyle = 'rgba(227,168,59,.16)'; ctx.fill();
    ctx.fillStyle = C.or; ctx.font = `64px ${TITRE2}`; ctx.textAlign = 'center';
    ctx.fillText(i === 0 ? 'YT' : 'X', 116, y + 84); ctx.textAlign = 'left';
    ctx.fillStyle = C.teal4; ctx.font = `600 24px ${MONO}`; ctx.fillText(nom.toUpperCase(), 210, y + 36);
    ctx.fillStyle = C.blanc; ctx.font = `92px ${TITRE}`; ctx.fillText(compte.toUpperCase(), 206, y + 122);
  });
});

const regles = ecran(960, 860, (ctx, w, h) => {
  fond(ctx, w, h, 'Règles du chat');
  REGLES.forEach((r, i) => {
    const y = 210 + i * 150;
    ctx.fillStyle = C.or; ctx.font = `600 30px ${MONO}`; ctx.fillText(String(i + 1).padStart(2, '0'), 56, y);
    ctx.fillStyle = C.blanc; ctx.font = `68px ${TITRE2}`; ctx.fillText(r.toUpperCase(), 130, y + 8);
    ctx.fillStyle = 'rgba(156,207,197,.2)'; ctx.fillRect(56, y + 44, w - 112, 2);
  });
});

// La check-list se redessine quand une case est cochée.
const checklist = ecran(900, 640, (ctx, w, h, coches) => {
  fond(ctx, w, h, 'Check-list');
  CHECKLIST.forEach((n, i) => {
    const y = 170 + i * 140, ok = i < coches;
    arrondi(ctx, 56, y, 84, 84, 18);
    ctx.fillStyle = ok ? C.or : 'rgba(201,209,209,.08)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = ok ? C.or2 : 'rgba(201,209,209,.35)'; ctx.stroke();
    if (ok) { ctx.strokeStyle = C.encre; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(78, y + 44); ctx.lineTo(94, y + 60); ctx.lineTo(120, y + 26); ctx.stroke(); }
    ctx.fillStyle = ok ? C.blanc : C.brume; ctx.font = `76px ${TITRE2}`; ctx.fillText(n.toUpperCase(), 176, y + 70);
    ctx.fillStyle = ok ? C.or : 'rgba(156,207,197,.6)'; ctx.font = `600 22px ${MONO}`; ctx.textAlign = 'right';
    ctx.fillText(ok ? 'PRÊT' : 'EN COURS', w - 60, y + 54); ctx.textAlign = 'left';
  });
});

// Disposition autour du point de régie : [écran, largeur 3D, décalage, rotation Y, entrée]
const DISPO = [
  [principal, 7.0, [0, 0.2, 0], 0, 44.6],
  [reseaux, 4.0, [-6.4, 0.5, 1.3], 0.36, 45.0],
  [regles, 4.0, [6.4, 0.1, 1.1], -0.36, 45.3],
  [checklist, 3.1, [5.2, -2.9, 2.2], -0.24, 45.7],
];

export function creerRegie(scene) {
  const meshes = DISPO.map(([e, larg, dec, rotY, entree], i) => {
    e.dessiner(e.ctx, e.canvas.width, e.canvas.height, 0);
    e.tex.needsUpdate = true;
    const haut = (larg * e.canvas.height) / e.canvas.width;
    const mat = new THREE.MeshBasicMaterial({ map: e.tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(larg, haut), mat);
    scene.add(mesh);
    return { e, mesh, mat, larg, haut, dec: new THREE.Vector3(...dec), rotY, entree, i };
  });

  return {
    meshes,
    maj(t) {
      const coches = CLICS.filter((c) => t >= c + 0.08).length;
      if (checklist.etat !== coches) { checklist.dessiner(checklist.ctx, 900, 640, coches); checklist.tex.needsUpdate = true; checklist.etat = coches; }
      const actif = t > 43.5 && t < 68;
      for (const s of meshes) {
        s.mesh.visible = actif;
        if (!actif) continue;
        const p = E.out(prog(t, s.entree, 2.6));
        const sortie = E.inOut(prog(t, 63.2 + s.i * 0.18, 2.2));
        s.mesh.position.copy(REGIE).add(s.dec);
        s.mesh.position.z -= (1 - p) * 34;
        s.mesh.position.y += (1 - p) * (s.i % 2 ? 4 : -4) + 0.12 * Math.sin(t * 0.9 + s.i * 1.7);
        s.mesh.rotation.set((1 - p) * 0.5 + 0.03 * Math.sin(t * 0.7 + s.i), s.rotY + (1 - p) * (s.i % 2 ? -0.9 : 0.9), 0);
        s.mat.opacity = clamp(p * 1.4) * (1 - sortie);
      }
    },
  };
}

// Position à l'écran (pixels) d'un point d'un écran 3D, pour y poser le curseur.
export function pointEcran(regie, camera, iEcran, u, v, cible) {
  const s = regie.meshes[iEcran];
  const local = new THREE.Vector3((u - 0.5) * s.larg, (0.5 - v) * s.haut, 0);
  s.mesh.updateMatrixWorld();
  local.applyMatrix4(s.mesh.matrixWorld).project(camera);
  cible.x = (local.x * 0.5 + 0.5) * 1920;
  cible.y = (-local.y * 0.5 + 0.5) * 1080;
  return cible;
}
export const CASES = CHECKLIST.map((_, i) => [(56 + 42) / 900, (170 + i * 140 + 42) / 640]);
