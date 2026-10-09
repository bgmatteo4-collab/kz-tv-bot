// Écran d'attente Kayzx TV : boucle de 90 s, une image = await render(t).
//   index.html          lecture en temps réel (en boucle)   ·   ?t=12.5 image fixe
//   index.html?render   piloté par render.js, image par image
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { $, Q, W, H, FPS, DUREE, clamp } from './outils.js';
import { placerCamera } from './camera.js';
import { creerStudio } from './studio.js';
import { creerGrille } from './grille.js';
import { creerRegie } from './regie.js';
import { creerParticules } from './particules.js';
import { creerHabillage, majHabillage } from './habillage.js';
import { partition } from './sons.js';

const RENDER = Q.has('render');

async function boot() {
  await Promise.all(['300px "Insatiable Compressed"', '60px "Insatiable Condensed"', '600 20px "JetBrains Mono"', '600 20px "Inter Tight"'].map((s) => document.fonts.load(s)));
  await document.fonts.ready;
  const police = new Font(await new Promise((ok, ko) => new TTFLoader().load('assets/InsatiableDisplay-BoldCompressed.ttf', ok, undefined, ko)));

  const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x061c1b);
  scene.fog = new THREE.FogExp2(0x061c1b, 0.012);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;
  const contre = new THREE.DirectionalLight(0x5fa89c, 2.2);
  contre.position.set(-6, 4, -8);
  scene.add(contre, new THREE.AmbientLight(0x0f3d3a, 0.6));

  const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 400);
  const studio = creerStudio(scene, police);
  const grille = creerGrille(scene);
  const regie = creerRegie(scene);
  const particules = creerParticules(scene, regie, studio.infos);
  const hab = creerHabillage();

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.5, 0.85));
  composer.addPass(new OutputPass());

  async function render(t) {
    t = clamp(t, 0, DUREE);
    const f = Math.round(t * FPS);
    placerCamera(camera, t);
    camera.updateMatrixWorld();
    studio.maj(t);
    grille.maj(t, camera);
    regie.maj(t);
    particules.maj(t);
    composer.render();
    majHabillage(hab, t, f, { camera, regie });
  }

  window.__render = render;
  window.__sons = partition();
  window.__ready = true;
  if (RENDER) { await render(0); return; }

  const fit = () => { $('stage').style.transform = `scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
  fit();
  addEventListener('resize', fit);
  const fixe = Q.get('t');
  if (fixe !== null) { await render(Number(fixe)); return; }
  const debut = performance.now();
  const boucle = async (now) => { await render(((now - debut) / 1000) % DUREE); requestAnimationFrame(boucle); };
  requestAnimationFrame(boucle);
}

boot();
