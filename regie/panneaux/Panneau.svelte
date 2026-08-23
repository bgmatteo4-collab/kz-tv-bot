<script lang="ts">
  /** Le châssis commun à tous les panneaux de régie. */
  interface Props {
    titre: string;
    children: import('svelte').Snippet;
  }
  const { titre, children }: Props = $props();
</script>

<section>
  <h2>{titre}</h2>
  <div class="contenu">{@render children()}</div>
</section>

<style>
  section {
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--rayon);
    overflow: hidden;
  }

  h2 {
    font-size: var(--texte-11);
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-muted);
    padding: var(--espace-8) var(--espace-12);
    background: var(--surface-raised);
    border-bottom: 1px solid var(--line);
  }

  .contenu {
    display: flex;
    flex-direction: column;
    gap: var(--espace-12);
    padding: var(--espace-12);
    min-height: 0;
    flex: 1;
  }
</style>
