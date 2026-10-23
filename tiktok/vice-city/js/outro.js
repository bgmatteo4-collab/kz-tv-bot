// Outro : la jaquette officielle en 3D (date chiffre par chiffre, plateformes), puis un portable
// qui s'ouvre sur la chaîne YouTube de Kayzx ; le curseur clique sur « S'abonner ».
// Tous les instants viennent de la voix (s13, s14).
import { clamp, lerp, prog, tw, E, ressort, style, vis, el, $ } from './outils.js';

const CHAINE = {
  nom: 'KAYZX TV', pseudo: '@kayzxtv8505', abonnes: 168, videos: 5,
  liste: [['T4A4GBpbYYE', 'KAYZX LOFFY #3', '298 vues'], ['EkerEV8D940', 'KAYZX LOFFY #2', '222 vues'], ['i4udWARkFrI', 'KAYZX - LOFFY #1', '179 vues']],
};
const CLOCHE = '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3a1.5 1.5 0 0 0-3 0v1.16A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/></svg>';

export function creerOutro(T) {
  const L = (id) => T.ligne(id), m = T.mot;
  const R = {
    debut: L('s12').fin + 0.35,                 // la carte s'efface
    jaq: L('s13').debut - 0.9,                  // la jaquette arrive
    chiffres: m('s13', 'dix-neuf') - 0.1,
    ps: m('s13', 'playstation'), xbox: m('s13', 'xbox'),
    bascule: L('s14').debut - 0.7,              // la jaquette s'en va, le portable arrive
    ouvre: L('s14').debut - 0.35,
    clic: m('s14', 'abonne') + 0.15,
  };
  R.allume = R.ouvre + 1.0;

  const o = $('outro');
  o.innerHTML = `
    <div id="o-fond"></div>
    <div id="o-scene">
      <div id="jaq"><img src="medias/jaquette-hd.jpg" alt=""><div class="jaq-lum"></div></div>
      <div id="pc"><div id="pc-pivot">
        <div class="pc-socle"><div class="pc-clavier"></div><div class="pc-pave"></div></div>
        <div id="pc-ecran">
          <div class="pc-dos"></div>
          <div class="pc-face"><div class="pc-dalle">
            <div class="yt">
              <div class="yt-barre"><span class="yt-logo"><i></i>YouTube</span><span class="yt-recherche">Rechercher</span></div>
              <div class="yt-banniere"></div>
              <div class="yt-tete">
                <img class="yt-avatar" src="medias/chaine/avatar.jpg" alt="">
                <div class="yt-infos"><b>${CHAINE.nom}</b><span>${CHAINE.pseudo} · <em id="yt-abo">${CHAINE.abonnes}</em> abonnés · ${CHAINE.videos} vidéos</span>
                  <div id="yt-bouton"><span class="b-txt">S’abonner</span><span class="b-cloche">${CLOCHE}</span><span id="yt-onde"></span></div></div>
              </div>
              <div class="yt-onglets"><span>Accueil</span><span class="actif">Vidéos</span><span>Shorts</span><span>Playlists</span></div>
              <div class="yt-grille">${CHAINE.liste.map(([id, titre, vues]) => `<div class="yt-video"><img src="medias/chaine/${id}.jpg" alt=""><b>${titre}</b><span>${vues} · il y a 2 ans</span></div>`).join('')}</div>
            </div>
            <div class="pc-noir"></div><div class="pc-reflet"></div>
          </div></div>
        </div>
      </div></div>
    </div>
    <div id="o-date">${'19.11.2026'.split('').map((c) => `<span class="o-c${c === '.' ? ' point' : ''}"><i>${c}</i></span>`).join('')}</div>
    <div id="o-plateformes"><span class="pl ps">PS5</span><span class="pl xb">XBOX SERIES X|S</span><small class="pl pc">PC : RIEN D’ANNONCÉ AU LANCEMENT</small></div>
    <div id="o-titre"><div class="t-sur">Ne rate aucun dossier</div><div class="t-grand">Abonne-toi</div><div class="t-serif">sur YouTube.</div></div>
    <svg id="curseur" viewBox="0 0 24 24" width="64" height="64"><path d="M4 2l15 11.5-6.6 1.1 4 7.6-3 1.5-4-7.7L4 21z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  const chiffres = [...o.querySelectorAll('.o-c i')];
  const vids = [...o.querySelectorAll('.yt-video')];
  const morceaux = ['.yt-barre', '.yt-banniere', '.yt-tete', '.yt-onglets'].map((s) => o.querySelector(s));
  const titre = [...$('o-titre').children];
  let abonne = false;

  function dessiner(t) {
    const a = tw(t, R.debut, 0.8, E.doux);
    vis(o, a > 0 ? 1 : 0);
    if (a <= 0) return 0;
    vis($('o-fond'), a);

    // La jaquette : arrive du fond en pivotant, dérive lentement ; un reflet balaie sa surface.
    const ja = ressort(t - R.jaq, 120, 16), sort = E.traversee(prog(t, R.bascule, 0.9));
    vis($('jaq'), t > R.jaq ? clamp((t - R.jaq) * 4) * (1 - clamp(sort * 1.3)) : 0);
    style($('jaq'), 'transform', `translate3d(${(250 - 900 * sort).toFixed(1)}px,${(600 + 40 * (1 - ja)).toFixed(1)}px,${(-1400 * (1 - ja)).toFixed(1)}px) rotateY(${(lerp(-80, -12, ja) + 14 * E.doux(prog(t, R.jaq + 0.6, 4)) - 40 * sort).toFixed(2)}deg) rotateX(${(4 * (1 - ja)).toFixed(2)}deg)`);
    const lum = prog(t, R.jaq + 0.8, 1.1);
    style(o.querySelector('.jaq-lum'), 'transform', `translate3d(${lerp(-160, 160, E.traversee(lum)).toFixed(1)}%,0,0) skewX(-18deg)`);

    // La date, chiffre par chiffre ; les plateformes quand la voix les nomme.
    const dSort = E.entree(prog(t, R.bascule, 0.45));
    chiffres.forEach((c, i) => style(c, 'transform', `translate3d(0,${(110 * (1 - tw(t, R.chiffres + i * 0.06, 0.6)) - 110 * dSort).toFixed(1)}%,0)`));
    const pl = [[o.querySelector('.ps'), R.ps], [o.querySelector('.xb'), R.xbox], [o.querySelector('.pc'), R.xbox + 0.5]];
    for (const [e, t0] of pl) {
      const p = ressort(t - t0, 180, 18);
      vis(e, t > t0 ? clamp((t - t0) * 6) * (1 - dSort) : 0);
      style(e, 'transform', `translate3d(0,${(24 * (1 - p)).toFixed(1)}px,0) scale(${lerp(0.8, 1, p).toFixed(4)})`);
    }

    // Le portable : monte du bas, l'écran s'ouvre sur sa charnière, s'allume ; la caméra s'approche.
    const pm = ressort(t - R.bascule - 0.2, 110, 17);
    vis($('pc'), t > R.bascule ? 1 : 0);
    const proche = E.doux(prog(t, R.allume, 5));
    style($('pc'), 'transform', `translate3d(0,${(900 * (1 - pm) - 40 * proche).toFixed(1)}px,0) scale(${lerp(0.94, 1.06, proche).toFixed(4)})`);
    style($('pc-pivot'), 'transform', `rotateX(-20deg) rotateY(${lerp(16, -3, E.doux(prog(t, R.bascule, 4))).toFixed(2)}deg)`);
    const ouv = E.sortie(prog(t, R.ouvre, 1.1));
    style($('pc-ecran'), 'transform', `rotateX(${lerp(-90, 10, ouv).toFixed(2)}deg)`);
    vis(o.querySelector('.pc-noir'), 1 - tw(t, R.allume - 0.1, 0.35));
    morceaux.forEach((e, i) => vis(e, tw(t, R.allume + 0.05 + i * 0.07, 0.3)));
    vids.forEach((v, i) => {
      const p = tw(t, R.allume + 0.35 + i * 0.09, 0.45);
      vis(v, p); style(v, 'transform', `translate3d(0,${(26 * (1 - p)).toFixed(1)}px,0)`);
    });

    // Le curseur glisse vers « S'abonner », clique ; le bouton passe à « Abonné », la cloche sonne.
    const btn = $('yt-bouton'), r = btn.getBoundingClientRect();
    const [bx, by] = [r.left + r.width * 0.42, r.top + r.height * 0.55];
    const cm = E.traversee(prog(t, R.clic - 1.2, 1.1));
    vis($('curseur'), t > R.clic - 1.25 ? clamp((t - R.clic + 1.25) * 5) * (1 - prog(t, R.clic + 1.4, 0.4)) : 0);
    const cx = lerp(980, bx, cm) + Math.sin(cm * Math.PI) * -60, cy = lerp(1500, by, cm) + Math.sin(cm * Math.PI) * 40;
    const appui = t > R.clic - 0.06 && t < R.clic + 0.1 ? 0.88 : 1;
    style($('curseur'), 'transform', `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0) scale(${appui})`);
    const fait = t >= R.clic;
    if (fait !== abonne) {
      abonne = fait;
      btn.classList.toggle('fait', fait);
      btn.querySelector('.b-txt').textContent = fait ? 'Abonné' : 'S’abonner';
      $('yt-abo').textContent = fait ? CHAINE.abonnes + 1 : CHAINE.abonnes;
    }
    style(btn, 'transform', `scale(${(t > R.clic - 0.06 && t < R.clic + 0.12 ? 0.93 : 1 + 0.06 * Math.exp(-(t - R.clic) * 6) * (t > R.clic ? 1 : 0)).toFixed(4)})`);
    const onde = prog(t, R.clic, 0.6);
    vis($('yt-onde'), onde > 0 && onde < 1 ? 1 - onde : 0);
    style($('yt-onde'), 'transform', `translate(-50%,-50%) scale(${(0.2 + 2.4 * onde).toFixed(3)})`);
    const cl = t - R.clic - 0.15;
    style(btn.querySelector('.b-cloche'), 'transform', `rotate(${(cl > 0 ? 22 * Math.sin(cl * 28) * Math.exp(-cl * 4) : 0).toFixed(2)}deg)`);

    // Titre du portable.
    titre.forEach((e, i) => {
      const p = tw(t, R.ouvre + 0.2 + i * 0.12, 0.7);
      vis(e, p); style(e, 'transform', `translate3d(0,${(40 * (1 - p)).toFixed(1)}px,0)`);
    });
    return a;
  }
  return { R, dessiner, enMouvement: (t) => (t > R.jaq && t < R.jaq + 1.2) || (t > R.bascule && t < R.ouvre + 1.2) || (t > R.clic - 1.2 && t < R.clic) };
}
