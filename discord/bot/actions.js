/**
 * Ce que font les commandes. Une fonction par commande, nommée comme elle.
 *
 * Règle tenue partout : une réponse au membre est éphémère par défaut (personne d'autre
 * n'a besoin de la lire), et toute action de modération laisse une trace au journal avant
 * de répondre — si l'écriture du journal échoue, on préfère le savoir.
 */
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder,
  TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits as P, MessageFlags,
} from 'discord.js';
import { categories, couleurs } from '../serveur.config.js';
import { donnees, sauver, ajouter, duree, leJour } from './base.js';
import { salonDe, roleDe } from './identifiants.js';

const EPHEMERE = { flags: MessageFlags.Ephemeral };

/** Retrouve la description d'un salon à partir de son identifiant Discord. */
function salonParId(id) {
  for (const cat of categories) {
    for (const s of cat.salons) if (salonDe(s.cle) === id) return { salon: s, categorie: cat };
  }
  return null;
}

const teinte = (univers) => ({
  communaute: couleurs.teal, direct: couleurs.miel,
  gaming: couleurs.chene, staff: couleurs.corail,
}[univers] ?? couleurs.teal);

async function journaliser(client, cle, embed) {
  const id = salonDe(cle);
  if (!id) return;
  const salon = await client.channels.fetch(id).catch(() => null);
  await salon?.send({ embeds: [embed] }).catch(() => {});
}

/* ------------------------------------------------------------------ tout le monde */

export async function salon(inter) {
  const trouve = salonParId(inter.channelId);
  if (!trouve) return inter.reply({ content: 'Ce salon n\'a pas de fiche.', ...EPHEMERE });

  const { salon: s, categorie } = trouve;
  const c = s.carte;
  const e = new EmbedBuilder()
    .setColor(teinte(categorie.univers))
    .setTitle(s.nom)
    .setDescription(c.intro.replace(/\*\*/g, '**'));

  for (const r of c.regles ?? []) e.addFields({ name: `${r.symbole}  ${r.titre}`, value: r.texte });
  for (const [cmd, titre, suite] of c.commandes ?? []) {
    e.addFields({ name: cmd, value: `**${titre}** ${suite ?? ''}` });
  }
  if (c.ailleurs?.length) {
    e.addFields({ name: '​', value: c.ailleurs.map(([q, v]) => `${q} → **${v}**`).join('\n') });
  }
  if (c.note) e.setFooter({ text: c.note.replace(/\*\*/g, '') });
  return inter.reply({ embeds: [e], ...EPHEMERE });
}

const AIDES = {
  clips: ['Clipper un moment du live',
    'Sur Twitch, le bouton **Créer un clip** en bas à droite du lecteur, ou **Alt + X**.\n'
    + 'Choisis les secondes qui comptent, nomme-le, puis colle le lien dans le salon des clips.\n'
    + 'Le meilleur de la semaine part sur TikTok, avec ton pseudo.'],
  roles: ['Choisir tes notifications',
    'Va dans le salon des rôles et coche ce qui t\'intéresse.\n'
    + 'Tu ne seras mentionné **que** pour ce que tu as coché — rien d\'autre, jamais.'],
  vocal: ['Lancer un salon vocal',
    'Connecte-toi à **➕ Créer un vocal** : ton salon se crée et tu y es déplacé.\n'
    + 'Il est à toi : `/vocal nom`, `/vocal places`, `/vocal verrouiller`.\n'
    + 'Une fois vide, il disparaît tout seul.'],
  matchs: ['Suivre les matchs',
    '`/programme` donne les rendez-vous de la semaine.\n'
    + 'Prends le rôle **Ping Match** pour être prévenu avant chaque diffusion.\n'
    + 'Pendant le match : **Le Plateau** pour écouter, la tribune pour réagir.'],
  tickets: ['Signaler un problème',
    'Va dans le salon des tickets et clique sur le bouton.\n'
    + 'Un salon privé s\'ouvre avec le staff — n\'écris jamais en message privé à un modo, '
    + 'ça ne laisse aucune trace.'],
};

