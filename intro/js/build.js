// Construit les parties générées du DOM (à partir de CONFIG), découpe les
// textes, puis mesure les positions dont le curseur et le point ont besoin.
'use strict';

const S = {}; // références aux éléments
const P = {}; // positions mesurées, en coordonnées de la scène (1920×1080)

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const CARDS = ['Le Lancement', 'Destination', 'Multivers', 'Rassemblement', 'La Mallette'];
const CARD_AT = [3, 9, 15, 21, 27];

const ICONS = {
  chat: 'M4 5h16v11H10l-5 4v-4H4z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.4-4.2 4.4-6.5 8-6.5s6.6 2.3 8 6.5',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21',
};

function planningSentence() {
  const d = CONFIG.jours.map((i) => JOURS[i]);
  const h = CONFIG.heure.replace(':', 'h');
  if (d.length === 7) return `Tous les jours, ${h} pile.`;
  const list = d.length > 1 ? `${d.slice(0, -1).join(', ')} et ${d[d.length - 1]}` : d[0];
  return `Chaque ${list}, ${h} pile.`;
}

function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

function build() {
  document.querySelectorAll('.js-nom').forEach((e) => { e.textContent = CONFIG.nom; });
  document.querySelectorAll('.js-heure').forEach((e) => { e.textContent = CONFIG.heure; });
  $('hud-brand').textContent = '';
  $('c2-sub').textContent = planningSentence();

  // ── Ouverture
  S.opGrid = $('op-grid'); S.opDef = $('op-def'); S.opPos = $('op-pos'); S.opRule = $('op-rule');
  S.opN1 = $('op-n1'); S.opN2 = $('op-n2');
  S.opL = split($('op-word'), 'letters');
  S.opW1 = split($('op-t1'));
  S.opW2 = split($('op-t2'));

  // ── Cartes de chapitre
  S.cards = CARDS.map((title, i) => {
    const s = el('section', 'scene card', null,
      `<div class="fill" style="background:var(--teal-900)"></div><div class="grid" style="opacity:.45"></div>
       <div class="card-in"><div class="card-lab mono"></div><div class="card-ttl serif"></div><div class="card-rule"></div></div>`);
    $('stage').insertBefore(s, $('ring0'));
    const lab = s.querySelector('.card-lab');
    const chars = [...`Chapitre ${i + 1}`].map((c) => el('span', '', lab, c === ' ' ? '&nbsp;' : c));
    const ttl = s.querySelector('.card-ttl');
    ttl.textContent = title;
    return { el: s, lab: chars, ttl: split(ttl, 'letters'), rule: s.querySelector('.card-rule') };
  });

  // ── Chapitre 1
  S.c1 = {
    cam: $('c1-cam'), icon: $('c1-icon'), bname: $('c1-bname'), bstate: $('c1-bstate'), barwrap: $('c1-barwrap'), bar: $('c1-bar'),
    win: $('c1-win'), inner: $('c1-in'), status: $('c1-status'), stxt: $('c1-stxt'),
    side: [...$('c1-side').children], prev: $('c1-prev'), chat: [...$('c1-chat').children],
    tiles: [...document.querySelectorAll('#s-ch1 .tile')], rate: $('c1-rate'), chips: [...$('c1-chips').children],
    eye: $('c1-eye'), cta1: $('c1-cta1'), cta2: $('c1-cta2'), circle: $('c1-circle'),
  };
  S.c1.h = split($('c1-h'));
  S.c1.ul = el('i', 'ul', $('c1-h').querySelector('em'));
  S.c1.meters = ['Micro', 'Musique'].map((name) => {
    const row = el('div', 'meter', $('c1-meters'), `<span class="mono">${name}</span>`);
    return Array.from({ length: 30 }, () => el('i', '', row));
  });

  // ── Chapitre 2
  S.c2 = {
    cam: $('c2-cam'), cv: $('c2-cv'), left: $('c2-left'), eye: $('c2-eye'), sub: $('c2-sub'),
    panel: $('c2-panel'), led: $('c2-led'), dark: $('c2-dark'),
    rows: [$('tc0'), $('tc1'), $('tc2')], plates: [...document.querySelectorAll('#c2-panel .tc-plate')],
    colons: [$('tc0-c'), $('tc1-c')], note: $('tc1-n'), unit: $('tc2-u'),
  };
  S.c2.ctx = S.c2.cv.getContext('2d');
  S.c2.h = split($('c2-h'));
  S.c2.days = [...'LMMJVSD'].map((c) => el('span', 'day', $('tc-days'), c));
  const two = (id) => [seg7($(id)), seg7($(id))];
  S.c2.d0h = two('tc0-h'); S.c2.d0m = two('tc0-m'); S.c2.d1h = two('tc1-h'); S.c2.d1m = two('tc1-m'); S.c2.dv = two('tc2-v');
  S.c2.gauge = Array.from({ length: 22 }, () => el('i', '', $('tc2-g')));

  // ── Chapitre 3
  S.c3 = {
    cv: $('c3-cv'), cam: $('c3-cam'), eye: $('c3-eye'), sel: $('c3-sel'), box: $('c3-box'),
    code: $('c3-code'), name: $('c3-name'), list: $('c3-list'), hl: $('c3-hl'), dark: $('c3-dark'),
  };
  S.c3.ctx = S.c3.cv.getContext('2d');
  S.c3.h = split($('c3-h'));
  S.c3.cats = CONFIG.categories.map((c) => el('div', 'cat', $('c3-cats'),
    `<div class="cat-code mono">${c.code}</div><i class="cat-orb"></i><div class="cat-name">${c.nom}</div>`));
  S.c3.items = CONFIG.categories.map((c) => el('div', 'sel-item', $('c3-list'), `<span class="mono">${c.code}</span>${c.nom}`));

  // ── Chapitre 4
  S.c4 = { cam: $('c4-cam'), eye: $('c4-eye'), bar: $('c4-bar'), count: $('c4-count'), cta: $('c4-cta'), circle: $('c4-circle') };
  S.c4.h = split($('c4-h'));
  S.c4.hl = el('i', 'hl-bg', null);
  $('c4-h').querySelector('em').prepend(S.c4.hl);
  S.c4.mems = CONFIG.communaute.slice(0, 6).map((m) => el('div', 'mem', $('c4-mems'),
    `<div class="mem-ic"><svg viewBox="0 0 24 24"><path d="${ICONS[m.icone] || ICONS.chat}"/></svg></div>
     <div class="mem-tx"><b>${m.titre}</b><span class="mono">${m.sous}</span></div><i class="gem"></i>`));
  S.c4.memGems = S.c4.mems.map((m) => m.querySelector('.gem'));
  S.c4.gems = Array.from({ length: 6 }, () => el('i', 'gem', $('c4-gems')));

  // ── Chapitre 5
  S.c5 = {
    cv: $('c5-cv'), cam: $('c5-cam'), q: $('c5-q'), kase: $('c5-case'), shadow: $('c5-shadow'), light: $('c5-light'),
    lid: $('c5-lid'), lock: $('c5-lock'), led: $('c5-led'), latchL: $('c5-latch-l'), latchR: $('c5-latch-r'),
    tag: $('c5-tag'), bloom: $('c5-bloom'),
  };
  S.c5.ctx = S.c5.cv.getContext('2d');
  S.c5.qw = split(S.c5.q);
  S.c5.reels = [0, 1, 2].map(() => {
    const r = el('div', 'reel', $('c5-reels'));
    const strip = el('div', 'reel-strip', r);
    for (let i = 0; i < 20; i++) el('b', '', strip, String(i % 10));
    return { win: r, strip, digits: [...strip.children] };
  });

  // ── Fin
  S.end = { cam: $('end-cam'), glow: $('end-glow'), pill: $('end-pill'), pillDot: $('end-pill-dot') };
  S.end.word = split($('end-word'), 'letters');
  S.end.tag = split($('end-tag'));

  // ── Calques globaux
  S.dot = $('dot'); S.rings = [$('ring0'), $('ring1')];
  S.fx = $('fx'); S.fxCtx = S.fx.getContext('2d');
  S.flash = $('flash'); S.cursor = $('cursor'); S.click = $('click');
  S.hud = $('hud'); S.hudPaths = [...document.querySelectorAll('#hud path')];
  S.hudDot = document.querySelector('#hud-tl i');
  S.hudTxt = { brand: $('hud-brand'), tr: $('hud-tr'), bl: $('hud-bl'), br: $('hud-br') };
  S.hudProg = $('hud-prog'); S.hudBars = [...document.querySelectorAll('#hud-prog i')];
  S.grain = $('grain');
  S.scenes = {
    open: $('s-open'), ch1: $('s-ch1'), ch2: $('s-ch2'), ch3: $('s-ch3'), ch4: $('s-ch4'), ch5: $('s-ch5'), end: $('s-end'),
  };
}

function measure() {
  const all = document.querySelectorAll('.scene');
  all.forEach((s) => s.classList.add('on'));

  const head = rectIn(document.querySelector('.op-head'));
  P.opDot = { x: head.x - 54, y: head.y + 156 * 0.5 };

  const st = rectIn(S.c1.status);
  P.c1Pill = { x: st.x + 16, y: st.cy };
  const b2 = rectIn(S.c1.cta2);
  P.c1Cta2 = { x: b2.cx, y: b2.cy };

  P.c3List = rectIn(S.c3.list);
  P.c3Items = S.c3.items.map((it) => { const r = rectIn(it); return { x: r.x + 230, y: r.cy }; });

  const cta = rectIn(S.c4.cta);
  P.c4Cta = { x: cta.cx, y: cta.cy };

  P.reels = S.c5.reels.map((r) => { const b = rectIn(r.win); return { x: b.cx + 6, y: b.cy + 10 }; });

  const slot = rectIn($('end-slot'));
  P.endDot = { x: slot.cx, y: slot.cy };

  all.forEach((s) => s.classList.remove('on'));
}
