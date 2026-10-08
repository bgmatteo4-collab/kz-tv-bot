// Assemble le tout : une image = render(t).
//   index.html            lecture en temps réel (OBS : reste sur la dernière image)
//   index.html?loop       en boucle
//   index.html?t=12.5     image fixe
//   index.html?dev        barre de lecture (Espace, ←/→, Maj+←/→ image par image)
//   index.html?render     piloté par render.js, image par image
'use strict';

const SCENES = [
  ['open', 0, 3.0], ['ch1', 3.7, 9.0], ['ch2', 9.7, 15.0], ['ch3', 15.7, 21.0],
  ['ch4', 21.7, 27.0], ['ch5', 27.7, 33.0], ['end', 32.95, 35.01],
];
const UPDATE = { open: upOpen, ch1: upCh1, ch2: upCh2, ch3: upCh3, ch4: upCh4, ch5: upCh5, end: upEnd };

function render(t) {
  t = clamp(t, 0, DUR);
  const f = Math.round(t * FPS);
  for (const [k, a, b] of SCENES) {
    const on = t >= a && t < b;
    S.scenes[k].classList.toggle('on', on);
    if (on) UPDATE[k](t, f);
  }
  upCards(t);
  upDot(t);
  upRings(t);
  upCursor(t);
  upFx(t);
  upFlash(t);
  upHud(t, f);
  upGrain(f);
}

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  $('stage').style.transform = `scale(${s})`;
}

function devBar(state) {
  const bar = document.createElement('div');
  bar.id = 'dev';
  bar.innerHTML = '<button id="dev-play">▶︎ / ❚❚</button><input id="dev-range" type="range" min="0" max="35" step="0.0166667"><span id="dev-time"></span>';
  document.body.appendChild(bar);
  const range = $('dev-range');
  range.addEventListener('input', () => { state.playing = false; state.t = Number(range.value); });
  $('dev-play').addEventListener('click', () => state.toggle());
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); state.toggle(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      state.playing = false;
      const step = e.shiftKey ? 1 / FPS : 1;
      state.t = clamp(state.t + (e.code === 'ArrowRight' ? step : -step), 0, DUR);
    }
  });
  return (t) => { range.value = t; $('dev-time').textContent = `${t.toFixed(2)} s`; };
}

async function boot() {
  await Promise.all([
    '800 100px "Inter Tight"', '400 100px "Inter Tight"', '100px "Instrument Serif"',
    'italic 100px "Instrument Serif"', '500 20px "JetBrains Mono"',
  ].map((s) => document.fonts.load(s)));
  await document.fonts.ready;

  build();
  measure();
  portalData();
  cursorTracks();
  makeGrain();
  FLAME = makeFlame();
  window.__render = render;
  window.__ready = true;
  if (RENDER) { render(0); return; }

  fit();
  addEventListener('resize', fit);
  const fixed = Q.get('t');
  const state = {
    playing: fixed === null, t: fixed === null ? 0 : Number(fixed), start: performance.now(),
    toggle() { this.playing = !this.playing; this.start = performance.now() - this.t * 1000; },
  };
  const devUpdate = DEV ? devBar(state) : null;
  let last = -1;
  const frame = (now) => {
    if (state.playing) {
      state.t = (now - state.start) / 1000;
      if (state.t >= DUR) {
        if (LOOP) { state.start = now; state.t = 0; } else { state.t = DUR; state.playing = false; }
      }
    }
    if (state.t !== last) { render(state.t); last = state.t; if (devUpdate) devUpdate(state.t); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

boot();