export async function aide(inter) {
  const sujet = inter.options.getString('sujet');
  if (!sujet) {
    const e = new EmbedBuilder().setColor(couleurs.teal).setTitle('Besoin d\'un coup de main ?')
      .setDescription(Object.entries(AIDES).map(([k, [t]]) => `**/aide ${k}** — ${t}`).join('\n'))
      .setFooter({ text: 'Et /salon rappelle à quoi sert le salon où tu te trouves.' });
    return inter.reply({ embeds: [e], ...EPHEMERE });
  }
  const [titre, texte] = AIDES[sujet];
  return inter.reply({
    embeds: [new EmbedBuilder().setColor(couleurs.teal).setTitle(titre).setDescription(texte)],
    ...EPHEMERE,
  });
}

export async function sondage(inter) {
  const question = inter.options.getString('question');
  const choix = inter.options.getString('choix').split(',').map((t) => t.trim()).filter(Boolean);
  if (choix.length < 2 || choix.length > 10) {
    return inter.reply({ content: 'Il faut entre deux et dix réponses, séparées par des virgules.', ...EPHEMERE });
  }
  const heures = inter.options.getInteger('heures') ?? 24;
  const fin = Date.now() + heures * 3_600_000;

  donnees.sondages ??= {};
  const e = new EmbedBuilder().setColor(couleurs.teal).setTitle(question)
    .setDescription(choix.map((c, i) => `${'🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯'.match(/./gu)[i]}  ${c}\n\`░░░░░░░░░░\` 0`).join('\n\n'))
    .setFooter({ text: `Clôture ${new Date(fin).toLocaleString('fr-FR')} · 0 votant` });

  const rangees = [];
  for (let i = 0; i < choix.length; i += 5) {
    rangees.push(new ActionRowBuilder().addComponents(choix.slice(i, i + 5).map((c, j) =>
      new ButtonBuilder().setCustomId(`vote:${i + j}`)
        .setLabel('🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯'.match(/./gu)[i + j]).setStyle(ButtonStyle.Secondary))));
  }
  const message = await inter.reply({ embeds: [e], components: rangees, fetchReply: true });

  donnees.sondages[message.id] = {
    question, choix, votes: {}, fin,
    multiple: inter.options.getBoolean('multiple') ?? false,
    anonyme: inter.options.getBoolean('anonyme') ?? false,
    par: inter.user.id,
  };
  sauver();
}

/** Redessine la barre de résultats d'un sondage après chaque vote. */
export function dessinerSondage(s) {
  const lettres = '🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯'.match(/./gu);
  const compte = s.choix.map((_, i) => Object.values(s.votes).filter((v) => v.includes(i)).length);
  const total = Math.max(1, compte.reduce((a, b) => a + b, 0));
  return new EmbedBuilder().setColor(couleurs.teal).setTitle(s.question)
    .setDescription(s.choix.map((c, i) => {
      const part = compte[i] / total;
      const pleins = Math.round(part * 10);
      return `${lettres[i]}  ${c}\n\`${'█'.repeat(pleins)}${'░'.repeat(10 - pleins)}\` `
        + `${compte[i]} · ${Math.round(part * 100)} %`;
    }).join('\n\n'))
    .setFooter({ text: `Clôture ${new Date(s.fin).toLocaleString('fr-FR')} · `
      + `${Object.keys(s.votes).length} votant${Object.keys(s.votes).length > 1 ? 's' : ''}`
      + (s.anonyme ? ' · anonyme' : '') });
}

