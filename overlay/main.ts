/**
 * L'overlay.
 *
 * Il ne demande jamais rien et ne calcule aucune valeur métier : il reçoit
 * l'état du serveur et le rend. Deux conséquences qui ne se négocient pas.
 *
 * D'abord, il ne stocke rien qui fasse autorité — ni `localStorage`, ni
 * `sessionStorage`, ni `BroadcastChannel`. Ces mécanismes ont fait échouer la
 * version précédente du projet.
 *
 * Ensuite, il ne se vide jamais. S'il perd le serveur, il garde à l'écran ce
 * qu'il affichait : un écran noir en plein direct est pire qu'une donnée
 * périmée de dix secondes. Aucun statut de connexion n'apparaît ici — le
 * public n'a pas à voir nos doutes.
 */
import './styles/base.css';
import './styles/modules.css';
import { adresseTempsReel } from '../partage/contrats/config.js';
import { Liaison } from '../partage/liaison/connexion.js';
import { CANEVAS } from '../partage/design/tokens.js';
import { Scene } from './moteur/scene.js';
import { BandeauScore } from './modules/bandeau-score.js';

const canevas = document.querySelector<HTMLElement>('#canevas');
const hoteScene = document.querySelector<HTMLElement>('#scene');
if (!canevas || !hoteScene) throw new Error('Canevas introuvable dans overlay/index.html');

/** Dans OBS le facteur vaut 1. Ailleurs, il permet de prévisualiser. */
function mettreAEchelle(): void {
  const facteur = Math.min(
    window.innerWidth / CANEVAS.largeur,
    window.innerHeight / CANEVAS.hauteur,
  );
  canevas!.style.transform = `scale(${facteur})`;
}
mettreAEchelle();
window.addEventListener('resize', mettreAEchelle);

const mouvementReduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const liaison = new Liaison({
  adresse: adresseTempsReel(window.location),
  surEtat: (etat, raison) => {
    scene.appliquer(etat, raison);
    // Marque « j'ai reçu au moins un état ». Rien n'est affiché de plus : ça
    // sert au banc d'essai, qui doit savoir que l'overlay est réellement en
    // ligne avant de chronométrer quoi que ce soit.
    canevas!.dataset['synchronise'] = 'oui';
  },
});

const scene = new Scene(hoteScene, {
  maintenantServeurMs: () => liaison.maintenantServeurMs(),
  mouvementReduit,
});

scene.enregistrer(new BandeauScore());
scene.demarrer();
liaison.connecter();
