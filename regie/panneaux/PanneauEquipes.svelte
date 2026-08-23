<script lang="ts">
  /** Identité des équipes et de la compétition. Se règle avant le direct. */
  import type { Cote, EtatMatch } from '../../partage/contrats/etat.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  function definirEquipe(cote: Cote, champ: 'nom' | 'abrege' | 'couleur', valeur: string) {
    const equipe = { ...etat[cote], [champ]: valeur };
    regie.envoyer({
      type: 'definir-equipe',
      cote,
      nom: equipe.nom,
      abrege: equipe.abrege,
      couleur: equipe.couleur,
    });
  }
</script>

<Panneau titre="Équipes">
  <label class="champ">
    <span>Compétition</span>
    <input
      value={etat.competition}
      placeholder="LIGUE 1 · J14"
      oninput={(evenement) =>
        regie.envoyer({ type: 'definir-competition', nom: evenement.currentTarget.value })}
    />
  </label>

  {#each ['domicile', 'exterieur'] as const as cote}
    <div class="equipe">
      <label class="champ nom">
        <span>{cote === 'domicile' ? 'Domicile' : 'Extérieur'}</span>
        <input
          value={etat[cote].nom}
          oninput={(evenement) => definirEquipe(cote, 'nom', evenement.currentTarget.value)}
        />
      </label>
      <label class="champ court">
        <span>Abrégé</span>
        <input
          value={etat[cote].abrege}
          maxlength="3"
          oninput={(evenement) =>
            definirEquipe(cote, 'abrege', evenement.currentTarget.value.toUpperCase())}
        />
      </label>
      <label class="champ court">
        <span>Couleur</span>
        <input
          type="color"
          value={etat[cote].couleur}
          oninput={(evenement) => definirEquipe(cote, 'couleur', evenement.currentTarget.value)}
        />
      </label>
    </div>
  {/each}
</Panneau>

<style>
  .equipe {
    display: grid;
    grid-template-columns: 1fr 80px 72px;
    gap: var(--espace-8);
  }

  .champ {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    min-width: 0;
  }

  .champ span {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  input[type='color'] {
    padding: var(--espace-4);
    height: 36px;
  }
</style>
