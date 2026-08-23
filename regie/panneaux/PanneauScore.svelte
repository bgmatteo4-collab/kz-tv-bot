<script lang="ts">
  /**
   * Le panneau le plus utilisé du direct. Ses boutons sont donc les plus gros
   * et toujours au même endroit : un but se marque sans regarder.
   */
  import type { Cote, EtatMatch } from '../../partage/contrats/etat.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  function ajuster(cote: Cote, delta: number) {
    regie.envoyer({ type: 'ajuster-score', cote, delta });
  }
</script>

<Panneau titre="Score">
  <div class="grille">
    {#each ['domicile', 'exterieur'] as const as cote}
      <div class="colonne">
        <span class="nom" style:--couleur-equipe={etat[cote].couleur}>{etat[cote].abrege}</span>
        <output class="valeur">{etat[cote].score}</output>
        <div class="boutons">
          <button class="marquer" onclick={() => ajuster(cote, 1)}>Marquer</button>
          <button class="retirer" onclick={() => ajuster(cote, -1)}>Retirer</button>
        </div>
      </div>
    {/each}
  </div>
</Panneau>

<style>
  .grille {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--espace-12);
    flex: 1;
    min-height: 0;
  }

  .colonne {
    display: flex;
    flex-direction: column;
    gap: var(--espace-8);
    align-items: center;
    min-height: 0;
  }

  .nom {
    font-size: var(--texte-18);
    font-weight: 600;
    font-stretch: var(--largeur-noms);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-left: var(--lame) solid var(--couleur-equipe);
    padding-left: var(--espace-8);
    align-self: stretch;
  }

  .valeur {
    font-size: var(--texte-64);
    font-weight: 700;
    font-stretch: var(--largeur-chiffres);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .boutons {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  /* L'action la plus fréquente du direct occupe la plus grande cible :
     un but se marque sans regarder. */
  .marquer {
    flex: 1;
    font-size: var(--texte-24);
    font-weight: 600;
  }

  .retirer {
    padding: var(--espace-8);
    font-size: var(--texte-13);
    color: var(--ink-muted);
  }
</style>