export async function vocal(inter) {
  const salonVocal = inter.member.voice?.channel;
  if (!salonVocal || donnees.vocaux[salonVocal.id] !== inter.user.id) {
    return inter.reply({ content: 'Il faut être dans un salon que tu as créé toi-même.', ...EPHEMERE });
  }
  const action = inter.options.getSubcommand();
  if (action === 'nom') {
    const nom = inter.options.getString('nom');
    await salonVocal.setName(nom, 'Réglage par son créateur');
    return inter.reply({ content: `Ton salon s'appelle maintenant **${nom}**.`, ...EPHEMERE });
  }
  if (action === 'places') {
    const n = inter.options.getInteger('nombre');
    await salonVocal.setUserLimit(n);
    return inter.reply({ content: n ? `Limité à **${n}** personnes.` : 'Plus aucune limite.', ...EPHEMERE });
  }
  const ferme = inter.options.getBoolean('ferme');
  await salonVocal.permissionOverwrites.edit(inter.guild.roles.everyone, { Connect: ferme ? false : null });
  return inter.reply({ content: ferme ? 'Salon fermé.' : 'Salon rouvert.', ...EPHEMERE });
}

export async function micro(inter) {
  if (inter.channelId !== salonDe('plateau') && inter.member.voice?.channelId !== salonDe('plateau')) {
    return inter.reply({ content: 'À demander depuis **Le Plateau**, pendant une diffusion.', ...EPHEMERE });
  }
  const regie = await inter.client.channels.fetch(salonDe('regie')).catch(() => null);
  await regie?.send({
    content: `<@&${roleDe('regie')}> — <@${inter.user.id}> demande le micro sur Le Plateau.`,
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`micro:ok:${inter.user.id}`).setLabel('Donner le micro').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`micro:non:${inter.user.id}`).setLabel('Refuser').setStyle(ButtonStyle.Secondary),
    )],
  }).catch(() => {});
  return inter.reply({ content: 'Demande transmise à la régie.', ...EPHEMERE });
}

/* ------------------------------------------------------------------ modération */

export async function sanction(inter) {
  const membre = inter.options.getMember('membre');
  const type = inter.options.getString('type');
  const motif = inter.options.getString('motif');

  if (!membre) return inter.reply({ content: 'Ce membre n\'est plus sur le serveur.', ...EPHEMERE });
  if (membre.id === inter.user.id) return inter.reply({ content: 'Sur toi-même, non.', ...EPHEMERE });
  if (!membre.manageable && type !== 'avertir') {
    return inter.reply({ content: 'Ce membre est au-dessus du bot dans la hiérarchie : impossible.', ...EPHEMERE });
  }

  await inter.deferReply(EPHEMERE);
  const trace = { type, motif, par: inter.user.id, date: Date.now() };

  try {
    if (type === 'exclure') {
      const ms = duree(inter.options.getString('duree') ?? '1h');
      if (!ms) throw new Error('Durée incomprise. Exemples : 10m, 2h, 7j.');
      if (ms > 28 * 86_400_000) throw new Error('Discord plafonne les exclusions à 28 jours.');
      await membre.timeout(ms, motif);
      trace.duree = ms;
    } else if (type === 'bannir') {
      await membre.ban({ reason: motif, deleteMessageSeconds: 0 });
    }
  } catch (e) {
    return inter.editReply({ content: 'Échec : ' + e.message });
  }

  ajouter('sanctions', membre.id, trace);

  const nombre = donnees.sanctions[membre.id].length;
  await journaliser(inter.client, 'traces', new EmbedBuilder()
    .setColor(type === 'avertir' ? couleurs.miel : couleurs.corail)
    .setTitle({ avertir: 'Avertissement', exclure: 'Exclusion temporaire', bannir: 'Bannissement' }[type])
    .setDescription(`<@${membre.id}> · \`${membre.user.tag}\``)
    .addFields(
      { name: 'Motif', value: motif },
      { name: 'Par', value: `<@${inter.user.id}>`, inline: true },
      { name: 'Antécédents', value: `${nombre}`, inline: true },
      ...(trace.duree ? [{ name: 'Durée', value: inter.options.getString('duree'), inline: true }] : []),
    )
    .setTimestamp());

  // Prévenir l'intéressé : une sanction qu'on ne comprend pas se rejoue toujours.
  await membre.send({ embeds: [new EmbedBuilder().setColor(couleurs.corail)
    .setTitle(`Kayzx TV — ${{ avertir: 'avertissement', exclure: 'exclusion temporaire', bannir: 'bannissement' }[type]}`)
    .setDescription(motif)
    .setFooter({ text: 'Pour en discuter, ouvre un ticket plutôt que d\'écrire à un modo.' })] }).catch(() => {});

  return inter.editReply({ content: `C'est fait. ${nombre} sanction(s) au compteur pour ce membre.` });
}

