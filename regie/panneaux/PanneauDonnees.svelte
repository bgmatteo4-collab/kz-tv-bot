<script lang="ts">
  /**
   * D'où viennent les données du match.
   *
   * Le repli sur la saisie manuelle est le contrôle le plus important du
   * panneau : c'est ce qu'on cherche quand l'API tombe à la 78e minute. Il est
   * donc toujours au même endroit et toujours atteignable en un clic.
   */
  import type { EtatMatch } from '../../partage/contrats/etat.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  interface Rencontre {
    identifiantFournisseur: string;
    competition: string;
    domicile: string;
    exterieur: string;
    statutApi: string;
    debutIso: string | null;
  }

  let cleSaisie = $state('');
  let rencontres = $state<Rencontre[]>([]);
  let recherche = $state<'repos' | 'en-cours'>('repos');
  let messageRecherche = $state('');

  function heure(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  async function chercher() {
    recherche = 'en-cours';
    messageRecherche = '';
    try {
      const reponse = await fetch('/api/rencontres');
      const charge = (await reponse.json()) as { rencontres?: Rencontre[]; erreur?: string };
      if (!reponse.ok) {
        messageRecherche = charge.erreur ?? 'La recherche a échoué — repasse en saisie manuelle.';
        rencontres = [];
      } else {
        rencontres = charge.rencontres ?? [];
        if (rencontres.length === 0) {
          messageRecherche = 'Aucune rencontre aujourd’hui sur les compétitions suivies.';
        }
      }
    } catch {
      messageRecherche = 'Serveur injoignable — vérifie qu’il tourne.';
      rencontres = [];
    }
    recherche = 'repos';
  }
</script>

<Panneau titre="Données du match">
  <!-- Toujours visible, jamais conditionnel : c'est le repli qu'on cherche
       quand tout va mal, et il ne doit dépendre d'aucun réglage. -->
  <div class="sources">
    <button
      data-actif={etat.provider.nom === 'manuel' ? 'oui' : 'non'}
      onclick={() => regie.envoyer({ type: 'definir-provider', nom: 'manuel' })}
    >
      Saisie manuelle
    </button>
    <button
      data-actif={etat.provider.nom === 'démonstration' ? 'oui' : 'non'}
      onclick={() => regie.envoyer({ type: 'definir-provider', nom: 'démonstration' })}
    >
      Démonstration
    </button>
    <button
      data-actif={etat.provider.nom === 'api-football' ? 'oui' : 'non'}
      disabled={!etat.configuration.cleApiConfiguree}
      title={etat.configuration.cleApiConfiguree
        ? 'Suit la rencontre sélectionnée'
        : 'Enregistre d’abord ta clé'}
      onclick={() => regie.envoyer({ type: 'definir-provider', nom: 'api-football' })}
    >
      API-Football
    </button>
  </div>

  {#if !etat.configuration.cleApiConfiguree}
    <!-- Un écran vide propose une action, il ne constate pas le vide. -->
    <div class="cle">
      <span class="etiquette">Clé API-Football</span>
      <div class="ligne">
        <input
          type="password"
          bind:value={cleSaisie}
          placeholder="Colle ta clé ici"
          autocomplete="off"
        />
        <button
          disabled={cleSaisie.trim() === ''}
          onclick={() => {
            regie.envoyer({ type: 'definir-cle-api', cle: cleSaisie });
            cleSaisie = '';
          }}
        >
          Enregistrer
        </button>
      </div>
      <p class="aide">
        Elle reste sur ce poste, hors du dépôt, et n’est jamais envoyée à l’overlay.
      </p>
    </div>
  {:else}
    <div class="ligne repartie">
      <span class="etat-cle">Clé enregistrée</span>
      {#if etat.configuration.requetesRestantes !== null}
        <span class="quota" class:bas={etat.configuration.requetesRestantes < 20}>
          {etat.configuration.requetesRestantes} requêtes restantes aujourd’hui
        </span>
      {/if}
      <button class="discret" onclick={() => regie.envoyer({ type: 'effacer-cle-api' })}>
        Effacer
      </button>
    </div>

    <button onclick={chercher} disabled={recherche === 'en-cours'}>
      {recherche === 'en-cours' ? 'Recherche…' : 'Chercher les matchs du jour'}
    </button>

    {#if messageRecherche}
      <p class="message">{messageRecherche}</p>
    {/if}

    {#if rencontres.length > 0}
      <ul class="rencontres">
        {#each rencontres as rencontre}
          <li>
            <button
              data-actif={etat.identifiantMatch === `api-football:${rencontre.identifiantFournisseur}`
                ? 'oui'
                : 'non'}
              onclick={() =>
                regie.envoyer({
                  type: 'suivre-rencontre',
                  identifiantFournisseur: rencontre.identifiantFournisseur,
                })}
            >
              <span class="heure">{heure(rencontre.debutIso)}</span>
              <span class="affiche">{rencontre.domicile} — {rencontre.exterieur}</span>
              <span class="competition">{rencontre.competition}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  <div class="ligne">
    <span class="etiquette">Décalage du flux</span>
    <input
      class="secondes"
      type="number"
      min="0"
      max="180"
      value={etat.decalageVideoSecondes}
      oninput={(evenement) =>
        regie.envoyer({
          type: 'definir-decalage-video',
          secondes: Number(evenement.currentTarget.value),
        })}
    />
    <span class="unite">s de retard sur le match réel</span>
  </div>

</Panneau>

<style>
  .ligne {
    display: flex;
    align-items: center;
    gap: var(--espace-8);
  }

  .ligne.repartie .discret {
    margin-left: auto;
  }

  .cle {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
  }

  .etiquette,
  .etat-cle {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    white-space: nowrap;
  }

  .etat-cle {
    color: var(--good);
  }

  .quota {
    font-size: var(--texte-13);
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .quota.bas {
    color: var(--signal);
  }

  button {
    padding: var(--espace-8) var(--espace-12);
    font-size: var(--texte-13);
  }

  .discret {
    color: var(--ink-muted);
  }

  .sources {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--espace-4);
  }

  .sources button {
    padding: var(--espace-8) var(--espace-4);
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .aide,
  .message {
    font-size: var(--texte-13);
    color: var(--ink-muted);
  }

  .secondes {
    width: 72px;
    font-variant-numeric: tabular-nums;
  }

  .unite {
    font-size: var(--texte-13);
    color: var(--ink-muted);
  }

  .rencontres {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    overflow-y: auto;
    min-height: 0;
    flex: 1;
  }

  .rencontres button {
    display: grid;
    grid-template-columns: 48px 1fr auto;
    gap: var(--espace-8);
    align-items: baseline;
    width: 100%;
    text-align: left;
  }

  .heure {
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
  }

  .affiche {
    font-weight: 500;
  }

  .competition {
    font-size: var(--texte-11);
    color: var(--ink-muted);
  }
</style>
