// Tableau 1 (et final) : le logo KAYZX TV en chrome, la sphère dorée (le voyant du
// direct), des anneaux et des éclats sarcelle. Tout bouge en mouvements périodiques
// sur 90 s, pour que l'état à t = 90 soit celui de t = 0.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { TAU, DUREE, onde, prog, E, lerp, mulberry } from './outils.js';
import { REGIE } from './camera.js';

export function creerStudio(scene, police) {
  const groupe = new THREE.Group();
  scene.add(groupe);

  const metal = new THREE.MeshStandardMaterial({ color: 0x93a6a4, metalness: 1, roughness: 0.34, envMapIntensity: 0.65, transparent: true });
  const geo = new TextGeometry('KAYZX TV', {
    font: police, size: 2.3, depth: 0.6, curveSegments: 8,
    bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.05, bevelSegments: 3,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const largeur = bb.max.x - bb.min.x, hauteur = bb.max.y - bb.min.y;
  geo.translate(-(bb.min.x + largeur / 2) + 0.95, -(bb.min.y + hauteur / 2), -0.3);
  const texte = new THREE.Mesh(geo, metal);
  groupe.add(texte);

  // Le point doré, à gauche du nom, comme dans l'intro de la chaîne
  const or = new THREE.MeshStandardMaterial({ color: 0xe3a83b, metalness: 0.85, roughness: 0.22, emissive: 0xe3a83b, emissiveIntensity: 0.9, transparent: true });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 32), or);
  sphere.position.set(-largeur / 2 + 0.95 - 1.35, 0, 0);
  groupe.add(sphere);
  const lumiere = new THREE.PointLight(0xe3a83b, 40, 14, 2);
  lumiere.position.copy(sphere.position).add(new THREE.Vector3(0.4, 0.6, 1.6));
  groupe.add(lumiere);

  const orFin = new THREE.MeshStandardMaterial({ color: 0xf2c76e, metalness: 1, roughness: 0.25, emissive: 0xe3a83b, emissiveIntensity: 0.55, transparent: true });
  const anneau1 = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.03, 12, 140), orFin);
  const anneau2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 12, 160), orFin);
  anneau1.position.copy(sphere.position);
  anneau2.position.copy(sphere.position);
  groupe.add(anneau1, anneau2);
  const grandAnneau = new THREE.Mesh(new THREE.TorusGeometry(7.4, 0.025, 12, 260), orFin);
  groupe.add(grandAnneau);

  // Éclats sarcelle en orbite lente
  const N = 70, rnd = mulberry(42);
  const tealMat = new THREE.MeshStandardMaterial({ color: 0x1f6f66, metalness: 0.9, roughness: 0.3, emissive: 0x0f3d3a, emissiveIntensity: 0.6, transparent: true });
  const eclats = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.22, 0), tealMat, N);
  const graines = Array.from({ length: N }, () => ({
    r: 6 + rnd() * 7, a: rnd() * TAU, y: (rnd() - 0.5) * 7, tours: 1 + Math.floor(rnd() * 2), sens: rnd() < 0.5 ? -1 : 1,
    rot: 2 + Math.floor(rnd() * 6), echelle: 0.5 + rnd() * 1.3, z: (rnd() - 0.5) * 6,
  }));
  groupe.add(eclats);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  const mats = [metal, or, orFin, tealMat];

  return {
    groupe,
    // Les points où les particules du final viennent se poser (face avant du nom + sphère).
    infos: { largeur, hauteur, decalage: 0.95, sphere: sphere.position.clone() },
    maj(t) {
      // Le studio est à l'origine pendant le tableau 1, puis attend à la régie pour le final.
      const final = t >= 45;
      groupe.visible = t < 30 || t >= 84;
      groupe.position.copy(final ? REGIE : new THREE.Vector3());
      const op = final ? E.doux(prog(t, 86.4, 3.4)) : 1;
      for (const mt of mats) mt.opacity = op;
      lumiere.intensity = 40 * op;

      texte.rotation.y = 0.07 * onde(t, 1, 0.4);
      texte.position.y = 0.06 * onde(t, 2);
      or.emissiveIntensity = 0.75 + 0.35 * (0.5 + 0.5 * onde(t, 45));
      anneau1.rotation.set(1.1 + 0.2 * onde(t, 2), (TAU * 6 * t) / DUREE, 0);
      anneau2.rotation.set(0.5, 0.4 + 0.3 * onde(t, 3), (-TAU * 4 * t) / DUREE);
      grandAnneau.rotation.set(1.32 + 0.05 * onde(t, 1), 0.18 * onde(t, 1, 1), (TAU * t) / DUREE);
      const apparition = final ? E.out(prog(t, 85.5, 3.5)) : 1;
      graines.forEach((g, i) => {
        const a = g.a + (g.sens * TAU * g.tours * t) / DUREE;
        pos.set(Math.cos(a) * g.r, g.y + 0.3 * onde(t, 4, i), Math.sin(a) * g.r * 0.55 + g.z - 3);
        e.set((TAU * g.rot * t) / DUREE + i, (TAU * (g.rot + 1) * t) / DUREE, i * 0.7);
        q.setFromEuler(e);
        s.setScalar(g.echelle * apparition);
        m.compose(pos, q, s);
        eclats.setMatrixAt(i, m);
      });
      eclats.instanceMatrix.needsUpdate = true;
    },
  };
}
