// Parle directement à OBS depuis le navigateur (obs-websocket v5, livré avec OBS 28 et plus).
// Sert à créer les sources de l'overlay sans que l'utilisateur ait à copier la moindre adresse.
'use strict';

const OBS_URL = 'ws://127.0.0.1:4455';

async function signature(motDePasse, sel, defi) {
  const sha = async (txt) => {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return btoa(String.fromCharCode(...new Uint8Array(b)));
  };
  return sha((await sha(motDePasse + sel)) + defi);
}

/** Ouvre la liaison avec OBS. Renvoie un objet { demander, fermer } ou lève une erreur parlante. */
function connecterObs(motDePasse = '') {
  return new Promise((ok, non) => {
    let ws;
    try { ws = new WebSocket(OBS_URL); } catch { return non(new Error('injoignable')); }
    const attentes = new Map();
    let n = 0;
    const minuteur = setTimeout(() => { ws.close(); non(new Error('injoignable')); }, 4000);

    ws.onerror = () => {};
    ws.onclose = (e) => {
      clearTimeout(minuteur);
      for (const [, { non: rej }] of attentes) rej(new Error('liaison fermée'));
      attentes.clear();
      // 4009 : OBS a refusé l'authentification.
      non(new Error(e.code === 4009 ? 'mot de passe' : 'injoignable'));
    };
    ws.onmessage = async (ev) => {
      const m = JSON.parse(ev.data);
      if (m.op === 0) {                                   // Hello
        const d = { rpcVersion: 1, eventSubscriptions: 0 };
        if (m.d.authentication) {
          if (!motDePasse) { clearTimeout(minuteur); ws.close(); return non(new Error('mot de passe')); }
          d.authentication = await signature(motDePasse, m.d.authentication.salt, m.d.authentication.challenge);
        }
        ws.send(JSON.stringify({ op: 1, d }));
      }
      if (m.op === 2) {                                   // Identified : on est connecté
        clearTimeout(minuteur);
        ws.onclose = () => { for (const [, { non: rej }] of attentes) rej(new Error('liaison fermée')); attentes.clear(); };
        ok({
          demander(type, donnees = {}) {
            const id = 'r' + (++n);
            return new Promise((o, k) => {
              attentes.set(id, { ok: o, non: k });
              ws.send(JSON.stringify({ op: 6, d: { requestType: type, requestId: id, requestData: donnees } }));
            });
          },
          fermer: () => ws.close(),
        });
      }
      if (m.op === 7) {                                   // réponse à une requête
        const a = attentes.get(m.d.requestId);
        if (!a) return;
        attentes.delete(m.d.requestId);
        m.d.requestStatus.result ? a.ok(m.d.responseData || {}) : a.non(new Error(m.d.requestStatus.comment || m.d.requestStatus.code));
      }
    };
  });
}

/** Ajoute (ou met à jour) la source de l'overlay sur une scène. Renvoie 'créée' ou 'mise à jour'. */
async function poserOverlay(obs, scene, avecChat, port) {
  const nom = avecChat ? 'Kayzx Live (chat)' : 'Kayzx Live';
  const url = `http://localhost:${port}/overlay${avecChat ? '?chat=1' : ''}`;
  const reglages = { url, width: 1920, height: 1080, reroute_audio: false };
  const { sceneItems } = await obs.demander('GetSceneItemList', { sceneName: scene });
  const deja = sceneItems.find((i) => i.sourceName === nom);
  if (deja) {
    await obs.demander('SetInputSettings', { inputName: nom, inputSettings: reglages });
    await placer(obs, scene, deja.sceneItemId);
    return 'mise à jour';
  }
  const { sceneItemId } = await obs.demander('CreateInput', {
    sceneName: scene, inputName: nom, inputKind: 'browser_source', inputSettings: reglages,
  }).catch(async (e) => {
    if (!String(e.message).includes('already exists')) throw e;      // la source existe sur une autre scène : on la réutilise
    return obs.demander('CreateSceneItem', { sceneName: scene, sourceName: nom });
  });
  await placer(obs, scene, sceneItemId);
  return 'créée';
}

/** Cale la source en 0, 0 à sa taille réelle, et la remonte tout en haut de la liste. */
async function placer(obs, scene, id) {
  await obs.demander('SetSceneItemTransform', {
    sceneName: scene, sceneItemId: id,
    sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1, boundsType: 'OBS_BOUNDS_NONE' },
  }).catch(() => {});
  const { sceneItems } = await obs.demander('GetSceneItemList', { sceneName: scene });
  await obs.demander('SetSceneItemIndex', { sceneName: scene, sceneItemId: id, sceneItemIndex: sceneItems.length - 1 }).catch(() => {});
}
