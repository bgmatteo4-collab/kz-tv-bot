<script lang="ts">
  /**
   * La régie. Un écran, aucun défilement, chaque contrôle toujours au même
   * endroit — on la pilote sans la lire.
   */
  import { regie } from './liaison-regie.svelte.js';
  import BarreEtat from './panneaux/BarreEtat.svelte';
  import PanneauScore from './panneaux/PanneauScore.svelte';
  import PanneauChrono from './panneaux/PanneauChrono.svelte';
  import PanneauEquipes from './panneaux/PanneauEquipes.svelte';
  import PanneauDiffusion from './panneaux/PanneauDiffusion.svelte';

  const etat = $derived(regie.etat);
</script>

<main>
  <BarreEtat {etat} />

  {#if etat}
    <div class="grille">
      <PanneauScore {etat} />
      <PanneauChrono {etat} />
      <PanneauEquipes {etat} />
      <PanneauDiffusion {etat} />
    </div>
  {:else}
    <!-- Un écran vide propose une action, il ne constate pas le vide. -->
    <div class="attente">
      <p>La régie n’a pas encore reçu l’état du match.</p>
      <p class="quoi-faire">
        Lance le serveur avec <code>npm run dev</code>, la connexion se rétablit toute seule.
      </p>
    </div>
  {/if}
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    gap: var(--espace-12);
    height: 100vh;
    padding: var(--espace-12);
  }

  .grille {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: var(--espace-12);
    flex: 1;
    min-height: 0;
  }

  .attente {
    display: flex;
    flex-direction: column;
    gap: var(--espace-8);
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
  }

  .quoi-faire {
    color: var(--ink-muted);
    font-size: var(--texte-13);
  }

  code {
    font-family: ui-monospace, monospace;
    background: var(--surface-raised);
    border: 1px solid var(--line);
    border-radius: var(--rayon);
    padding: 2px var(--espace-4);
  }
</style>
