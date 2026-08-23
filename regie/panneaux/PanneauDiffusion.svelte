<script lang="ts">
  /**
   * Ce qui est à l'antenne, et d'où viennent les données.
   *
   * Le repli sur la saisie manuelle est ici, à un clic : c'est ce qu'on
   * cherche quand une API tombe à la 78e minute.
   */
  import type { EtatMatch } from '../../partage/contrats/etat.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  const bandeauVisible = $derived(etat.modules['bandeau-score'].visible);
</script>

<Panneau titre="Antenne">
  <button
    class="diffuser"
    data-actif={bandeauVisible ? 'oui' : 'non'}
    onclick={() =>
      regie.envoyer({
        type: bandeauVisible ? 'masquer-module' : 'afficher-module',
        module: 'bandeau-score',
      })}
  >
    {bandeauVisible ? 'Masquer le bandeau' : 'Afficher le bandeau'}
  </button>

  <div class="ligne">
    <span class="etiquette">Source des données</span>
    <div class="choix">
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
    </div>
  </div>

  <div class="ligne">
    <span class="etiquette">Décalage du flux</span>
    <div class="decalage">
      <input
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
      <span class="unite">secondes de retard sur le match réel</span>
    </div>
  </div>

  {#if etat.verrous.length > 0}
    <div class="verrous">
      <span class="etiquette">Corrigé à la main — non écrasable</span>
      <div class="liste">
        {#each etat.verrous as verrou}
          <button
            title="Rendre ce champ au provider"
            onclick={() => regie.envoyer({ type: 'liberer-verrou', chemin: verrou.chemin })}
          >
            {verrou.chemin}
          </button>
        {/each}
      </div>
      <button
        class="tout"
        onclick={() => regie.envoyer({ type: 'liberer-tous-les-verrous' })}
      >
        Tout rendre au provider
      </button>
    </div>
  {/if}

  <button class="neuf" onclick={() => regie.envoyer({ type: 'nouveau-match' })}>
    Nouveau match
  </button>
</Panneau>

<style>
  .diffuser {
    padding: var(--espace-16);
    font-size: var(--texte-18);
    font-weight: 600;
  }

  .ligne {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
  }

  .etiquette {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  .choix {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--espace-4);
  }

  .choix button {
    padding: var(--espace-8);
    font-size: var(--texte-13);
  }

  .decalage {
    display: flex;
    align-items: center;
    gap: var(--espace-8);
  }

  .decalage input {
    width: 80px;
    font-variant-numeric: tabular-nums;
  }

  .unite {
    font-size: var(--texte-13);
    color: var(--ink-muted);
  }

  .verrous {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    padding: var(--espace-8);
    border: 1px solid var(--line);
    border-radius: var(--rayon);
    background: var(--surface-raised);
  }

  .liste {
    display: flex;
    flex-wrap: wrap;
    gap: var(--espace-4);
  }

  .liste button {
    padding: var(--espace-4) var(--espace-8);
    font-size: var(--texte-11);
  }

  .tout,
  .neuf {
    padding: var(--espace-8);
    font-size: var(--texte-13);
    color: var(--ink-muted);
  }

  .neuf {
    margin-top: auto;
  }
</style>
