# 06 · Feuille de route

Validation par **jalon** : chaque jalon (◆) est présenté au propriétaire avec captures d'écran et, si possible, vidéo.

## Phase 0 · Installation

- [ ] Claude Code installé sur le Mac, MCP de Studio activé et connecté (indicateur vert).
- [ ] Dépôt cloné en local ; Rojo, Lune, Blender (mode script), Python installés et vérifiés.
- [ ] Clé API Open Cloud créée et stockée hors du dépôt ; test d'upload d'un mesh.
- [ ] Place Roblox dédiée au projet ; synchronisation Rojo fonctionnelle.
- [ ] **Calibrage de l'échelle** : mesure de l'avatar, valeurs finales consignées dans le journal.
- [ ] **Salle d'étalonnage** : scène neutre + éclairages de référence (jour, nuit, intérieur).
- [ ] Préréglage d'éclairage et de post-traitement de départ.
- ◆ **Jalon 0** : chaîne d'outils opérationnelle, premières captures de la salle d'étalonnage.

## Phase 1 · Prototypes de risque

Chaque prototype répond à une question précise, avec une mesure.

1. **Immeuble haussmannien complet** : spécification → plans d'étage → façade → intérieurs meublés. *La chaîne de données tient-elle, et le rendu est-il au niveau ?*
2. **Intérieurs à la demande** : génération/destruction côté serveur, mesures de mémoire et de temps sur téléphone. *Combien d'intérieurs, de quelle densité ?*
3. **Train avec passagers** : rame en mouvement, plusieurs joueurs à bord. *Est-ce stable et sans tremblements ?*
4. **Usine à mesh** : un élément de façade et un meuble paramétrique avec biseaux, de Blender à Roblox via Open Cloud. *La chaîne est-elle entièrement automatique ?*
5. **Interactions à grande échelle** : des milliers d'objets interactifs pilotés par un seul système. *Coût mémoire et réseau ?*
6. **Réseau électrique** : un petit graphe, une panne, les lumières (intérieurs + fenêtres) qui s'éteignent et un technicien qui répare. *La simulation reliée fonctionne-t-elle ?*

- ◆ **Jalon 1** : rapport des prototypes, budgets de performance recalibrés.

## Phase 2 · Premier morceau : la place de l'Opéra

- Place, îlots haussmanniens, Grand Théâtre-Cinéma, station de métro Opéra (partielle), tram (arrêt).
- Réseaux techniques du quartier (transformateur, armoires, éclairage public, antenne, eau).
- Premiers commerces fonctionnels (café, boutique, banque) avec stock, paiement et livraison.
- Smartphone et ordinateurs en version de base.
- ◆ **Jalon 2** : la place complète, visitable, testée sur téléphone.

## Phase 3 · Les Boulevards

- Anneau complet, tram en service, début des lignes M1 et M2.
- Passage à l'échelle de la génération et des systèmes.
- ◆ **Jalon 3**.

## Phases suivantes

Gare et trains, Vieille Ville, Quais, Faubourg, Défense locale, Grands ensembles, Pavillonnaire, Port et industrie (poste source, entrepôts), aéroport. L'ordre sera décidé après le jalon 3.
