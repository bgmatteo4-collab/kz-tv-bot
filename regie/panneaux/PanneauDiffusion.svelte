<script lang="ts">
  /** Ce qui est à l'antenne, et ce que le provider n'a pas le droit de toucher. */
  import type { EtatMatch } from '../../partage/contrats/etat.js';
  import { regie } from '../liaison-regie.svelte.js';
  import Panneau from './Panneau.svelte';

  const { etat }: { etat: EtatMatch } = $props();

  import type { NomScene } from '../../partage/contrats/etat.js';

  const SCENES: readonly { nom: NomScene; libelle: string; quoi: string }[] = [
    { nom: 'camera', libelle: 'Caméra', quoi: 'Le centre laisse passer ta webcam' },
    { nom: 'ouverture', libelle: 'Ouverture', quoi: 'Affiche et compte à rebours' },
  ];

  const heureCoupDEnvoi = $derived(
    etat.coupDEnvoiMs === null
      ? ''
      : new Date(etat.coupDEnvoiMs).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
  );

  function definirCoupDEnvoi(valeur: string) {
    if (!valeur) {
      regie.envoyer({ type: 'definir-coup-d-envoi', horodatageMs: null });
      return;
    }
    const [heures, minutes] = valeur.split(':').map(Number);
    const date = new Date();
    date.setHours(heures ?? 0, minutes ?? 0, 0, 0);
    regie.envoyer({ type: 'definir-coup-d-envoi', horodatageMs: date.getTime() });
  }
</script>

<Panneau titre="Antenne">
  <!-- Il y a toujours une scène à l'antenne : ce sont des boutons de choix,
       jamais un interrupteur. Éteindre laisserait un rectangle noir. -->
  <div class="scenes">
    {#each SCENES as scene}
      <button
        class="scene"
        data-actif={etat.scene === scene.nom ? 'oui' : 'non'}
        onclick={() => regie.envoyer({ type: 'definir-scene', scene: scene.nom })}
      >
        <span class="scene__nom">{scene.libelle}</span>
        <span class="scene__quoi">{scene.quoi}</span>
      </button>
    {/each}
  </div>

  <div class="ligne">
    <span class="etiquette">Coup d’envoi</span>
    <input
      type="time"
      value={heureCoupDEnvoi}
      oninput={(evenement) => definirCoupDEnvoi(evenement.currentTarget.value)}
    />
    <button class="discret" onclick={() => regie.envoyer({ type: 'definir-coup-d-envoi', horodatageMs: null })}>
      Effacer
    </button>
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
  .scenes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--espace-4);
  }

  .scene {
    display: flex;
    flex-direction: column;
    gap: var(--espace-4);
    padding: var(--espace-12);
    text-align: left;
  }

  .scene__nom {
    font-size: var(--texte-15);
    font-weight: 600;
  }

  .scene__quoi {
    font-size: var(--texte-11);
    color: var(--ink-muted);
  }

  .ligne {
    display: flex;
    align-items: center;
    gap: var(--espace-8);
  }

  .ligne input {
    width: 110px;
    font-variant-numeric: tabular-nums;
  }

  .discret {
    padding: var(--espace-8);
    font-size: var(--texte-13);
    color: var(--ink-muted);
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
