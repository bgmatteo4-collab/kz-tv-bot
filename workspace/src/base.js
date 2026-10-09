// Kayzx Studio — moteur commun : ressorts à la Apple, projection d'élan, apparitions, toast.
// Toutes les sections l'utilisent via window.KS (seul objet global de la page).
(() => {
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const actifs = new Set();
  let enCours = false, dernier = 0;

  // Ressort Apple : « réponse » (s) et « amortissement » (1 = critique, < 1 = rebond).
  // raideur = (2π / réponse)², frottement = 4π·ζ / réponse. Il repart toujours de la valeur affichée.
  function ressort(v0 = 0, { reponse = 0.35, amorti = 1, surMaj = null } = {}) {
    const r = {
      valeur: v0, vitesse: 0, but: v0, reponse, amorti, surMaj,
      cible(v, { vitesse = null, reponse: rp = null, amorti: am = null } = {}) {
        r.but = v;
        if (vitesse !== null) r.vitesse = vitesse;
        if (rp !== null) r.reponse = rp;
        if (am !== null) r.amorti = am;
        if (reduit) { r.fixer(v); return r; }
        actifs.add(r);
        lancer();
        return r;
      },
      fixer(v) { r.valeur = r.but = v; r.vitesse = 0; actifs.delete(r); r.surMaj && r.surMaj(v, r); return r; },
      pas(dt) {
        const k = (2 * Math.PI / r.reponse) ** 2, c = 4 * Math.PI * r.amorti / r.reponse;
        // Intégration semi-implicite en sous-pas de 4 ms : stable même à 30 i/s.
        let reste = dt;
        while (reste > 0) {
          const h = Math.min(reste, 0.004);
          r.vitesse += (-k * (r.valeur - r.but) - c * r.vitesse) * h;
          r.valeur += r.vitesse * h;
          reste -= h;
        }
        if (Math.abs(r.vitesse) < 0.001 && Math.abs(r.valeur - r.but) < 0.0005) { r.valeur = r.but; r.vitesse = 0; actifs.delete(r); }
        r.surMaj && r.surMaj(r.valeur, r);
      },
    };
    return r;
  }
  function lancer() {
    if (enCours) return;
    enCours = true;
    dernier = performance.now();
    requestAnimationFrame(boucle);
  }
  function boucle(now) {
    const dt = Math.min(0.05, (now - dernier) / 1000);
    dernier = now;
    for (const r of [...actifs]) r.pas(dt);
    if (actifs.size) requestAnimationFrame(boucle); else enCours = false;
  }

  // Projection d'élan (Apple, « Designing Fluid Interfaces ») : où le geste s'arrêterait.
  const projeter = (vitesse, d = 0.998) => (vitesse / 1000) * d / (1 - d);

  // Suivi de vitesse d'un glisser : garder les derniers points (100 ms).
  function suiveur() {
    const pts = [];
    return {
      ajouter(x, y = 0) { const t = performance.now(); pts.push({ x, y, t }); while (pts.length > 2 && t - pts[0].t > 100) pts.shift(); },
      vitesse() {
        if (pts.length < 2) return { x: 0, y: 0 };
        const a = pts[0], b = pts[pts.length - 1], dt = (b.t - a.t) / 1000 || 1;
        return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
      },
      vider() { pts.length = 0; },
    };
  }

  // Apparition au défilement : l'élément reste visible ; s'il est sous la ligne de flottaison au
  // chargement, il est simplement décalé de 28 px et glisse en place quand il arrive.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const r = e.target.__monte;
      if (r) setTimeout(() => r.cible(0), (+e.target.dataset.retard || 0));
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  function monte(el, retard = 0) {
    if (reduit || !io) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < innerHeight * 0.92) return; // déjà à l'écran : rien à faire
    el.dataset.retard = retard;
    el.__monte = ressort(28, { reponse: 0.55, surMaj: (v) => { el.style.transform = v ? `translateY(${v.toFixed(2)}px)` : ''; } });
    el.style.transform = 'translateY(28px)';
    io.observe(el);
  }

  // Toast en bas d'écran, avec retour « Annuler » facultatif.
  let toastEl = null, toastR = null, minuteur = 0;
  function toast(texte, { action = null, surAction = null, duree = 2600 } = {}) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ks-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
      toastR = ressort(1, { reponse: 0.4, surMaj: (v) => {
        toastEl.style.transform = `translate(-50%, ${(v * 120).toFixed(1)}px)`;
        toastEl.style.opacity = String(Math.max(0, 1 - v));
      } });
      toastR.fixer(1);
    }
    toastEl.innerHTML = '';
    const s = document.createElement('span');
    s.textContent = texte;
    toastEl.appendChild(s);
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lien'; b.textContent = action;
      b.addEventListener('click', () => { surAction && surAction(); toastR.cible(1); });
      toastEl.appendChild(b);
    }
    toastR.cible(0);
    clearTimeout(minuteur);
    minuteur = setTimeout(() => toastR.cible(1), duree);
  }

  // Copier dans le presse-papiers, avec repli si l'accès est refusé.
  async function copier(texte, quoi = 'Copié') {
    try { await navigator.clipboard.writeText(texte); toast(quoi); }
    catch { toast('Copie impossible ici : sélectionne le texte à la main.'); }
  }

  window.KS = { ressort, projeter, suiveur, monte, toast, copier, reduit };
})();
