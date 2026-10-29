/**
 * Le bot Kayzx TV.
 *
 *     node bot/index.js
 *
 * Il doit tourner en permanence : c'est lui qui répond aux commandes, tient les journaux,
 * crée les vocaux à la demande et ouvre les tickets. Le déploiement du serveur, lui, est
 * ponctuel et vit dans deployer.js.
 */
import {
  Client, Events, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType,
  PermissionFlagsBits as P, MessageFlags,
} from 'discord.js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { couleurs, rolesNotification, rolesInteret, serveur, categories } from '../serveur.config.js';
import { donnees, sauver } from './base.js';
import { salonDe, roleDe } from './identifiants.js';
import * as actions from './actions.js';

const ICI = dirname(fileURLToPath(import.meta.url));
if (existsSync(join(ICI, '..', '.env'))) {
  for (const l of readFileSync(join(ICI, '..', '.env'), 'utf8').split('\n')) {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DISCORD_TOKEN) {
  console.error('\n  DISCORD_TOKEN absent. Lance CONFIGURER.command.\n');
  process.exit(1);
}

const EPHEMERE = { flags: MessageFlags.Ephemeral };

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

const journal = async (cle, embed) => {
  const s = await client.channels.fetch(salonDe(cle)).catch(() => null);
  await s?.send({ embeds: [embed] }).catch(() => {});
};

/* ------------------------------------------------------------------ démarrage */

client.once(Events.ClientReady, async () => {
  console.log(`\n  ${client.user.tag} est en ligne.`);
  await poserMenus();
  await actions.publierProgramme(client);
  setInterval(cloturerSondages, 60_000);
  console.log('  Menus posés, sondages surveillés.\n');
});

/** Les menus de rôles : posés une fois, mis à jour ensuite plutôt que repostés. */
async function poserMenus() {
  const s = await client.channels.fetch(salonDe('lesRoles')).catch(() => null);
  if (!s) return;

  const menu = (id, titre, liste, max) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(titre)
      .setMinValues(0).setMaxValues(max ?? liste.length)
      .addOptions(liste.map((r) => ({
        label: r.nom, value: r.cle, emoji: r.emoji,
        description: r.texte?.slice(0, 100),
      }))));

  const charge = {
    embeds: [new EmbedBuilder().setColor(couleurs.teal).setTitle('Tes rôles')
      .setDescription('Le premier menu décide de **ce dont tu es prévenu**.\n'
        + 'Le second sert à te proposer ce qui t\'intéresse, et à te trouver des coéquipiers.\n\n'
        + 'Décoche pour retirer. Rien n\'est définitif.')],
    components: [
      menu('roles:notification', 'Être prévenu de…', rolesNotification),
      menu('roles:interet', 'Ce qui m\'intéresse…', rolesInteret),
    ],
  };

  const anciens = await s.messages.fetch({ limit: 20 }).catch(() => null);
  const mien = anciens?.find((m) => m.author.id === client.user.id && m.components.length);
  if (mien) await mien.edit(charge).catch(() => {});
  else await s.send(charge).catch(() => {});
}

/* ------------------------------------------------------------------ interactions */

client.on(Events.InteractionCreate, async (inter) => {
  try {
    if (inter.isChatInputCommand()) {
      const action = actions[inter.commandName];
      if (action) return await action(inter);
      if (inter.commandName === 'cartes') {
        return inter.reply({ content: 'À relancer depuis la machine : `node poser-cartes.js`.', ...EPHEMERE });
      }
      return;
    }
    if (inter.isStringSelectMenu()) return await choisirRoles(inter);
    if (inter.isButton()) return await bouton(inter);
    if (inter.isModalSubmit()) return await modal(inter);
  } catch (e) {
    console.error('  interaction :', e.message);
    const reponse = { content: 'Quelque chose a échoué de mon côté. Réessaie.', ...EPHEMERE };
    if (inter.deferred || inter.replied) await inter.followUp(reponse).catch(() => {});
    else await inter.reply(reponse).catch(() => {});
  }
});

