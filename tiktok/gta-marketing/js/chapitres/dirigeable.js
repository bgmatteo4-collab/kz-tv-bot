// Coup n° 2 — le dirigeable Goodyear aux couleurs de Vice City, au-dessus de la baie.
// « Deux : un dirigeable Vice City dans le ciel de Floride. »
//
// 1. La caméra se pose sur l'épingle 2, très inclinée (on regarde le ciel) ; la photo du
//    dirigeable (paysage) sort de l'épingle et monte dans le haut de l'image.
// 2. Elle DÉRIVE : vitesse constante vers la gauche, comme le dirigeable (nez à gauche), avec un
//    léger tangage ; sur « Vice City », poussée lente vers le lettrage peint sur l'enveloppe.
// 3. Sur « dans le ciel de Floride », Miami de nuit sort de l'épingle au premier plan : on part
//    serré sur le dirigeable éclairé et on recule jusqu'aux tours ; le jour passe au second plan.
//    Sur « ciel », un anneau cerise désigne le dirigeable au-dessus de la ville.
// 4. Tout rentre dans l'épingle, la caméra repart.
import { C, rgba, clamp, lerp, prog, E, ressort, style } from '../outils.js';
import { carte, placer } from '../photos.js';
import { EPINGLES, ecranEpingle } from '../epingles.js';

// Repères dans les images (fractions de la largeur et de la hauteur).
const JOUR = { src: 'medias/creapills-74.jpeg', lettrage: [0.545, 0.46] };   // « Vice city » sur l'enveloppe
// 1024 × 576 seulement : jamais plus de ~900 px affichés (largeur du cadre × kb).
const NUIT = { src: 'medias/vice-45.jpg', dirigeable: [0.483, 0.477], demi: [0.112, 0.042] };

