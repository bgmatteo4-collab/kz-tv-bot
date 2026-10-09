// Tableau 4 : « le rassemblement ». Les écrans de la régie se dissolvent en
// particules qui tourbillonnent autour du point de régie, puis se posent sur la
// forme du logo, là où le vrai logo réapparaît pour boucler sur la première image.
import * as THREE from 'three';
import { prog, E, mulberry } from './outils.js';
import { REGIE } from './camera.js';

const N = 26000;

// Points tirés au hasard dans les lettres du nom, dessinées en 2D avec la même police.
function pointsDuNom(infos, rnd, n) {
  const c = document.createElement('canvas');
  c.width = 1600; c.height = 400;
  const ctx = c.getContext('2d');
  ctx.font = '330px "Insatiable Compressed"';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText('KAYZX TV');
  const x0 = (1600 - m.width) / 2, base = 330;
  ctx.fillText('KAYZX TV', x0, base);
  const d = ctx.getImageData(0, 0, 1600, 400).data;
  const haut = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, top = base - m.actualBoundingBoxAscent;
  const pts = [];
  let essais = 0;
  while (pts.length < n && essais < n * 40) {
    essais++;
    const px = x0 + rnd() * m.width, py = top + rnd() * haut;
    if (d[((py | 0) * 1600 + (px | 0)) * 4 + 3] > 128) {
      pts.push([
        -infos.largeur / 2 + infos.decalage + ((px - x0) / m.width) * infos.largeur,
        infos.hauteur / 2 - ((py - top) / haut) * infos.hauteur,
        0.32 + (rnd() - 0.5) * 0.2,
      ]);
    }
  }
  return pts;
}

export function creerParticules(scene, regie, infos) {
  const rnd = mulberry(7);
  const depart = new Float32Array(N * 3), cible = new Float32Array(N * 3), hasard = new Float32Array(N * 3), couleur = new Float32Array(N * 3);

  // Départs : répartis sur la surface des écrans (position finale de chaque écran).
  const surfaces = regie.meshes.map((s) => ({ s, aire: s.larg * s.haut }));
  const total = surfaces.reduce((a, b) => a + b.aire, 0);
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const nom = pointsDuNom(infos, rnd, Math.floor(N * 0.86));
  const teal = new THREE.Color(0x9ccfc5), teal2 = new THREE.Color(0x5fa89c), or = new THREE.Color(0xf2c76e), tmp = new THREE.Color();

  for (let i = 0; i < N; i++) {
    let r = rnd() * total, k = 0;
    while (r > surfaces[k].aire && k < surfaces.length - 1) { r -= surfaces[k].aire; k++; }
    const s = surfaces[k].s;
    v.set((rnd() - 0.5) * s.larg, (rnd() - 0.5) * s.haut, 0);
    e.set(0, s.rotY, 0); q.setFromEuler(e); v.applyQuaternion(q).add(REGIE).add(s.dec);
    depart.set([v.x, v.y, v.z], i * 3);

    if (i < nom.length) cible.set([nom[i][0] + REGIE.x, nom[i][1] + REGIE.y, nom[i][2] + REGIE.z], i * 3);
    else {
      // le reste sur la sphère dorée
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, rr = Math.sqrt(1 - u * u) * 0.62;
      cible.set([infos.sphere.x + REGIE.x + Math.cos(a) * rr, infos.sphere.y + REGIE.y + u * 0.62, infos.sphere.z + REGIE.z + Math.sin(a) * rr], i * 3);
    }
    hasard.set([rnd(), rnd(), rnd()], i * 3);
    const dore = i >= nom.length || rnd() < 0.22;
    tmp.copy(dore ? or : rnd() < 0.5 ? teal : teal2);
    couleur.set([tmp.r, tmp.g, tmp.b], i * 3);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(depart, 3));
  geo.setAttribute('aCible', new THREE.BufferAttribute(cible, 3));
  geo.setAttribute('aHasard', new THREE.BufferAttribute(hasard, 3));
  geo.setAttribute('aCouleur', new THREE.BufferAttribute(couleur, 3));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uP: { value: 0 }, uT: { value: 0 }, uAlpha: { value: 0 }, uCentre: { value: REGIE.clone() } },
    vertexShader: /* glsl */`
      uniform float uP, uT; uniform vec3 uCentre;
      attribute vec3 aCible, aHasard, aCouleur;
      varying vec3 vC; varying float vA;
      void main() {
        float d = aHasard.x * 0.3;
        float q = clamp((uP - d) / 0.7, 0.0, 1.0);
        float s1 = smoothstep(0.0, 0.55, q), s2 = smoothstep(0.5, 1.0, q);
        vec3 rel = position - uCentre;
        float ang = atan(rel.z, rel.x) + aHasard.y * 6.2831 + uT * (0.35 + 0.5 * aHasard.z) * (1.0 - s2);
        float ray = mix(length(rel.xz), 5.0 + 6.0 * aHasard.z, s1);
        vec3 tourbillon = uCentre + vec3(cos(ang) * ray, rel.y * (1.0 - s1) + sin(ang * 1.7 + aHasard.x * 9.0) * 2.4 * s1, sin(ang) * ray * 0.7);
        vec3 p = mix(position, tourbillon, s1);
        p = mix(p, aCible, s2 * s2 * (3.0 - 2.0 * s2));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.6 + 2.2 * aHasard.z) * (24.0 / -mv.z) * (1.0 + 0.6 * (1.0 - s2) * s1);
        vC = aCouleur;
        vA = 0.55 + 0.45 * aHasard.y;
      }`,
    fragmentShader: /* glsl */`
      uniform float uAlpha; varying vec3 vC; varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float r = dot(c, c);
        if (r > 0.25) discard;
        gl_FragColor = vec4(vC * 1.6, uAlpha * vA * smoothstep(0.25, 0.0, r));
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  return {
    maj(t) {
      const actif = t > 63.2;
      points.visible = actif;
      if (!actif) return;
      mat.uniforms.uP.value = E.doux(prog(t, 63.6, 24.4));
      mat.uniforms.uT.value = t - 63.2;
      mat.uniforms.uAlpha.value = E.out(prog(t, 63.4, 1.6)) * (1 - E.doux(prog(t, 87.2, 2.5)));
    },
  };
}
