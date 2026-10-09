// lib/trois.js — Three.js prêt pour le rendu image par image (cartes postales, téléphones, carte 3D).
//
// Three.js r160 est copié dans lib/vendor/three.module.min.js (licence MIT, LICENSE-three.txt).
// Vérifié : le Chromium headless de Playwright rend en WebGL 2 via SwiftShader (processeur,
// pas de carte graphique). C'est correct mais pas gratuit : rester sobre (quelques
// dizaines de maillages, textures ≤ 1024 px, pas d'ombres temps réel, antialias via
// pixelRatio 1 + flou de mouvement). Mesure dans LISEZMOI-equipes.md.
// Repli si une scène 3D est trop lourde : CSS 3D (transform: perspective() rotateY() sur
// un <div> contenant un <canvas> de footage), tout aussi pur et bien plus léger.
//
// API
//   import { THREE, creerScene3D, texturePlan } from '../lib/trois.js';
//   const s3 = creerScene3D(stage, { z: 20, fov: 30 });   // canvas 1920×1080 transparent
//   const carte = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.6), new THREE.MeshBasicMaterial({ map: tex.texture }));
//   s3.scene.add(carte);
//   const tex = texturePlan(p, 1024, 576);                 // p = plan() ou photo() de footage.js
//   // dans render(t) :
//   await tex.maj(tl, { zoom: 1.05 });                     // dessine l'image du plan dans la texture
//   carte.rotation.y = …; s3.rendre();
//
// Pièges : appeler s3.rendre() APRÈS avoir mis à jour textures et positions ; ne rien animer
// avec l'horloge de Three.js (THREE.Clock) : tout vient de t.

import * as THREE from './vendor/three.module.min.js';
export { THREE };

export function creerScene3D(stage, o = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fill';
  canvas.style.zIndex = String(o.z ?? 10);
  stage.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: o.antialias ?? true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(1920, 1080, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 30, 1920 / 1080, 0.1, 1000);
  camera.position.set(0, 0, o.distance ?? 10);
  return {
    canvas, renderer, scene, camera,
    rendre() { renderer.render(scene, camera); },
    visible(v) { canvas.style.display = v ? 'block' : 'none'; },
  };
}

// Texture alimentée par un plan (ou une photo) : un canvas hors écran redessiné à chaque image.
export function texturePlan(source, w = 1024, h = 576) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return {
    texture, canvas: c, ctx,
    async maj(tl, boite = {}) {
      await source.dessiner(ctx, tl, { x: 0, y: 0, w, h, ...boite });
      texture.needsUpdate = true;
    },
  };
}
