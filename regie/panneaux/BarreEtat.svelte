<script lang="ts">
  /**
   * L'indicateur de connexion, avec l'âge de la dernière donnée.
   *
   * Il vit en régie et nulle part ailleurs : l'overlay ne montre jamais un
   * doute au public.
   */
  import type { EtatMatch } from '../../partage/contrats/etat.js';
  import type { StatutConnexion } from '../../partage/liaison/connexion.js';
  import { regie } from '../liaison-regie.svelte.js';

  const { etat }: { etat: EtatMatch | null } = $props();

  const LIBELLE: Record<StatutConnexion, string> = {
    connexion: 'Connexion au serveur',
    connecte: 'Connecté',
    reconnexion: 'Reconnexion en cours',
    perdu: 'Serveur perdu',
  };

  const age = $derived.by(() => {
    if (!etat) return null;
    if (etat.provider.manuel) return 'saisie manuelle';
    if (etat.derniereDonneeMs === null) return 'aucune donnée reçue';
    const secondes = Math.max(0, Math.round((regie.maintenantMs - etat.derniereDonneeMs) / 1000));
    return `donnée reçue il y a ${secondes} s`;
  });
</script>

<header data-statut={regie.statut}>
  <span class="point"></span>
  <span class="libelle">{LIBELLE[regie.statut]}</span>
  {#if age}<span class="age">{age}</span>{/if}
  <span class="marque">TOUCHLINE</span>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    gap: var(--espace-12);
    padding: var(--espace-8) var(--espace-16);
    background: var(--surface-raised);
    border: 1px solid var(--line);
    border-radius: var(--rayon);
  }

  .point {
    width: var(--espace-8);
    height: var(--espace-8);
    border-radius: 50%;
    background: var(--ink-muted);
  }

  header[data-statut='connecte'] .point {
    background: var(--good);
  }

  header[data-statut='reconnexion'] .point {
    background: var(--signal);
  }

  header[data-statut='perdu'] .point {
    background: var(--live);
  }

  .libelle {
    font-size: var(--texte-13);
    font-weight: 500;
  }

  .age {
    font-size: var(--texte-13);
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .marque {
    margin-left: auto;
    font-size: var(--texte-11);
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--ink-muted);
  }
</style>
