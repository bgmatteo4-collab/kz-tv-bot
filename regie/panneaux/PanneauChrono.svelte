<script lang="ts">
  /**
   * Le chrono et les phases. Chaque phase est un seul bouton : il place le
   * chrono à son début connu et le lance. Le streamer n'a jamais à régler
   * l'heure avant de donner le coup d'envoi.
   */
  import type { EtatMatch, Statut } from '../../partage/contrats/etat.js';
  import { lireChrono } from '../../partage/contrats/chrono.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  const lecture = $derived(lireChrono(etat, regie.maintenantMs));

  const PHASES: readonly { statut: Statut; libelle: string }[] = [
    { statut: 'premiere-periode', libelle: 'Coup d’envoi' },
    { statut: 'mi-temps', libelle: 'Mi-temps' },
    { statut: 'seconde-periode', libelle: 'Reprise' },
    { statut: 'fin-du-temps-reglementaire', libelle: 'Fin du temps réglementaire' },
    { statut: 'prolongation-1', libelle: 'Prolongation 1' },
    { statut: 'pause-prolongation', libelle: 'Pause' },
    { statut: 'prolongation-2', libelle: 'Prolongation 2' },
    { statut: 'tirs-au-but', libelle: 'Tirs au but' },
    { statut: 'termine', libelle: 'Terminé' },
    { statut: 'suspendu', libelle: 'Suspendu' },
  ];
</script>

<Panneau titre="Chrono et phase">
  <div class="lecture">
    <output class="horloge">{lecture.horloge ?? '—'}</output>
    <div class="colonne">
      <span class="phase">{lecture.phase}</span>
      {#if lecture.additionnel}<span class="additionnel">{lecture.additionnel}</span>{/if}
    </div>
    <button
      class="marche"
      data-actif={lecture.enMarche ? 'oui' : 'non'}
      onclick={() =>
        regie.envoyer({ type: lecture.enMarche ? 'arreter-chrono' : 'demarrer-chrono' })}
    >
      {lecture.enMarche ? 'Arrêter' : 'Démarrer'}
    </button>
  </div>

  <div class="additionnels">
    <span class="etiquette">Temps additionnel</span>
    {#each [0, 1, 2, 3, 4, 5, 6, 7] as minutes}
      <button
        data-actif={etat.chrono.tempsAdditionnel === minutes ? 'oui' : 'non'}
        onclick={() => regie.envoyer({ type: 'definir-temps-additionnel', minutes })}
      >
        {minutes === 0 ? '—' : `+${minutes}`}
      </button>
    {/each}
  </div>

  <div class="phases">
    {#each PHASES as phase}
      <button
        data-actif={etat.statut === phase.statut ? 'oui' : 'non'}
        onclick={() => regie.envoyer({ type: 'definir-statut', statut: phase.statut })}
      >
        {phase.libelle}
      </button>
    {/each}
  </div>
</Panneau>

<style>
  .lecture {
    display: flex;
    align-items: center;
    gap: var(--espace-16);
  }

  .horloge {
    font-size: var(--texte-44);
    font-weight: 700;
    font-stretch: var(--largeur-chiffres);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .colonne {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    flex: 1;
  }

  .phase {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  .additionnel {
    font-size: var(--texte-18);
    font-stretch: var(--largeur-chiffres);
    font-variant-numeric: tabular-nums;
  }

  .marche {
    padding: var(--espace-12) var(--espace-24);
    font-size: var(--texte-15);
    font-weight: 600;
  }

  .additionnels {
    display: flex;
    align-items: center;
    gap: var(--espace-4);
    flex-wrap: wrap;
  }

  .additionnels button {
    padding: var(--espace-4) var(--espace-8);
    font-size: var(--texte-13);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
  }

  .etiquette {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-right: var(--espace-4);
  }

  .phases {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--espace-4);
  }

  .phases button {
    padding: var(--espace-8);
    font-size: var(--texte-13);
    text-align: left;
    padding-left: var(--espace-12);
  }
</style>
