/**
 * Le serveur TOUCHLINE.
 *
 * Il détient l'état du match, le persiste, et le pousse aux deux clients. En
 * production il sert aussi l'overlay et la régie, pour que le streamer n'ait
 * qu'un seul processus à lancer.
 */
import { createServer, type ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORT_SERVEUR } from '../partage/contrats/config.js';
import { Magasin } from './etat/magasin.js';
import { EtatPersiste } from './persistance/fichier.js';
import { brancherDiffusion } from './temps-reel/diffusion.js';
import { GestionProviders } from './providers/gestion.js';
import { MagasinSecrets } from './configuration/secrets.js';
import { rencontresDuJour } from './providers/api-football/index.js';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHEMIN_ETAT = process.env['TOUCHLINE_ETAT'] ?? join(RACINE, 'donnees', 'etat.json');
const CHEMIN_SECRETS = process.env['TOUCHLINE_SECRETS'] ?? join(RACINE, 'donnees', 'secrets.json');
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

function repondreJson(reponse: ServerResponse, code: number, charge: unknown): void {
  reponse.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  reponse.end(JSON.stringify(charge));
}

async function repondreRencontres(
  url: URL,
  reponse: ServerResponse,
  secrets: MagasinSecrets,
): Promise<void> {
  const cle = secrets.cleApiFootball;
  if (!cle) {
    repondreJson(reponse, 409, {
      erreur: 'Aucune clé d’API enregistrée — colle-la dans le panneau Antenne.',
    });
    return;
  }

  const date = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  try {
    repondreJson(reponse, 200, { rencontres: await rencontresDuJour(cle, date) });
  } catch (erreur) {
    // Le message vient du client, qui prend soin de ne jamais recopier la clé.
    const message = erreur instanceof Error ? erreur.message : 'échec de la recherche';
    repondreJson(reponse, 502, { erreur: message });
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

  const secrets = new MagasinSecrets(CHEMIN_SECRETS);
  await secrets.charger();
  magasin.definirConfiguration({ cleApiConfiguree: secrets.cleApiFootball !== null });

  const providers = new GestionProviders(magasin, secrets);

  const serveurHttp = createServer((requete, reponse) => {
    void (async () => {
      const url = new URL(requete.url ?? '/', `http://${requete.headers.host ?? 'localhost'}`);
      if (url.pathname === '/') {
        reponse.writeHead(302, { location: '/regie/' });
        reponse.end();
        return;
      }
      // La recherche de rencontres passe par HTTP et non par une intention :
      // c'est une question, pas un changement d'état. La faire transiter par
      // l'état enverrait une liste de matchs à l'overlay, qui n'en a que faire.
      if (url.pathname === '/api/rencontres') {
        await repondreRencontres(url, reponse, secrets);
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
    switch (intention.type) {
      case 'definir-provider':
        void providers.basculer(intention.nom);
        return;

      case 'suivre-rencontre':
        providers.definirRencontre(intention.identifiantFournisseur);
        void providers.basculer('api-football');
        return;

      case 'definir-cle-api':
        // La clé part sur disque et nulle part ailleurs. L'état ne publie que
        // le fait qu'elle existe.
        void secrets.definirCleApiFootball(intention.cle).then(() => {
          magasin.definirConfiguration({
            cleApiConfiguree: secrets.cleApiFootball !== null,
            requetesRestantes: null,
          });
        });
        return;

      case 'effacer-cle-api':
        void secrets.effacerCleApiFootball().then(() => {
          magasin.definirConfiguration({ cleApiConfiguree: false, requetesRestantes: null });
        });
        return;

      case 'definir-decalage-video': {
        magasin.appliquerIntention(intention);
        // Ramener le décalage à zéro ne doit pas laisser le streamer attendre
        // une minute que le tampon se vide.
        if (magasin.etat.decalageVideoSecondes === 0) providers.libererLeTampon();
        return;
      }

      default:
        magasin.appliquerIntention(intention);
    }
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