async function choisirRoles(inter) {
  const famille = inter.customId === 'roles:notification' ? rolesNotification : rolesInteret;
  const voulus = new Set(inter.values);
  const ajoutes = []; const retires = [];
  for (const r of famille) {
    const id = roleDe(r.cle);
    if (!id) continue;
    const aDeja = inter.member.roles.cache.has(id);
    if (voulus.has(r.cle) && !aDeja) { await inter.member.roles.add(id).catch(() => {}); ajoutes.push(r.nom); }
    if (!voulus.has(r.cle) && aDeja) { await inter.member.roles.remove(id).catch(() => {}); retires.push(r.nom); }
  }
  const dit = [ajoutes.length && `ajouté ${ajoutes.join(', ')}`, retires.length && `retiré ${retires.join(', ')}`]
    .filter(Boolean).join(' · ');
  return inter.reply({ content: dit ? `C'est fait : ${dit}.` : 'Rien n\'a changé.', ...EPHEMERE });
}

async function bouton(inter) {
  const [quoi, ...reste] = inter.customId.split(':');

  if (quoi === 'reglement') {
    const id = roleDe('membre');
    if (inter.member.roles.cache.has(id)) {
      return inter.reply({ content: 'Tu as déjà accès à tout le serveur.', ...EPHEMERE });
    }
    await inter.member.roles.add(id, 'Règlement validé');
    return inter.reply({
      content: 'Bienvenue — le serveur est ouvert.\nPasse par **les rôles** pour choisir tes notifications.',
      ...EPHEMERE,
    });
  }

  if (quoi === 'vote') return voter(inter, Number(reste[0]));
  if (quoi === 'ticket') return ouvrirTicket(inter);
  if (quoi === 'fermerTicket') return fermerTicket(inter);

  if (quoi === 'micro') {
    const [reponse, qui] = reste;
    const membre = await inter.guild.members.fetch(qui).catch(() => null);
    if (reponse === 'ok' && membre) await membre.roles.add(roleDe('intervenant'), 'Micro accordé').catch(() => {});
    await inter.update({
      content: `${inter.message.content}\n\n→ ${reponse === 'ok' ? 'Micro accordé' : 'Refusé'} par <@${inter.user.id}>.`,
      components: [],
    });
    return;
  }

  if (quoi === 'publier') {
    const [cible, role] = reste;
    const salon = await client.channels.fetch(cible).catch(() => null);
    if (!salon) return inter.update({ content: 'Salon introuvable.', embeds: [], components: [] });
    const message = await salon.send({
      content: role ? `<@&${role}>` : undefined,
      embeds: [inter.message.embeds[0]],
    });
    await message.crosspost().catch(() => {});   // sans effet hors salon d'annonces
    return inter.update({ content: `Publié dans <#${cible}>.`, embeds: [], components: [] });
  }

  if (quoi === 'annuler') {
    return inter.update({ content: 'Annulé, rien n\'a été publié.', embeds: [], components: [] });
  }
}

function voter(inter, choix) {
  donnees.sondages ??= {};
  const s = donnees.sondages[inter.message.id];
  if (!s) return inter.reply({ content: 'Ce sondage n\'est plus suivi.', ...EPHEMERE });
  if (Date.now() > s.fin) return inter.reply({ content: 'Ce sondage est clos.', ...EPHEMERE });

  const miens = new Set(s.votes[inter.user.id] ?? []);
  if (miens.has(choix)) miens.delete(choix);
  else { if (!s.multiple) miens.clear(); miens.add(choix); }
  if (miens.size) s.votes[inter.user.id] = [...miens];
  else delete s.votes[inter.user.id];
  sauver();

  return inter.update({ embeds: [actions.dessinerSondage(s)] });
}

async function cloturerSondages() {
  donnees.sondages ??= {};
  for (const [id, s] of Object.entries(donnees.sondages)) {
    if (Date.now() < s.fin) continue;
    delete donnees.sondages[id];
    sauver();
    for (const cat of categories) {
      for (const def of cat.salons) {
        const salon = await client.channels.fetch(salonDe(def.cle)).catch(() => null);
        const message = await salon?.messages.fetch(id).catch(() => null);
        if (!message) continue;
        const e = actions.dessinerSondage(s).setFooter({ text: 'Sondage clos' }).setColor(couleurs.gris ?? couleurs.nuit);
        await message.edit({ embeds: [e], components: [] }).catch(() => {});
      }
    }
  }
}

/* ------------------------------------------------------------------ tickets */