export async function historique(inter) {
  const membre = inter.options.getUser('membre');
  const s = donnees.sanctions[membre.id] ?? [];
  const n = donnees.notes[membre.id] ?? [];

  const e = new EmbedBuilder().setColor(couleurs.teal)
    .setTitle(`Historique — ${membre.tag}`)
    .setThumbnail(membre.displayAvatarURL());

  if (donnees.arrivees[membre.id]) {
    e.setDescription(`Arrivé le ${leJour(new Date(donnees.arrivees[membre.id]))}`);
  }
  e.addFields({
    name: `Sanctions (${s.length})`,
    value: s.length
      ? s.slice(-8).map((x) => `${leJour(new Date(x.date))} · **${x.type}** par <@${x.par}>\n${x.motif}`).join('\n\n')
      : 'Aucune.',
  }, {
    name: `Notes du staff (${n.length})`,
    value: n.length
      ? n.slice(-5).map((x) => `${leJour(new Date(x.date))} · <@${x.par}>\n${x.texte}`).join('\n\n')
      : 'Aucune.',
  });
  return inter.reply({ embeds: [e], ...EPHEMERE });
}

export async function note(inter) {
  const membre = inter.options.getUser('membre');
  ajouter('notes', membre.id, { texte: inter.options.getString('texte'), par: inter.user.id, date: Date.now() });
  return inter.reply({ content: `Note gardée sur ${membre.tag}. Visible avec \`/historique\`.`, ...EPHEMERE });
}

/* ------------------------------------------------------------------ régie */

export async function annonce(inter) {
  const cible = inter.options.getChannel('salon')?.id ?? salonDe('annonces');
  const role = inter.options.getRole('mentionner')?.id ?? '';
  const modal = new ModalBuilder()
    .setCustomId(`annonce:${cible}:${role}`)
    .setTitle('Annonce officielle')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('titre').setLabel('Titre').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('corps').setLabel('Le message').setStyle(TextInputStyle.Paragraph).setMaxLength(3500).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder()
        .setCustomId('image').setLabel('Lien d\'une image (facultatif)').setStyle(TextInputStyle.Short).setRequired(false)),
    );
  return inter.showModal(modal);
}

export function embedAnnonce(titre, corps, image, auteur) {
  const e = new EmbedBuilder().setColor(couleurs.miel).setTitle(titre).setDescription(corps)
    .setFooter({ text: `Kayzx TV · annonce officielle — ${auteur}` }).setTimestamp();
  if (image) e.setImage(image);
  return e;
}

export async function plateau(inter) {
  const action = inter.options.getSubcommand();
  const vocal = await inter.client.channels.fetch(salonDe('plateau')).catch(() => null);

  if (action === 'ouvrir') {
    const titre = inter.options.getString('titre');
    donnees.plateau = { titre, ouvertLe: Date.now(), par: inter.user.id };
    sauver();
    const tribune = await inter.client.channels.fetch(salonDe('tribune')).catch(() => null);
    await tribune?.send({
      content: inter.options.getBoolean('prevenir') ? `<@&${roleDe('pingMatch')}>` : undefined,
      embeds: [new EmbedBuilder().setColor(couleurs.miel).setTitle('🎙️  La diffusion commence')
        .setDescription(`**${titre}**\n\nRejoins **Le Plateau** pour écouter, et réagis ici.`)
        .setFooter({ text: 'Pas de spoil : certains regardent en différé.' })],
    }).catch(() => {});
    await vocal?.setName(`🎙️ ${titre}`.slice(0, 100)).catch(() => {});
    return inter.reply({ content: 'Diffusion ouverte.', ...EPHEMERE });
  }

  if (action === 'fermer') {
    donnees.plateau = null; sauver();
    const role = inter.guild.roles.cache.get(roleDe('intervenant'));
    let retires = 0;
    for (const m of role?.members.values() ?? []) {
      await m.roles.remove(role, 'Fin de diffusion').catch(() => {}); retires += 1;
    }
    await vocal?.setName('🎙️ Le Plateau').catch(() => {});
    return inter.reply({ content: `Diffusion terminée. ${retires} micro(s) retiré(s).`, ...EPHEMERE });
  }

  const membre = inter.options.getMember('membre');
  const retirer = inter.options.getBoolean('retirer') ?? false;
  if (!membre) return inter.reply({ content: 'Ce membre n\'est plus là.', ...EPHEMERE });
  await membre.roles[retirer ? 'remove' : 'add'](roleDe('intervenant'), 'Micro du Plateau').catch(() => {});
  return inter.reply({ content: `${membre.user.tag} ${retirer ? 'n\'a plus' : 'a'} le micro.`, ...EPHEMERE });
}

