// Kayzx Live : petit serveur local (Node 22+, sans dépendance) qui relie le panel (téléphone), l'overlay (OBS) et Twitch.
//   node serveur.js [--demo]   → http://localhost:8420  (--demo : faux chat pour tester sans Twitch)
// Le chat Twitch est lu en anonyme (aucun token). Le token Twitch, facultatif, sert aux vrais sondages, prédictions et follows ;
// il reste dans config.json sur ce PC (jamais dans Git).
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');

const ICI = __dirname, PUBLIC = path.join(ICI, 'public'), PORT = 8420, DEMO = process.argv.includes('--demo');
const CONFIG = path.join(ICI, 'config.json');
const config = { chaine: 'kayzxx_tv', clientId: '', token: '', cle: '', bots: ['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot'] };
try { Object.assign(config, JSON.parse(fs.readFileSync(CONFIG, 'utf8'))); } catch { /* premier lancement */ }
if (!config.cle) config.cle = crypto.randomBytes(3).toString('hex');
const sauver = () => fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
sauver();

// ---------- État partagé : tout ce que l'overlay affiche ----------
const etat = {
  chat: { visible: true, ancre: 'bas', taille: 'm', hauteur: 100 },
  message: null, objectif: null, minuteur: null, compteur: null,
  sondage: null, prediction: null, jeu: null, vedette: null,
  ambiance: { visible: false, niveau: 0 },
  twitch: { chat: false, api: false, erreur: '' },
};
const historique = [];            // 40 derniers messages du chat (pour l'overlay qui se connecte et la mise en avant)
const secret = {};                // ce que l'écran ne doit pas savoir (nombre, mot)
const votesChat = new Map();      // vote par le chat (sondage sans token)
const tirage = new Set();
const ambiance = [];
let broadcasterId = '';

const clients = new Set();
const diffuser = (type, d) => { const s = `event: ${type}\ndata: ${JSON.stringify(d)}\n\n`; for (const r of clients) r.write(s); };
const publier = () => diffuser('etat', { ...etat, t: Date.now() });
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const PALETTE = ['#1E5B57', '#A06A12', '#B9533F', '#3E6A8A', '#5B4C86', '#2F7A4F'];
const couleur = (login) => PALETTE[[...login].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];

