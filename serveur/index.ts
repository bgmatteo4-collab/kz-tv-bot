/**
 * Le serveur TOUCHLINE.
 *
 * Il détient l'état du match, le persiste, et le pousse aux deux clients. En
 * production il sert aussi l'overlay et la régie, pour que le streamer n'ait
 * qu'un seul processus à lancer.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT_SERVEUR } from '../partage/contrats/config.js';
import { Magasin } from './etat/magasin.js';
import { EtatPersiste } from './persistance/fichier.js';
import { brancherDiffusion } from './temps-reel/diffusion.js';
import { GestionProviders } from './providers/gestion.js';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHEMIN_ETAT = process.env['TOUCHLINE_ETAT'] ?? join(RACINE, 'donnees', 'etat.json');
const RACINE_CLIENTS = join(RACINE, 'dist');

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

async function servirFichier(cheminUrl: string): Promise<{ corps: Buffer; type: string } | null> {
  const relatif = normalize(cheminUrl).replace(/^(\.\.[/\\])+/, '');
  let chemin = join(RACINE_CLIENTS, relatif);
  try {
    const infos = await stat(chemin);
    if (infos.isDirectory()) chemin = join(chemin, 'index.html');
  } catch {
    return null;
  }
  try {
    const corps = await readFile(chemin);
    return { corps, type: TYPES[extname(chemin)] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

async function demarrer(): Promise<void> {
  const persistance = new EtatPersiste(CHEMIN_ETAT);
  const etatDeDepart = await persistance.lire();

  const magasin = new Magasin(etatDeDepart ? { etatDeDepart } : {});
  if (etatDeDepart) {
    console.info(`[serveur] état repris du disque — match ${etatDeDepart.identifiantMatch}`);
  }

  magasin.s_abonner((etat) => persistance.planifier(etat));
  // Le premier enregistrement ne dépend pas d'un changement : si le serveur
  // meurt avant la moindre intention, on veut quand même un fichier.
  persistance.planifier(magasin.etat);

  const providers = new GestionProviders(magasin);

  const serveurHttp = createServer((requete, reponse) => {
    void (async () => {
      const url = new URL(requete.url ?? '/', `http://${requete.headers.host ?? 'localhost'}`);
      if (url.pathname === '/') {
        reponse.writeHead(302, { location: '/regie/' });
        reponse.end();
        return;
      }
      const fichier = await servirFichier(url.pathname);
      if (!fichier) {
        reponse.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        reponse.end('Introuvable. Lance « npm run construire » pour produire l’overlay et la régie.');
        return;
      }
      reponse.writeHead(200, { 'content-type': fichier.type, 'cache-control': 'no-cache' });
      reponse.end(fichier.corps);
    })();
  });

  // Pour la régie, changer de source est une intention comme une autre. Son
  // effet, lui, dépasse l'état : c'est le serveur qui tient le cycle de vie
  // des providers.
  brancherDiffusion(serveurHttp, magasin, (intention) => {
    if (intention.type === 'definir-provider') {
      void providers.basculer(intention.nom);
      return;
    }
    magasin.appliquerIntention(intention);
  });

  await providers.basculer(process.env['TOUCHLINE_PROVIDER'] ?? 'manuel');

  serveurHttp.listen(PORT_SERVEUR, () => {
    console.info(`[serveur] TOUCHLINE écoute sur http://localhost:${PORT_SERVEUR}`);
    console.info(`[serveur]   régie   → http://localhost:${PORT_SERVEUR}/regie/`);
    console.info(`[serveur]   overlay → http://localhost:${PORT_SERVEUR}/overlay/`);
  });

  const arreter = async () => {
    console.info('\n[serveur] arrêt — écriture de l’état');
    await providers.arreter();
    await persistance.vider();
    process.exit(0);
  };
  process.on('SIGINT', () => void arreter());
  process.on('SIGTERM', () => void arreter());
}

void demarrer();
