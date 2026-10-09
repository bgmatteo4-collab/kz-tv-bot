// Tableau 2 : « le signal ». Une grille de barres lumineuses qui ondulent comme un
// égaliseur, survolée par la caméra. Tout se calcule dans le shader (la hauteur de
// chaque barre dépend de sa position et du temps), le processeur ne fait presque rien.
import * as THREE from 'three';
import { prog, E } from './outils.js';

const PAS = 1.5, X0 = -30, X1 = 30, Z0 = -150, Z1 = -4;

export function creerGrille(scene) {
  const cols = Math.round((X1 - X0) / PAS) + 1, rangs = Math.round((Z1 - Z0) / PAS) + 1;
  const n = cols * rangs;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uT: { value: 0 }, uOpacite: { value: 0 },
      uFond: { value: new THREE.Color(0x061c1b) }, uBas: { value: new THREE.Color(0x0b2f2d) },
      uHaut: { value: new THREE.Color(0x1f6f66) }, uOr: { value: new THREE.Color(0xe3a83b) },
      uCam: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */`
      uniform float uT; uniform vec3 uCam;
      varying float vH; varying float vHaut; varying float vBrume; varying float vPulse;
      void main() {
        vec3 base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float x = base.x, z = base.z;
        float onde1 = 0.5 + 0.5 * sin(x * 0.33 + uT * 1.2);
        float onde2 = 0.5 + 0.5 * sin(z * 0.21 - uT * 0.85);
        float anneau = pow(0.5 + 0.5 * sin(length(vec2(x, z + 70.0)) * 0.24 - uT * 2.1), 6.0);
        float h = 0.3 + 1.9 * onde1 * onde2 + 2.0 * anneau;
        vec3 p = position;
        p.y = (p.y + 0.5) * h;
        vec4 mv = viewMatrix * vec4(base + p, 1.0);
        gl_Position = projectionMatrix * mv;
        vH = h;
        vHaut = position.y + 0.5;
        vBrume = smoothstep(16.0, 75.0, -mv.z);
        float d = mod(z - uT * 16.0, 34.0) - 17.0;
        float lane = step(0.5, fract(x / 6.0 + 0.25)) ;
        vPulse = exp(-d * d / 3.0) * lane;
      }`,
    fragmentShader: /* glsl */`
      uniform float uOpacite; uniform vec3 uFond, uBas, uHaut, uOr;
      varying float vH; varying float vHaut; varying float vBrume; varying float vPulse;
      void main() {
        float k = clamp(vHaut * vH / 4.5, 0.0, 1.0);
        vec3 c = mix(uBas, uHaut, k);
        c *= 0.55 + 0.45 * vHaut;
        c += uOr * (pow(vHaut, 10.0) * clamp(vH / 3.0 - 0.3, 0.0, 1.0) * 1.1 + vPulse * 1.2 * pow(vHaut, 3.0));
        c = mix(c, uFond, vBrume);
        gl_FragColor = vec4(c, uOpacite);
      }`,
  });
  const barres = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 1, 0.62), mat, n);
  const m = new THREE.Matrix4();
  let i = 0;
  for (let r = 0; r < rangs; r++) for (let c = 0; c < cols; c++) {
    m.makeTranslation(X0 + c * PAS, -17, Z0 + r * PAS);
    barres.setMatrixAt(i++, m);
  }
  barres.frustumCulled = false;
  scene.add(barres);

  return {
    maj(t, camera) {
      const op = E.doux(prog(t, 16.5, 5)) * (1 - E.doux(prog(t, 45.5, 5)));
      barres.visible = op > 0.001;
      mat.uniforms.uOpacite.value = op;
      mat.uniforms.uT.value = t;
      mat.uniforms.uCam.value.copy(camera.position);
    },
  };
}
