// Tout ce qui change d'un stream à l'autre est ici.
// Chaque valeur peut aussi être passée dans l'URL, par exemple :
//   index.html?heure=20:30&jours=1,3,5&ce-soir=2
'use strict';

const CONFIG = {
  nom: 'Kayzx TV',

  // Planning (chapitre 2). Jours : 0 = lundi … 6 = dimanche.
  heure: '21:00',
  jours: [0, 2, 4],
  duree: '03:00', // durée annoncée, HH:MM — « minimum », évidemment

  // Catégories (chapitre 3). Le code est la « dimension ».
  categories: [
    { code: 'K-137', nom: 'Gaming' },
    { code: 'K-001', nom: 'Just Chatting' },
    { code: 'K-404', nom: 'Dev Roblox' },
    { code: 'K-088', nom: 'Films & séries' },
  ],
  ceSoir: 0, // index de la catégorie que le curseur choisit

  // Communauté (chapitre 4) : exactement six cartes, une par emplacement.
  communaute: [
    { titre: 'Le chat', sous: 'En direct', icone: 'chat' },
    { titre: 'Les modos', sous: 'Gardiens du chat', icone: 'shield' },
    { titre: 'Les VIP', sous: 'Toujours là', icone: 'star' },
    { titre: 'Les abonnés', sous: 'Le soutien', icone: 'heart' },
    { titre: 'Les followers', sous: 'La famille', icone: 'user' },
    { titre: 'Le Discord', sous: 'Après le live', icone: 'mic' },
  ],
};

(() => {
  const q = new URLSearchParams(location.search);
  if (q.get('nom')) CONFIG.nom = q.get('nom');
  if (q.get('heure')) CONFIG.heure = q.get('heure');
  if (q.get('jours')) CONFIG.jours = q.get('jours').split(',').map(Number);
  if (q.get('duree')) CONFIG.duree = q.get('duree');
  if (q.get('ce-soir')) CONFIG.ceSoir = Number(q.get('ce-soir'));
})();
