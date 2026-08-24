<script lang="ts">
  /** Ce qui est à l'antenne, et ce que le provider n'a pas le droit de toucher. */
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

  .etiquette {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
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