let numeroTicket = 0;

async function ouvrirTicket(inter) {
  const existant = inter.guild.channels.cache.find(
    (c) => c.name.startsWith('ticket-') && c.topic?.includes(inter.user.id));
  if (existant) return inter.reply({ content: `Tu as déjà un ticket ouvert : <#${existant.id}>`, ...EPHEMERE });

  numeroTicket += 1;
  const salon = await inter.guild.channels.create({
    name: `ticket-${String(numeroTicket).padStart(4, '0')}`,
    type: ChannelType.GuildText,
    parent: (await client.channels.fetch(salonDe('tickets')))?.parentId,
    topic: `Ticket de ${inter.user.tag} (${inter.user.id})`,
    permissionOverwrites: [
      { id: inter.guild.roles.everyone.id, deny: [P.ViewChannel] },
      { id: inter.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] },
      ...['moderation', 'administration', 'proprietaire'].map((c) => roleDe(c)).filter(Boolean)
        .map((id) => ({ id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] })),
    ],
    reason: `Ticket ouvert par ${inter.user.tag}`,
  });

  await salon.send({
    content: `<@${inter.user.id}> · <@&${roleDe('moderation')}>`,
    embeds: [new EmbedBuilder().setColor(couleurs.teal).setTitle('Ticket ouvert')
      .setDescription('Décris ton problème en quelques lignes : qui, quand, et ce qui s\'est passé.\n'
        + 'Une capture d\'écran aide beaucoup.\n\nCe salon ne sera lu que par toi et le staff.')],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fermerTicket').setLabel('Fermer le ticket').setStyle(ButtonStyle.Danger))],
  });
  return inter.reply({ content: `Ton ticket est ouvert : <#${salon.id}>`, ...EPHEMERE });
}

async function fermerTicket(inter) {
  const salon = inter.channel;
  if (!salon.name.startsWith('ticket-')) return;
  await inter.reply({ content: 'Fermeture dans dix secondes…' });

  // La transcription part au staff : un ticket supprimé sans trace ne vaut rien.
  const messages = await salon.messages.fetch({ limit: 100 }).catch(() => null);
  const texte = [...(messages?.values() ?? [])].reverse()
    .map((m) => `[${new Date(m.createdTimestamp).toLocaleString('fr-FR')}] ${m.author.tag} : ${m.content}`)
    .join('\n').slice(0, 3800);

  await journal('signalements', new EmbedBuilder().setColor(couleurs.chene)
    .setTitle(`Transcription — ${salon.name}`)
    .setDescription('```\n' + (texte || 'Aucun message.') + '\n```')
    .setFooter({ text: `Fermé par ${inter.user.tag}` }).setTimestamp());

  setTimeout(() => salon.delete('Ticket fermé').catch(() => {}), 10_000);
}

/* ------------------------------------------------------------------ formulaires */

async function modal(inter) {
  const [quoi, cible, role] = inter.customId.split(':');
  if (quoi !== 'annonce') return;

  const e = actions.embedAnnonce(
    inter.fields.getTextInputValue('titre'),
    inter.fields.getTextInputValue('corps'),
    inter.fields.getTextInputValue('image') || null,
    inter.user.username,
  );
  return inter.reply({
    content: `Aperçu — rien n'est publié tant que tu n'as pas cliqué.\nDestination : <#${cible}>`
      + (role ? `\nMention : <@&${role}>` : ''),
    embeds: [e],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`publier:${cible}:${role}`).setLabel('Publier').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('annuler').setLabel('Annuler').setStyle(ButtonStyle.Secondary))],
    ...EPHEMERE,
  });
}

/* ------------------------------------------------------------------ vocaux à la demande */

