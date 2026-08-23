/**
 * Le provider de saisie manuelle.
 *
 * Il ne pousse rien, et c'est exactement son rôle : quand il est actif, la
 * régie est l'unique source de vérité des données. Il doit fonctionner seul,
 * sans réseau et sans clé, parce que c'est vers lui qu'on se replie quand
 * l'API tombe à la 78e minute.
 */
import type { Provider } from './interface.js';

export class ProviderManuel implements Provider {
  readonly nom = 'manuel';
  readonly manuel = true;

  demarrer(): void {
    // Rien à faire : la régie pilote directement l'état par ses intentions.
  }

  arreter(): void {
    // Rien à libérer.
  }
}
