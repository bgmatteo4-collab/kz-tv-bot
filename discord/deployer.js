/**
 * Construit le serveur Discord à partir de serveur.config.js, en requêtes HTTP pures.
 *
 *     node deployer.js --verifier   → montre ce qui serait fait, ne touche à rien
 *     node deployer.js              → applique
 *
 * Aucune bibliothèque : discord.js aurait exigé une connexion WebSocket permanente, que
 * l'environnement d'exécution ne permet pas. Tout passe donc par l'API REST, qui suffit
 * largement pour construire un serveur.
 *
 * Le script est rejouable : il retrouve ce qu'il a créé grâce à etat.json et met à jour au
 * lieu de dupliquer. Renommer un salon à la main dans Discord ne le casse pas.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, D, combiner, TYPE } from './api.js';
import { roles, rolesNotification, rolesInteret, categories, serveur, resume } from './serveur.config.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const ETAT = join(ICI, 'etat.json');
const SIMULATION = process.argv.includes('--verifier');

const gras = (t) => `\x1b[1m${t}\x1b[0m`;
const vert = (t) => `\x1b[32m${t}\x1b[0m`;
const rouge = (t) => `\x1b[31m${t}\x1b[0m`;
const jaune = (t) => `\x1b[33m${t}\x1b[0m`;
const gris = (t) => `\x1b[90m${t}\x1b[0m`;

/* ---- .env, s'il existe (sur un poste ; dans l'environnement Claude le token est injecté) ---- */
if (existsSync(join(ICI, '.env'))) {
  for (const ligne of readFileSync(join(ICI, '.env'), 'utf8').split('\n')) {
    const m = ligne.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const G = process.env.SERVEUR_ID || serveur.id;
const etat = existsSync(ETAT) ? JSON.parse(readFileSync(ETAT, 'utf8')) : { roles: {}, categories: {}, salons: {} };
const enregistrer = () => SIMULATION || writeFileSync(ETAT, JSON.stringify(etat, null, 2));

/** Les pouvoirs nommés dans la configuration → les permissions Discord. */
const POUVOIRS = {
  administrateur: [D.administrateur],
  moderer:        [D.expulser, D.bannir, D.exclureTemp, D.voirJournal],
  gererSalons:    [D.gererSalons, D.gererFils],
  gererRoles:     [D.gererRoles, D.gererPseudos],
  gererMessages:  [D.gererMessages, D.gererFils],
  mentionnerTous: [D.mentionnerTous],
};

const BASE_MEMBRE = combiner(D.voir, D.lireHistorique, D.ecrire, D.reagir, D.joindreFichiers,
  D.liensEnrichis, D.emojisExternes, D.seConnecter, D.parler, D.partagerEcran);

const CLES_STAFF = ['proprietaire', 'administration', 'moderation', 'regie'];

/** Les salons qui exigent le mode communautaire : créés après son activation. */
const COMMUNAUTAIRE = new Set(['annonce', 'conference']);

const typeDiscord = (s) => TYPE[s.type] ?? (s.type === 'journal' || s.type === 'hub'
  ? (s.type === 'hub' ? TYPE.vocal : TYPE.texte)
  : TYPE.texte);

/* ------------------------------------------------------------------ permissions */

function reglesCategorie(categorie, idRole, everyone) {
  const r = [];
  if (categorie.acces === 'tous') {
    r.push({ id: everyone, allow: combiner(D.voir, D.lireHistorique), deny: combiner(D.ecrire, D.creerFils) });
  } else if (categorie.acces === 'membre') {
    r.push({ id: everyone, allow: 0n, deny: D.voir });
    r.push({ id: idRole('membre'), allow: BASE_MEMBRE, deny: 0n });
  } else if (categorie.acces === 'staff') {
    r.push({ id: everyone, allow: 0n, deny: D.voir });
    for (const c of CLES_STAFF) r.push({ id: idRole(c), allow: BASE_MEMBRE, deny: 0n });
  }
  return r.filter((x) => x.id);
}

function reglesSalon(salon, categorie, idRole, everyone) {
  const r = [];
  const cible = categorie.acces === 'tous' ? everyone : idRole('membre');

  if (salon.lectureSeule || salon.botSeul) {
    r.push({ id: cible, allow: combiner(D.voir, D.lireHistorique, D.reagir),
      deny: combiner(D.ecrire, D.creerFils, D.ecrireDansFils) });
  }
  if (salon.type === 'journal') {
    // Un journal qu'on peut éditer ne vaut rien : verrouillé pour tous, administration comprise.
    for (const c of CLES_STAFF) {
      const id = idRole(c);
      if (id) r.push({ id, allow: combiner(D.voir, D.lireHistorique),
        deny: combiner(D.ecrire, D.gererMessages, D.creerFils) });
    }
  }
  if (salon.type === 'conference') {
    // La communauté écoute et peut demander la parole ; seuls les intervenants parlent.
    r.push({ id: cible, allow: combiner(D.voir, D.seConnecter, D.demanderParole), deny: D.parler });
    if (idRole('intervenant')) r.push({ id: idRole('intervenant'), allow: D.parler, deny: 0n });
    if (idRole('regie')) r.push({ id: idRole('regie'), allow: combiner(D.parler, D.rendreMuet, D.deplacer), deny: 0n });
  }
  if (salon.type === 'hub') {
    // On s'y connecte une seconde, le bot déplace ailleurs : parler n'aurait pas de sens.
    r.push({ id: cible, allow: combiner(D.voir, D.seConnecter), deny: D.parler });
  }
  if (salon.acces === 'staff' && categorie.acces !== 'staff') {
    r.push({ id: everyone, allow: 0n, deny: D.voir });
    r.push({ id: cible, allow: 0n, deny: D.voir });
    for (const c of [...CLES_STAFF, 'intervenant']) {
      const id = idRole(c);
      if (id) r.push({ id, allow: BASE_MEMBRE, deny: 0n });
    }
  }
  return r.filter((x) => x.id);
}

/** Fusionne les règles visant le même rôle : Discord n'en garde qu'une par identifiant. */
function fusionner(regles) {
  const parId = new Map();
  for (const x of regles) {
    const d = parId.get(x.id) ?? { id: x.id, allow: 0n, deny: 0n };
    d.allow |= x.allow ?? 0n;
    d.deny |= x.deny ?? 0n;
    d.allow &= ~d.deny;        // une interdiction explicite l'emporte
    parId.set(x.id, d);
  }
  return [...parId.values()].map((x) => ({
    id: x.id, type: 0, allow: x.allow.toString(), deny: x.deny.toString(),
  }));
}

/* ------------------------------------------------------------------ déploiement */

const journal = [];
const fait = (signe, texte) => { journal.push(signe); console.log(`  ${signe} ${texte}`); };

async function principal() {
  const guild = await api('GET', `/guilds/${G}`);
  const rolesDistants = await api('GET', `/guilds/${G}/roles`);
  let salonsDistants = await api('GET', `/guilds/${G}/channels`);

  const r = resume();
  console.log(`\n${gras('Serveur : ' + guild.name)}`);
  console.log(gris(`  à créer : ${r.roles} rôles · ${r.categories} catégories · ${r.salons} salons`));
  console.log(SIMULATION ? gras('\n  MODE VÉRIFICATION — rien ne sera modifié.\n') : '');

  const everyone = G; // le rôle @everyone porte l'identifiant du serveur
  const idsRoles = {};
  const idRole = (cle) => idsRoles[cle];

  /* ---------- 1. Le nom du serveur ---------- */
  console.log(gras('Serveur'));
  if (guild.name !== serveur.nom) {
    fait(vert('~'), `renommer « ${guild.name} » → « ${serveur.nom} »`);
    if (!SIMULATION) await api('PATCH', `/guilds/${G}`, { name: serveur.nom }, 'Déploiement Kayzx TV');
  } else fait(gris('='), `nom déjà « ${serveur.nom} »`);

  /* ---------- 2. Les rôles ---------- */
  console.log(gras('\nRôles'));
  const tous = [
    ...roles,
    ...rolesNotification.map((x) => ({ ...x, mentionnable: true, affiche: false, pouvoirs: [] })),
    ...rolesInteret.map((x) => ({ ...x, mentionnable: false, affiche: false, pouvoirs: [] })),
  ];
  for (const def of tous) {
    const permissions = combiner(...(def.pouvoirs ?? []).flatMap((p) => POUVOIRS[p] ?? [])).toString();
    const existant = rolesDistants.find((x) => x.id === etat.roles[def.cle])
      ?? rolesDistants.find((x) => x.name === def.nom && !x.managed);
    if (existant) {
      idsRoles[def.cle] = existant.id;
      etat.roles[def.cle] = existant.id;
      fait(gris('='), def.nom);
      continue;
    }
    fait(vert('+'), def.nom);
    if (SIMULATION) { idsRoles[def.cle] = 'simulation:' + def.cle; continue; }
    const cree = await api('POST', `/guilds/${G}/roles`, {
      name: def.nom,
      color: def.couleur ?? 0,
      hoist: def.affiche ?? false,
      mentionable: def.mentionnable ?? false,
      permissions,
    }, 'Déploiement Kayzx TV');
    idsRoles[def.cle] = cree.id;
    etat.roles[def.cle] = cree.id;
  }
  enregistrer();

  /* ---------- 3. La hiérarchie ---------- */
  if (!SIMULATION) {
    // Du bas vers le haut : le dernier de la liste reçoit la position la plus basse.
    const ordre = tous.map((d) => idsRoles[d.cle]).filter(Boolean).reverse();
    try {
      await api('PATCH', `/guilds/${G}/roles`, ordre.map((id, i) => ({ id, position: i + 1 })),
        'Hiérarchie Kayzx TV');
      console.log(gris('  hiérarchie appliquée'));
    } catch (e) {
      console.log(jaune('  hiérarchie non appliquée : ' + e.message));
      console.log(jaune('  (le rôle Kayzx Bot est-il bien tout en haut ?)'));
    }
  }

  /* ---------- 4. Catégories et salons ---------- */
  const differes = [];
  for (const categorie of categories) {
    console.log(gras('\n' + categorie.nom));
    const permsCat = fusionner(reglesCategorie(categorie, idRole, everyone));

    let cat = salonsDistants.find((c) => c.id === etat.categories[categorie.cle])
      ?? salonsDistants.find((c) => c.type === TYPE.categorie && c.name === categorie.nom);
    if (cat) {
      fait(cat.name === categorie.nom ? gris('=') : vert('~'), 'catégorie');
      if (!SIMULATION) {
        await api('PATCH', `/channels/${cat.id}`,
          { name: categorie.nom, permission_overwrites: permsCat }, 'Déploiement Kayzx TV');
      }
    } else {
      fait(vert('+'), 'catégorie');
      if (!SIMULATION) {
        cat = await api('POST', `/guilds/${G}/channels`, {
          name: categorie.nom, type: TYPE.categorie, permission_overwrites: permsCat,
        }, 'Déploiement Kayzx TV');
        salonsDistants.push(cat);
      }
    }
    if (cat) etat.categories[categorie.cle] = cat.id;

    for (const salon of categorie.salons) {
      if (COMMUNAUTAIRE.has(salon.type)) { differes.push({ salon, categorie, cat }); continue; }
      await poser(salon, categorie, cat, idRole, everyone, salonsDistants);
    }
    enregistrer();
  }

  /* ---------- 5. Le mode communautaire ---------- */
  console.log(gras('\nMode communautaire'));
  const dejaCommunautaire = (guild.features ?? []).includes('COMMUNITY');
  if (dejaCommunautaire) {
    fait(gris('='), 'déjà activé');
  } else if (SIMULATION) {
    fait(vert('~'), 'serait activé (nécessaire pour Le Plateau et les annonces)');
  } else {
    const idRegles = etat.salons[serveur.salonRegles];
    const idInfos = etat.salons.bureau;
    try {
      await api('PATCH', `/guilds/${G}`, {
        features: [...(guild.features ?? []), 'COMMUNITY'],
        rules_channel_id: idRegles,
        public_updates_channel_id: idInfos,
        verification_level: 1,
        explicit_content_filter: 2,
        default_message_notifications: 1,
      }, 'Déploiement Kayzx TV');
      fait(vert('+'), 'activé');
    } catch (e) {
      fait(rouge('✕'), 'refusé : ' + e.message);
      console.log(jaune('  Les salons d\'annonces et de conférence seront créés en texte et en vocal simples.'));
    }
  }

  /* ---------- 6. Les salons qui exigeaient la communauté ---------- */
  if (differes.length) {
    console.log(gras('\nSalons communautaires'));
    salonsDistants = SIMULATION ? salonsDistants : await api('GET', `/guilds/${G}/channels`);
    for (const { salon, categorie, cat } of differes) {
      await poser(salon, categorie, cat, idRole, everyone, salonsDistants);
    }
    enregistrer();
  }

  /* ---------- 7. L'ordre d'affichage ---------- */
  // Un salon créé après les autres se retrouve en bas de sa catégorie : on impose
  // l'ordre de la configuration, qui est celui dans lequel on veut les lire.
  if (!SIMULATION) {
    // Sans parent_id : Discord n'accepte qu'un seul changement de catégorie par requête,
    // et les salons sont déjà au bon endroit — seul leur rang nous intéresse.
    const ordre = [];
    let rang = 0;
    for (const categorie of categories) {
      for (const salon of categorie.salons) {
        const id = etat.salons[salon.cle];
        if (id) ordre.push({ id, position: rang += 1 });
      }
    }
    try {
      await api('PATCH', `/guilds/${G}/channels`, ordre, 'Ordre Kayzx TV');
      console.log(gris('\n  ordre des salons appliqué'));
    } catch (e) {
      console.log(jaune('\n  ordre non appliqué : ' + e.message));
    }
  }

  /* ---------- 8. Les salons de référence ---------- */
  if (!SIMULATION) {
    const systeme = etat.salons[serveur.salonSysteme];
    if (systeme) {
      await api('PATCH', `/guilds/${G}`, { system_channel_id: systeme }, 'Déploiement Kayzx TV')
        .catch((e) => console.log(gris('  (salon système ignoré : ' + e.message + ')')));
    }
  }

  const crees = journal.filter((s) => s.includes('+')).length;
  console.log(`\n${SIMULATION ? gras('Vérification terminée.') : vert(gras('Serveur déployé.'))}`);
  console.log(gris(`  ${crees} élément(s) ${SIMULATION ? 'à créer' : 'créés'}.`));
  console.log(SIMULATION
    ? gris('  Relance sans --verifier pour appliquer.\n')
    : gris('  Les cartes de salon seront posées à l\'étape suivante.\n'));
}

async function poser(salon, categorie, cat, idRole, everyone, salonsDistants) {
  const perms = fusionner([
    ...reglesCategorie(categorie, idRole, everyone),
    ...reglesSalon(salon, categorie, idRole, everyone),
  ]);
  const attendu = typeDiscord(salon);
  const existant = salonsDistants.find((c) => c.id === etat.salons[salon.cle])
    ?? salonsDistants.find((c) => c.parent_id === cat?.id && c.name === salon.nom.toLowerCase());

  if (existant) {
    const memeNom = existant.name === salon.nom.toLowerCase() || existant.name === salon.nom;
    fait(memeNom ? gris('=') : vert('~'), `  ${salon.nom}`);
    if (!SIMULATION) {
      await api('PATCH', `/channels/${existant.id}`, {
        name: salon.nom,
        permission_overwrites: perms,
        ...(attendu === TYPE.texte || attendu === TYPE.annonce ? { topic: salon.sujet } : {}),
      }, 'Déploiement Kayzx TV').catch((e) => console.log(gris('      ' + e.message)));
    }
    etat.salons[salon.cle] = existant.id;
    return;
  }

  fait(vert('+'), `  ${salon.nom} ${gris('(' + salon.type + ')')}`);
  if (SIMULATION) return;
  try {
    const cree = await api('POST', `/guilds/${G}/channels`, {
      name: salon.nom,
      type: attendu,
      parent_id: cat?.id,
      topic: attendu === TYPE.texte || attendu === TYPE.annonce ? salon.sujet : undefined,
      permission_overwrites: perms,
    }, 'Déploiement Kayzx TV');
    etat.salons[salon.cle] = cree.id;
    salonsDistants.push(cree);
  } catch (e) {
    // Un type communautaire refusé : on retombe sur l'équivalent simple plutôt que d'échouer.
    const repli = attendu === TYPE.annonce ? TYPE.texte : attendu === TYPE.conference ? TYPE.vocal : null;
    if (!repli) throw e;
    console.log(jaune(`      type refusé, créé en ${repli === TYPE.texte ? 'texte' : 'vocal'} simple`));
    const cree = await api('POST', `/guilds/${G}/channels`, {
      name: salon.nom, type: repli, parent_id: cat?.id, permission_overwrites: perms,
    }, 'Déploiement Kayzx TV');
    etat.salons[salon.cle] = cree.id;
    salonsDistants.push(cree);
  }
}

principal().catch((e) => {
  console.error(rouge('\n  Échec : ' + e.message));
  if (e.statut === 401) console.error('  Le token est refusé par Discord.');
  if (e.statut === 403) console.error('  Le bot n\'a pas les droits. Son rôle est-il tout en haut de la liste ?');
  if (e.detail) console.error(gris('  ' + JSON.stringify(e.detail).slice(0, 400)));
  process.exit(1);
});