// ---------- Chat Twitch (IRC anonyme) ----------
function parse(l) {
  const m = { tags: {}, prefix: '', cmd: '', params: [], text: '' };
  let r = l;
  if (r[0] === '@') { const i = r.indexOf(' '); for (const kv of r.slice(1, i).split(';')) { const j = kv.indexOf('='); m.tags[kv.slice(0, j)] = kv.slice(j + 1).replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\'); } r = r.slice(i + 1); }
  if (r[0] === ':') { const i = r.indexOf(' '); m.prefix = r.slice(1, i); r = r.slice(i + 1); }
  const j = r.indexOf(' :'); if (j >= 0) { m.text = r.slice(j + 2); r = r.slice(0, j); }
  [m.cmd, ...m.params] = r.split(' ');
  return m;
}

function fragments(texte, emotes) {
  const car = Array.from(texte), pos = [];
  if (emotes) for (const e of emotes.split('/')) { const [id, plages] = e.split(':'); for (const p of plages.split(',')) { const [a, b] = p.split('-').map(Number); pos.push({ a, b, id }); } }
  pos.sort((x, y) => x.a - y.a);
  const out = []; let i = 0;
  for (const p of pos) { if (p.a > i) out.push({ t: car.slice(i, p.a).join('') }); out.push({ e: p.id, t: car.slice(p.a, p.b + 1).join('') }); i = p.b + 1; }
  if (i < car.length) out.push({ t: car.slice(i).join('') });
  return out;
}

function badges(tags) {
  const b = [], liste = (tags.badges || '').split(',').map((x) => x.split('/')[0]);
  if (liste.includes('broadcaster')) b.push('host');
  if (liste.includes('moderator')) b.push('mod');
  if (liste.includes('vip')) b.push('vip');
  if (liste.includes('subscriber') || liste.includes('founder')) {
    const mois = +((tags['badge-info'] || '').match(/(?:subscriber|founder)\/(\d+)/) || [])[1] || 1;
    b.push('sub' + [24, 12, 6, 3, 1].find((p) => mois >= p));
  }
  return b;
}

function recevoir({ id, login, nom, texte, emotes, tags = {}, premier = false }) {
  ambiance.push(Date.now());
  jouer(login, nom, texte);
  if (config.bots.includes(login) || texte.startsWith('!')) return;
  let action = false;
  if (texte.startsWith('\u0001ACTION ')) { texte = texte.slice(8, -1); action = true; }
  const m = { id, login, nom, couleur: couleur(login), badges: badges(tags), frag: fragments(texte, emotes), premier, action };
  historique.push(m); if (historique.length > 40) historique.shift();
  diffuser('chat', m);
}

function systeme(texte) { const m = { id: 'sys' + Date.now() + Math.random(), systeme: true, texte }; historique.push(m); diffuser('chat', m); }
function effacer(test) { const ids = historique.filter(test).map((m) => m.id); for (const id of ids) historique.splice(historique.findIndex((m) => m.id === id), 1); if (ids.length) diffuser('effacer', ids); }

let irc;
function chatTwitch() {
  const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443'); irc = ws;
  ws.onopen = () => { for (const l of ['CAP REQ :twitch.tv/tags twitch.tv/commands', 'PASS SCHMOOPIIE', `NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`, `JOIN #${config.chaine.toLowerCase()}`]) ws.send(l); };
  ws.onmessage = (e) => String(e.data).split('\r\n').filter(Boolean).forEach(ligne);
  ws.onclose = () => { etat.twitch.chat = false; publier(); setTimeout(chatTwitch, 5000); };
  ws.onerror = () => {};
}
function ligne(l) {
  const m = parse(l), t = m.tags;
  if (m.cmd === 'PING') return irc.send('PONG :tmi.twitch.tv');
  if (m.cmd === 'ROOMSTATE' && !etat.twitch.chat) { etat.twitch.chat = true; publier(); console.log(`Chat Twitch : connecté à #${config.chaine}`); }
  if (m.cmd === 'PRIVMSG') recevoir({ id: t.id, login: m.prefix.split('!')[0], nom: t['display-name'] || m.prefix.split('!')[0], texte: m.text, emotes: t.emotes, tags: t, premier: t['first-msg'] === '1' });
  if (m.cmd === 'CLEARCHAT') effacer(m.text ? (x) => x.login === m.text : () => true);
  if (m.cmd === 'CLEARMSG') effacer((x) => x.id === t['target-msg-id']);
  if (m.cmd === 'USERNOTICE') {
    const nom = t['display-name'] || t.login, k = t['msg-id'];
    if (k === 'sub' || k === 'resub') { systeme(`${nom} s'abonne · ${t['msg-param-cumulative-months'] || 1} mois`); avancer('sub', 1); }
    if (k === 'subgift') { systeme(`${nom} offre un abonnement à ${t['msg-param-recipient-display-name']}`); avancer('sub', 1); }
    if (k === 'raid') systeme(`${t['msg-param-displayName'] || nom} débarque avec ${t['msg-param-viewerCount']} viewers`);
  }
}

// ---------- API Twitch (facultatif : token dans config.json) ----------
async function helix(methode, chemin, corps) {
  const r = await fetch('https://api.twitch.tv/helix/' + chemin, { method: methode, headers: { 'Client-Id': config.clientId, Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { etat.twitch.api = false; etat.twitch.erreur = 'Token expiré : reconnecte Twitch depuis la page d\'accueil'; publier(); }
  if (!r.ok) throw new Error(j.message || 'Twitch : erreur ' + r.status);
  return j;
}
async function api() {
  if (!config.clientId || !config.token) return;
  try {
    const r = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + config.token } });
    if (!r.ok) throw new Error('token refusé');
    const v = await r.json(); broadcasterId = v.user_id;
    if (v.login !== config.chaine.toLowerCase()) throw new Error(`le token est celui de ${v.login}, pas de ${config.chaine}`);
    Object.assign(etat.twitch, { api: true, erreur: '' }); console.log('API Twitch : connectée'); eventsub();
  } catch (e) { Object.assign(etat.twitch, { api: false, erreur: 'API Twitch : ' + e.message }); }
  publier();
}
function eventsub(url = 'wss://eventsub.wss.twitch.tv/ws') {   // follows en direct (pour l'objectif)
  const ws = new WebSocket(url); let remplace = false;
  ws.onmessage = async (e) => {
    const m = JSON.parse(e.data), type = m.metadata.message_type;
    if (type === 'session_welcome' && url.endsWith('/ws')) await helix('POST', 'eventsub/subscriptions', { type: 'channel.follow', version: '2', condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId }, transport: { method: 'websocket', session_id: m.payload.session.id } }).catch((er) => console.log('EventSub :', er.message));
    if (type === 'notification' && m.metadata.subscription_type === 'channel.follow') { systeme(`${m.payload.event.user_name} vient de follow`); avancer('follow', 1); }
    if (type === 'session_reconnect') { remplace = true; eventsub(m.payload.session.reconnect_url); ws.close(); }
  };
  ws.onclose = () => { if (!remplace && etat.twitch.api) setTimeout(eventsub, 5000); };
  ws.onerror = () => {};
}

// Sondages et prédictions Twitch : on relit leur état toutes les 2 s tant qu'ils sont affichés.
setInterval(async () => {
  try {
    if (etat.sondage?.source === 'twitch' && !etat.sondage.termine) {
      const p = (await helix('GET', `polls?broadcaster_id=${broadcasterId}&id=${etat.sondage.id}`)).data[0];
      Object.assign(etat.sondage, { choix: p.choices.map((c) => ({ titre: c.title, votes: c.votes })), termine: p.status !== 'ACTIVE' });
      publier();
    }
    const pr = etat.prediction;
    if (pr && !['RESOLVED', 'CANCELED'].includes(pr.statut)) {
      const p = (await helix('GET', `predictions?broadcaster_id=${broadcasterId}&id=${pr.id}`)).data[0];
      Object.assign(pr, { statut: p.status, gagnant: p.winning_outcome_id, issues: p.outcomes.map((o) => ({ id: o.id, titre: o.title, points: o.channel_points, viewers: o.users })) });
      publier();
    }
  } catch { /* on réessaie au tour suivant */ }
}, 2000);

// ---------- Objectif, ambiance ----------
function avancer(genre, n) { if (etat.objectif?.genre === genre) { etat.objectif.actuel += n; publier(); } }
setInterval(() => {
  while (ambiance.length && ambiance[0] < Date.now() - 60000) ambiance.shift();
  const niveau = Math.min(100, Math.round(ambiance.length / 40 * 100));   // 40 messages/minute = jauge pleine
  if (niveau !== etat.ambiance.niveau) { etat.ambiance.niveau = niveau; if (etat.ambiance.visible) publier(); }
}, 2000);

// ---------- Mini-jeux (le chat joue en tapant dans le chat) ----------
const MOTS = ['banane', 'micro', 'canape', 'neon', 'manette', 'pizza', 'licorne', 'dragon', 'cactus', 'fusee', 'pingouin', 'trampoline', 'chocolat', 'volcan', 'robot', 'kayzx'];
function jouer(login, nom, texte) {
  const s = etat.sondage, j = etat.jeu, x = norm(texte);
  if (s?.source === 'chat' && !s.termine && /^\d+$/.test(x) && +x >= 1 && +x <= s.choix.length) {
    votesChat.set(login, +x - 1); s.choix.forEach((c, i) => { c.votes = [...votesChat.values()].filter((v) => v === i).length; }); publier();
  }
  if (!j || j.gagnant) return;
  if (j.type === 'devine' && /^\d+$/.test(x)) {
    const n = +x; if (n < j.bas || n > j.haut) return;
    j.essais++;
    if (n === secret.nombre) { j.gagnant = nom; j.nombre = n; }
    else { if (n < secret.nombre) j.bas = n + 1; else j.haut = n - 1; j.dernier = { nom, n, indice: n < secret.nombre ? 'plus' : 'moins' }; }
    publier();
  }
  if (j.type === 'rapide' && x === norm(j.mot)) { j.gagnant = nom; j.temps = ((Date.now() - j.debut) / 1000).toFixed(2); publier(); }
  if (j.type === 'pendu') {
    const mot = secret.mot;
    if (x === mot) { j.gagnant = nom; j.masque = mot.toUpperCase(); return publier(); }
    if (x.length !== 1 || !/[a-z]/.test(x) || j.faux.includes(x.toUpperCase()) || j.masque.includes(x.toUpperCase())) return;
    if (mot.includes(x)) { j.masque = [...mot].map((c, i) => (c === x ? c.toUpperCase() : j.masque[i])).join(''); if (!j.masque.includes('_')) j.gagnant = nom; }
    else { j.faux.push(x.toUpperCase()); if (j.faux.length >= 7) { j.perdu = true; j.gagnant = '—'; j.masque = mot.toUpperCase(); } }
    publier();
  }
  if (j.type === 'tirage' && j.ouvert && x === norm(j.motcle) && !tirage.has(nom)) { tirage.add(nom); j.participants = tirage.size; j.derniers = [...tirage].slice(-6); publier(); }
}

// ---------- Actions du panel ----------
const fin = (s) => Date.now() + s * 1000;
const actions = {
  chat: (a) => { for (const k of ['visible', 'ancre', 'taille', 'hauteur']) if (k in a) etat.chat[k] = a[k]; },
  message: (a) => { etat.message = a.texte ? { titre: a.titre || 'INFO', texte: a.texte } : null; },
  objectif: (a) => { etat.objectif = a.cible ? { genre: a.genre, titre: a.titre || 'OBJECTIF', actuel: +a.actuel || 0, cible: +a.cible } : null; },
  objectifPlus: (a) => { if (etat.objectif) etat.objectif.actuel = Math.max(0, etat.objectif.actuel + a.n); },
  minuteur: (a) => { etat.minuteur = a.secondes ? { titre: a.titre || '', fin: fin(a.secondes), reste: null } : null; },
  minuteurPause: () => { const m = etat.minuteur; if (!m) return; if (m.reste == null) m.reste = Math.max(0, m.fin - Date.now()); else { m.fin = Date.now() + m.reste; m.reste = null; } },
  minuteurPlus: (a) => { const m = etat.minuteur; if (m) { if (m.reste != null) m.reste += a.secondes * 1000; else m.fin += a.secondes * 1000; } },
  compteur: (a) => { etat.compteur = a.titre != null ? { titre: a.titre || 'COMPTEUR', valeur: +a.valeur || 0 } : null; },
  compteurPlus: (a) => { if (etat.compteur) etat.compteur.valeur += a.n; },
  ambiance: (a) => { etat.ambiance.visible = !!a.visible; },
  vedette: (a) => { const m = historique.find((x) => x.id === a.id); etat.vedette = m ? { ...m, depuis: Date.now() } : null; },
  async sondage(a) {
    const choix = a.choix.filter(Boolean).slice(0, 5);
    if (choix.length < 2) throw new Error('Il faut au moins 2 choix');
    if (etat.twitch.api) {
      const p = (await helix('POST', 'polls', { broadcaster_id: broadcasterId, title: a.titre, choices: choix.map((title) => ({ title })), duration: a.duree })).data[0];
      etat.sondage = { source: 'twitch', id: p.id, titre: a.titre, choix: choix.map((titre) => ({ titre, votes: 0 })), fin: fin(a.duree), termine: false };
    } else {
      votesChat.clear();
      etat.sondage = { source: 'chat', titre: a.titre, choix: choix.map((titre) => ({ titre, votes: 0 })), fin: fin(a.duree), termine: false };
    }
  },
  async sondageFin() {
    const s = etat.sondage; if (!s) return;
    if (s.source === 'twitch' && !s.termine) await helix('PATCH', 'polls', { broadcaster_id: broadcasterId, id: s.id, status: 'TERMINATED' });
    s.termine = true;
  },
  sondageMasquer: () => { etat.sondage = null; },
  async prediction(a) {
    if (!etat.twitch.api) throw new Error('Les prédictions demandent la connexion Twitch (page d\'accueil sur le PC)');
    const issues = a.issues.filter(Boolean).slice(0, 10);
    const p = (await helix('POST', 'predictions', { broadcaster_id: broadcasterId, title: a.titre, outcomes: issues.map((title) => ({ title })), prediction_window: a.duree })).data[0];
    etat.prediction = { id: p.id, titre: a.titre, statut: 'ACTIVE', fin: fin(a.duree), issues: p.outcomes.map((o) => ({ id: o.id, titre: o.title, points: 0, viewers: 0 })) };
  },
  async predictionStatut(a) {
    const p = etat.prediction; if (!p) return;
    const corps = { broadcaster_id: broadcasterId, id: p.id, status: a.statut };
    if (a.statut === 'RESOLVED') corps.winning_outcome_id = p.issues[a.gagnant].id;
    await helix('PATCH', 'predictions', corps);
    p.statut = a.statut; if (a.statut === 'RESOLVED') p.gagnant = corps.winning_outcome_id;
  },
  predictionMasquer: () => { etat.prediction = null; },
  jeu(a) {
    if (a.jeu === 'devine') { secret.nombre = 1 + Math.floor(Math.random() * a.max); etat.jeu = { type: 'devine', max: a.max, bas: 1, haut: a.max, essais: 0 }; }
    if (a.jeu === 'rapide') etat.jeu = { type: 'rapide', mot: (a.mot || MOTS[Math.floor(Math.random() * MOTS.length)]).toUpperCase(), debut: Date.now() };
    if (a.jeu === 'pendu') { secret.mot = norm(a.mot || MOTS[Math.floor(Math.random() * MOTS.length)]).replace(/[^a-z]/g, ''); etat.jeu = { type: 'pendu', masque: '_'.repeat(secret.mot.length), faux: [] }; }
    if (a.jeu === 'tirage') { tirage.clear(); etat.jeu = { type: 'tirage', motcle: a.motcle || '!participer', ouvert: true, participants: 0, derniers: [] }; }
  },
  tirer() {
    const j = etat.jeu; if (j?.type !== 'tirage' || !tirage.size) throw new Error('Personne n\'a encore participé');
    const noms = [...tirage]; j.ouvert = false; j.gagnant = noms[Math.floor(Math.random() * noms.length)];
    diffuser('roue', { noms: noms.sort(() => Math.random() - 0.5).slice(0, 30), gagnant: j.gagnant });
  },
  jeuFin: () => { etat.jeu = null; },
};
setInterval(() => {   // fin automatique des sondages par le chat et effacement de la mise en avant
  if (etat.sondage?.source === 'chat' && !etat.sondage.termine && Date.now() > etat.sondage.fin) { etat.sondage.termine = true; publier(); }
  if (etat.vedette && Date.now() - etat.vedette.depuis > 12000) { etat.vedette = null; publier(); }
}, 500);

// ---------- Serveur web ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
const ROUTES = { '/': 'accueil.html', '/panel': 'panel.html', '/overlay': 'overlay.html', '/retour': 'retour.html' };
const local = (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const ip = () => Object.values(os.networkInterfaces()).flat().filter((i) => i.family === 'IPv4' && !i.internal).map((i) => i.address).sort((a, b) => b.startsWith('192.168') - a.startsWith('192.168'))[0] || 'localhost';
const json = (res, code, d) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(d)); };
const corps = (req) => new Promise((ok) => { let s = ''; req.on('data', (c) => { s += c; }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ok({}); } }); });
const SCOPES = 'channel:manage:polls channel:manage:predictions moderator:read:followers';

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/flux') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    clients.add(res); req.on('close', () => clients.delete(res));
    res.write(`event: etat\ndata: ${JSON.stringify({ ...etat, t: Date.now() })}\n\nevent: historique\ndata: ${JSON.stringify(historique)}\n\n`);
    return;
  }
  if (url.pathname === '/action' && req.method === 'POST') {
    if (url.searchParams.get('cle') !== config.cle) return json(res, 403, { erreur: 'Clé du panel incorrecte : rescanne le QR code sur le PC' });
    const a = await corps(req);
    try { if (!actions[a.type]) throw new Error('Action inconnue'); await actions[a.type](a); publier(); json(res, 200, { ok: true }); }
    catch (e) { json(res, 400, { erreur: e.message }); }
    return;
  }
  if (url.pathname === '/infos' && local(req)) return json(res, 200, { panel: `http://${ip()}:${PORT}/panel?cle=${config.cle}`, clientId: !!config.clientId, chaine: config.chaine, twitch: etat.twitch });
  if (url.pathname === '/connexion' && local(req)) {
    if (!config.clientId) return json(res, 400, { erreur: 'Ajoute ton Client ID dans config.json (voir LISEZ-MOI)' });
    res.writeHead(302, { Location: `https://id.twitch.tv/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(`http://localhost:${PORT}/retour`)}&response_type=token&scope=${encodeURIComponent(SCOPES)}` });
    return res.end();
  }
  // Réglages depuis la page d'accueil : plus besoin d'ouvrir config.json au Bloc-notes.
  if (url.pathname === '/reglages' && req.method === 'POST' && local(req)) {
    const a = await corps(req);
    if (a.clientId !== undefined) config.clientId = String(a.clientId).trim();
    if (a.chaine) config.chaine = String(a.chaine).trim().toLowerCase().replace(/^.*twitch\.tv\//, '');
    sauver();
    if (a.chaine && irc) irc.close();   // on rejoint la nouvelle chaîne
    return json(res, 200, { ok: true, clientId: !!config.clientId, chaine: config.chaine });
  }
  if (url.pathname === '/jeton' && req.method === 'POST' && local(req)) { config.token = (await corps(req)).token || ''; sauver(); await api(); return json(res, 200, { ok: etat.twitch.api, erreur: etat.twitch.erreur }); }
  if (url.pathname === '/test' && DEMO) { const a = Object.fromEntries(url.searchParams); recevoir({ id: 't' + Date.now(), login: norm(a.nom), nom: a.nom, texte: a.texte }); return json(res, 200, { ok: true }); }
  const fichier = path.join(PUBLIC, path.normalize(ROUTES[url.pathname] || url.pathname).replace(/^(\.\.[/\\])+/, ''));
  if (!fichier.startsWith(PUBLIC) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) { res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
  fs.createReadStream(fichier).pipe(res);
}).listen(PORT, () => {
  console.log(`\n  Kayzx Live est lancé.\n  Sur ce PC : http://localhost:${PORT}\n  Panel téléphone : http://${ip()}:${PORT}/panel?cle=${config.cle}\n`);
  if (DEMO) demo(); else chatTwitch();
  api();
});

// ---------- Mode démo : un faux chat pour tester sans être en live ----------
function demo() {
  etat.twitch.chat = true;
  const noms = ['Nyx', 'LunaPixel', 'Tom_37', 'kiwi_frais', 'MrBaguette', 'Saphira', 'ZeroLag', 'piou'];
  const phrases = ['salut tout le monde !', 'bonsoir Kayzx', 'le néon est trop beau', 'GG', 'mdr', 'on est là', 'trop bien le nouveau décor', 'c\'est quoi le programme ce soir ?', 'hype', 'premier ?', 'je suis là depuis le début', 'il est quelle heure chez toi ?'];
  setInterval(() => {
    const nom = noms[Math.floor(Math.random() * noms.length)], j = etat.jeu, s = etat.sondage;
    let texte = phrases[Math.floor(Math.random() * phrases.length)];
    if (s && !s.termine && Math.random() < 0.5) texte = String(1 + Math.floor(Math.random() * s.choix.length));
    else if (j?.type === 'devine' && Math.random() < 0.6) texte = String(j.bas + Math.floor(Math.random() * (j.haut - j.bas + 1)));
    else if (j?.type === 'pendu' && Math.random() < 0.6) texte = 'eaisrntulocmpdbgvfhjqyxzk'[Math.floor(Math.random() ** 2 * 25)];
    else if (j?.type === 'tirage' && Math.random() < 0.6) texte = j.motcle;
    recevoir({ id: 'd' + Date.now(), login: norm(nom), nom, texte, tags: { badges: Math.random() < 0.4 ? 'subscriber/6' : '', 'badge-info': 'subscriber/' + [1, 3, 7, 14, 30][Math.floor(Math.random() * 5)] }, premier: Math.random() < 0.08 });
  }, 1400);
}
