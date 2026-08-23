/**
 * Lance le serveur et les deux clients d'une seule commande.
 *
 * Le streamer n'a pas à savoir qu'il y a deux processus : « npm run dev » et
 * tout est là.
 */
import { spawn } from 'node:child_process';

const processus = [
  { nom: 'serveur', commande: 'npm', arguments: ['run', 'serveur'] },
  { nom: 'clients', commande: 'npm', arguments: ['run', 'clients'] },
];

const enfants = processus.map(({ nom, commande, arguments: args }) => {
  const enfant = spawn(commande, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  enfant.on('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`[dev] ${nom} s'est arrêté (code ${code})`);
    arreter();
  });
  return enfant;
});

let arretEnCours = false;
function arreter() {
  if (arretEnCours) return;
  arretEnCours = true;
  for (const enfant of enfants) enfant.kill('SIGTERM');
}

process.on('SIGINT', arreter);
process.on('SIGTERM', arreter);