export default function creer(T) {
  const c = T.chap.dirigeable, m = (mot, k) => T.mot('c2', mot, k);
  const tA = m('dirigeable') - 0.15;    // la photo du dirigeable sort de l'épingle
  const tV = m('Vice City') - 0.08;     // poussée vers le lettrage « Vice city »
  const tN = m('dans') - 0.1;           // Miami de nuit sort de l'épingle
  const tF = m('ciel') - 0.05;          // anneau sur le dirigeable éclairé
  const tS = c.tenue - 0.05;            // tout rentre dans l'épingle
  const ep = EPINGLES.find((e) => e.chap === 'dirigeable');

  const blocs = [
    { sortie: c.tenue + 0.2, lignes: [[['02', m('Deux'), 'num'], ['Un', m('un dirigeable')], ['dirigeable', m('dirigeable')]], [['“Vice City”.', m('Vice City'), 'accent']]] },
  ];

  let jour, nuit;
  function preparer() {
    jour = carte(JOUR.src);
    nuit = carte(NUIT.src);
  }

  // Cadres. Aucune épingle ne doit être coupée par un bord de photo : les épingles 2, 3, 7 et 5
  // (y ≈ 1045 → 1157 à l'écran) sont entièrement couvertes par le jour (bas ≈ 1166), puis par la
  // nuit (gauche ≤ 372, droite ≥ 868, bas ≈ 1245, juste au-dessus de la légende) ; le jour ne
  // recule qu'une fois la nuit en place. Le haut du jour est à ~70 px sous les titres (~40 après
  // son recul).
  // Vitesses de dérive en px/s, vers la gauche (le sens du dirigeable).
  const J = { x: 625, y: 899, w: 800, h: 534, vitesse: 55 };
  const N = { x: 624, y: 1098, w: 520, h: 293, vitesse: 12 };

  function dessiner(t, X) {
    if (t < tA - 0.1 || t > tS + 0.6) return;
    const [px, py] = ecranEpingle(X.P, ep);
    const retour = E.entree(prog(t, tS, 0.4));
    const rentre = (o) => (retour <= 0 ? o
      : { ...o, x: lerp(o.x, px, retour), y: lerp(o.y, py, retour), s: o.s * (1 - 0.9 * retour), a: o.a * (1 - retour * retour) });

    // --- Le dirigeable, de jour : sort de l'épingle, monte, dérive.
    const e = ressort(t - tA, 170, 20);
    if (e > 0.001) {
      const vol = t - tA;
      let x = J.x - J.vitesse * vol, y = J.y + 4 * Math.sin(vol * 2.2 - 0.9);
      let s = 1, r = -0.7 + 0.25 * Math.sin(vol * 2.2);
      // Quand la nuit est en place, le jour recule d'un plan et remonte : sa nacelle reste
      // nettement au-dessus de la nuit (pas de tangence), le haut du cadre à ~40 px des titres.
      const recul = E.doux(prog(t, tN + 0.15, 0.9));
      s *= 1 - 0.14 * recul; y -= 62 * recul;
      x = lerp(px, x, e); y = lerp(py, y, e); s *= lerp(0.1, 1, e);
      const q = E.traversee(prog(t, tV, 1.0));
      const kb = lerp(1.08, 1.3, q);
      // Dans le cadre, l'image glisse aussi vers la gauche : le dirigeable avance un peu plus vite
      // que le cadre qui le suit, comme un cadreur qui le garde dans le champ.
      const kx = -kb * (JOUR.lettrage[0] - 0.5) * 100 * q + 2.5 - 5.5 * prog(t, tA, tS - tA);
      const ky = -kb * (JOUR.lettrage[1] - 0.5) * 100 * q;
      placer(jour, rentre({ x, y, w: J.w, h: J.h, r, s, a: clamp(e * 4), z: 10, kb, kx, ky }));
      // En reculant, le jour s'assombrit un peu : la nuit tombe sur la photo de devant.
      style(jour.img, 'filter', `contrast(1.05) saturate(.9) brightness(${(1 - 0.16 * recul).toFixed(3)})`);
    }

    // --- Miami de nuit : sort de l'épingle au premier plan, recule du dirigeable vers la ville.
    const n = ressort(t - tN, 180, 20);
    let cible = null;
    if (n > 0.001) {
      let x = N.x - N.vitesse * (t - tN), y = N.y, s = 1, r = 1.2;
      x = lerp(px, x, n); y = lerp(py, y, n); s *= lerp(0.1, 1, n);
      // On part serré sur le dirigeable éclairé, puis on recule jusqu'à la baie et aux tours.
      const q = E.doux(prog(t, tN + 0.12, 1.15));
      const kb = lerp(1.58, 1.06, q);
      const [u, v] = NUIT.dirigeable;
      const kx = -kb * (u - 0.5) * 100 * (1 - q), ky = -kb * (v - 0.5) * 100 * (1 - q);
      const o = rentre({ x, y, w: N.w, h: N.h, r, s, a: clamp(n * 4), z: 20, kb, kx, ky });
      placer(nuit, o);
      // Le dirigeable à l'écran : position dans l'image, cadrage, échelle et rotation de la carte.
      const lx = ((u - 0.5) * kb + kx / 100) * N.w * o.s, ly = ((v - 0.5) * kb + ky / 100) * N.h * o.s;
      const rad = (o.r * Math.PI) / 180;
      cible = {
        x: o.x + lx * Math.cos(rad) - ly * Math.sin(rad), y: o.y + lx * Math.sin(rad) + ly * Math.cos(rad),
        rx: NUIT.demi[0] * N.w * kb * o.s, ry: NUIT.demi[1] * N.h * kb * o.s, r: rad, a: o.a,
      };
    }

    // Anneau cerise autour du dirigeable éclairé (il se resserre sur lui).
    const a = clamp(prog(t, tF, 0.25)) * (1 - retour);
    if (cible && a > 0) {
      const g = X.dessus, k = lerp(1.8, 1, E.sortie(prog(t, tF, 0.45)));
      g.save();
      g.globalAlpha = a * cible.a;
      g.lineWidth = 4.5; g.strokeStyle = C.ceriseVif;
      g.shadowColor = rgba(C.cerise, 0.9); g.shadowBlur = 22;
      g.beginPath(); g.ellipse(cible.x, cible.y, (cible.rx + 22) * k, (cible.ry + 20) * k, cible.r, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  const voile = (t) => clamp(prog(t, tA - 0.2, 0.4)) * (1 - prog(t, tS + 0.1, 0.4));
  const legendes = [{ de: tA + 0.3, a: tS, html: 'CIEL DE FLORIDE · OCT. 2026\n<small>PHOTOS CREAPILLS · VICE</small>' }];

  function sons(add) {
    add(tA, 'clic', 0.5);
    add(tA + 0.1, 'souffle', 0.3, { duree: tS - tA + 0.2 });   // le vent pendant la dérive
    add(tV, 'scintille', 0.35);
    add(tN, 'clic', 0.45);
    add(tF, 'ping', 0.4);
    add(tS, 'clic', 0.3);
  }

  return { id: 'dirigeable', blocs, preparer, dessiner, voile, legendes, sons };
}
