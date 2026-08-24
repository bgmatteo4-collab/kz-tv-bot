/**
 * L'overlay.
 *
 * Il ne demande jamais rien et ne calcule aucune valeur métier : il reçoit
 * l'état du serveur et le rend. Trois conséquences qui ne se négocient pas.
 *
 * D'abord, il ne stocke rien qui fasse autorité — ni `localStorage`, ni
 * `sessionStorage`, ni `BroadcastChannel`. Ces mécanismes ont fait échouer la
 * version précédente du projet.
 *
 * Ensuite, il ne se vide jamais. S'il perd le serveur, il garde à l'écran ce
 * qu'il affichait : un écran noir en plein direct est pire qu'une donnée
 * périmée de dix secondes. Aucun statut de connexion n'apparaît ici — le
 * public n'a pas à voir nos doutes.
 *
 * Enfin, aucune vidéo de match ne passe dessous : l'overlay est l'image. Le
 * cadre est monté au démarrage et ne s'en va pas, et une scène occupe toujours
 * le centre.
 */
import './styles/base.css';
import './styles/cadre.css';
import './styles/scenes.css';
import { adresseTempsReel } from '../partage/contrats/config.js';
import { Liaison } from '../partage/liaison/connexion.js';
import { CANEVAS } from '../partage/design/tokens.js';
import { Cadre } from './cadre/cadre.js';
import { Regisseur } from './moteur/regisseur.js';
import { SceneOuverture } from './scenes/ouverture.js';

const canevas = document.querySelector<HTMLElement>('#canevas');
if (!canevas) throw new Error('Canevas introuvable dans overlay/index.html');

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

const contexte = {
  maintenantServeurMs: () => liaison.maintenantServeurMs(),
  mouvementReduit,
};

const cadre = new Cadre();
canevas.append(cadre.racine);

const regisseur = new Regisseur(cadre.hoteScene, contexte);
// La scène caméra n'a pas de fabrique : ne rien monter est son rendu, et le
// centre redevient réellement transparent pour qu'OBS y compose la webcam.
regisseur.enregistrer('ouverture', () => new SceneOuverture());

const liaison = new Liaison({
  adresse: adresseTempsReel(window.location),
  surEtat: (etat, raison) => {
    cadre.rafraichir(etat, contexte, raison === 'mise-a-jour');
    regisseur.appliquer(etat, raison);
    // Marque « j'ai reçu au moins un état ». Rien n'est affiché de plus : ça
    // sert au banc d'essai, qui doit savoir que l'overlay est réellement en
    // ligne avant de chronométrer quoi que ce soit.
    canevas.dataset['synchronise'] = 'oui';
  },
});

setInterval(() => cadre.battre(contexte), 1000);
regisseur.demarrer();
liaison.connecter();