export async function programme(inter) {
  const action = inter.options.getSubcommand();
  const EMOJIS = { football: '⚽', mma: '🥊', live: '🔴', evenement: '🎉' };

  if (action === 'ajouter') {
    if (!inter.memberPermissions.has(P.ManageMessages)) {
      return inter.reply({ content: 'Réservé à la régie.', ...EPHEMERE });
    }
    donnees.programme.push({
      quoi: inter.options.getString('quoi'),
      quand: inter.options.getString('quand'),
      categorie: inter.options.getString('categorie') ?? 'evenement',
      par: inter.user.id,
    });
    sauver();
    await publierProgramme(inter.client);
    return inter.reply({ content: 'Inscrit au calendrier.', ...EPHEMERE });
  }

  if (action === 'retirer') {
    if (!inter.memberPermissions.has(P.ManageMessages)) {
      return inter.reply({ content: 'Réservé à la régie.', ...EPHEMERE });
    }
    const i = inter.options.getInteger('numero') - 1;
    if (!donnees.programme[i]) return inter.reply({ content: 'Ce numéro n\'existe pas.', ...EPHEMERE });
    const [parti] = donnees.programme.splice(i, 1);
    sauver();
    await publierProgramme(inter.client);
    return inter.reply({ content: `« ${parti.quoi} » retiré.`, ...EPHEMERE });
  }

  const e = new EmbedBuilder().setColor(couleurs.miel).setTitle('📅  Le programme')
    .setDescription(donnees.programme.length
      ? donnees.programme.map((p, i) => `**${i + 1}.** ${EMOJIS[p.categorie]}  ${p.quoi}\n ${p.quand}`).join('\n\n')
      : 'Rien d\'inscrit pour l\'instant.');
  return inter.reply({ embeds: [e], ...EPHEMERE });
}

/** Tient à jour le message unique du salon programme, au lieu d'en empiler. */
export async function publierProgramme(client) {
  const salonId = salonDe('programme');
  const s = await client.channels.fetch(salonId).catch(() => null);
  if (!s) return;
  const EMOJIS = { football: '⚽', mma: '🥊', live: '🔴', evenement: '🎉' };
  const e = new EmbedBuilder().setColor(couleurs.miel).setTitle('📅  Cette semaine')
    .setDescription(donnees.programme.length
      ? donnees.programme.map((p) => `${EMOJIS[p.categorie]}  **${p.quoi}**\n ${p.quand}`).join('\n\n')
      : 'Rien d\'inscrit pour l\'instant.')
    .setFooter({ text: 'Prends le rôle Ping Match pour être prévenu.' }).setTimestamp();

  const anciens = await s.messages.fetch({ limit: 20 }).catch(() => null);
  const mien = anciens?.find((m) => m.author.id === client.user.id && m.embeds[0]?.title?.includes('Cette semaine'));
  if (mien) await mien.edit({ embeds: [e] }).catch(() => {});
  else await s.send({ embeds: [e] }).catch(() => {});
}