client.on(Events.VoiceStateUpdate, async (avant, apres) => {
  // Entrée dans le hub : on crée un salon au nom du jeu en cours, et on y déplace.
  if (apres.channelId && apres.channelId === salonDe('creerVocal')) {
    const jeu = apres.member.presence?.activities?.find((a) => a.type === 0)?.name;
    const salon = await apres.guild.channels.create({
      name: (jeu ? `🎮 ${jeu}` : `🔊 Salon de ${apres.member.displayName}`).slice(0, 100),
      type: ChannelType.GuildVoice,
      parent: apres.channel.parentId,
      permissionOverwrites: [
        ...apres.channel.permissionOverwrites.cache.map((o) => ({
          id: o.id, allow: o.allow.bitfield, deny: o.deny.bitfield, type: o.type })),
        { id: apres.member.id, allow: [P.ManageChannels, P.MoveMembers, P.Speak, P.Connect] },
      ],
      reason: `Salon à la demande de ${apres.member.user.tag}`,
    }).catch(() => null);
    if (!salon) return;
    donnees.vocaux[salon.id] = apres.member.id;
    sauver();
    await apres.member.voice.setChannel(salon).catch(() => salon.delete().catch(() => {}));
  }

  // Sortie : un salon à la demande vidé ne sert plus à rien.
  const parti = avant.channelId;
  if (parti && donnees.vocaux[parti] && avant.channel?.members.size === 0) {
    delete donnees.vocaux[parti];
    sauver();
    await avant.channel.delete('Salon vide').catch(() => {});
  }
});

/* ------------------------------------------------------------------ journaux */

client.on(Events.GuildMemberAdd, async (membre) => {
  donnees.arrivees[membre.id] ??= Date.now();
  sauver();
  const age = Date.now() - membre.user.createdTimestamp;
  await journal('mouvements', new EmbedBuilder().setColor(couleurs.teal).setTitle('Arrivée')
    .setDescription(`<@${membre.id}> · \`${membre.user.tag}\``)
    .addFields({ name: 'Compte créé', value: `<t:${Math.floor(membre.user.createdTimestamp / 1000)}:R>`
      + (age < 7 * 86_400_000 ? '  ⚠️ compte très récent' : ''), inline: true })
    .setThumbnail(membre.user.displayAvatarURL()).setTimestamp());
});

client.on(Events.GuildMemberRemove, async (membre) => {
  const sanctions = (donnees.sanctions[membre.id] ?? []).length;
  await journal('mouvements', new EmbedBuilder().setColor(couleurs.gris ?? couleurs.chene).setTitle('Départ')
    .setDescription(`\`${membre.user.tag}\``)
    .addFields({ name: 'Sanctions au compteur', value: String(sanctions), inline: true })
    .setTimestamp());
});

client.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  await journal('messages', new EmbedBuilder().setColor(couleurs.corail).setTitle('Message supprimé')
    .setDescription((message.content || '*(sans texte)*').slice(0, 1800))
    .addFields(
      { name: 'Auteur', value: `<@${message.author?.id}>`, inline: true },
      { name: 'Salon', value: `<#${message.channelId}>`, inline: true })
    .setTimestamp());
});

client.on(Events.MessageUpdate, async (avant, apres) => {
  if (!apres.guild || apres.author?.bot || avant.content === apres.content) return;
  await journal('messages', new EmbedBuilder().setColor(couleurs.miel).setTitle('Message modifié')
    .addFields(
      { name: 'Avant', value: (avant.content || '—').slice(0, 900) },
      { name: 'Après', value: (apres.content || '—').slice(0, 900) },
      { name: 'Auteur', value: `<@${apres.author.id}>`, inline: true },
      { name: 'Salon', value: `<#${apres.channelId}>`, inline: true })
    .setTimestamp());
});

/* ------------------------------------------------------------------ expérience */

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;

  const fiche = (donnees.xp[message.author.id] ??= { points: 0, niveau: 0, dernier: 0 });
  // Une minute de repos entre deux gains : sinon le spam devient une stratégie.
  if (Date.now() - fiche.dernier < 60_000) return;
  fiche.dernier = Date.now();
  fiche.points += 5 + Math.floor(Math.random() * 11);

  const requis = (n) => 5 * (n + 1) ** 2 + 50 * (n + 1);
  if (fiche.points >= requis(fiche.niveau)) {
    fiche.niveau += 1;
    await message.channel.send({
      embeds: [new EmbedBuilder().setColor(couleurs.miel)
        .setDescription(`<@${message.author.id}> passe **niveau ${fiche.niveau}**.`)],
    }).catch(() => {});
  }
  sauver();
});

client.on(Events.Error, (e) => console.error('  passerelle :', e.message));
process.on('unhandledRejection', (e) => console.error('  promesse :', e?.message ?? e));

client.login(process.env.DISCORD_TOKEN);
