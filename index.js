require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ActivityType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID;
const BUY_PANEL_CHANNEL_ID = process.env.BUY_PANEL_CHANNEL_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID;

// ✅ CORRIGIDO (sem mudar lógica)
async function sendDM(user, options) {
  try {
    if (!user) return console.log("Usuário não encontrado");
    await (user.user ? user.user : user).send(options);
  } catch (err) {
    console.log(`Não consegui enviar DM: ${err}`);
  }
}

// Painel de tickets (ORIGINAL)
async function sendTicketPanel() {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!panelChannel) return console.log('Canal do painel não encontrado.');

  const messages = await panelChannel.messages.fetch({ limit: 10 });
  const exists = messages.find(m => m.components.length > 0);
  if (exists) return console.log('Painel de tickets já existe.');

  const embed = new EmbedBuilder()
    .setTitle("🎫 Abrir Ticket")
    .setDescription("Clique no botão abaixo para abrir um ticket com a equipe de suporte.")
    .setColor(0x00FFFF)
    .setThumbnail("https://cdn.discordapp.com/attachments/1488671731685265488/1488672892844769392/Electric__C__with_lightning_bolt_logo.png")
    .setFooter({ text: "Equipe de Suporte" });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ embeds: [embed], components: [button] });
}

// PAINEL COMPRA
async function sendBuyPanel() {
  const panelChannel = await client.channels.fetch(BUY_PANEL_CHANNEL_ID).catch(() => null);
  if (!panelChannel) return;

  const messages = await panelChannel.messages.fetch({ limit: 10 });
  const exists = messages.find(m => m.components.length > 0);
  if (exists) return;

  const embed = new EmbedBuilder()
    .setTitle("💸 Comprar Otimização")
    .setDescription("Clique abaixo para comprar sua otimização.")
    .setColor(0x00FFFF)
    .setThumbnail("https://cdn.discordapp.com/attachments/1488671731685265488/1488672892844769392/Electric__C__with_lightning_bolt_logo.png")
    .setFooter({ text: "Equipe de Suporte" });

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_ticket_buy').setLabel('Comprar').setStyle(ButtonStyle.Success)
  );

  await panelChannel.send({ embeds: [embed], components: [button] });
}

client.once('ready', () => {
  console.log(`Bot online como ${client.user.tag}`);
  client.user.setActivity("23K", { type: ActivityType.Watching });
  client.user.setActivity("Ticket e Suporte", { type: ActivityType.Playing });

  sendTicketPanel();
  sendBuyPanel();
});

client.on('interactionCreate', async interaction => {
  const guild = interaction.guild;

  // ABRIR TICKET
  if (interaction.isButton() && (interaction.customId === 'open_ticket' || interaction.customId === 'open_ticket_buy')) {
    const member = interaction.user;
    await interaction.deferReply({ ephemeral: true });

    const prefix = interaction.customId === 'open_ticket_buy' ? 'compra' : 'ticket';

    const existing = guild.channels.cache.find(ch => ch.name === `${prefix}-${member.username.toLowerCase()}`);
    if (existing) return interaction.editReply({ content: `Você já tem um ticket aberto: ${existing}` });

    const ticketChannel = await guild.channels.create({
      name: `${prefix}-${member.username.toLowerCase()}`,
      type: 0,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
      ]
    });

    const ticketEmbed = new EmbedBuilder()
      .setTitle("🎫 Ticket Aberto")
      .setDescription(`Olá ${member}, nossa equipe de suporte irá te atender em breve.`)
      .setColor(0x00FF00)
      .setFooter({ text: "Equipe de Suporte" });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('close_ticket').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('alert_user').setLabel('Alertar Usuário').setStyle(ButtonStyle.Primary)
      );

    await ticketChannel.send({ content: `${member} <@&${STAFF_ROLE_ID}>`, embeds: [ticketEmbed], components: [row] });
    return interaction.editReply({ content: `Seu ticket foi criado: ${ticketChannel}` });
  }

  // BOTÕES
  if (interaction.isButton()) {
    const channel = interaction.channel;

    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({ content: "Apenas staff pode usar este botão.", ephemeral: true });
    }

    // ALERTA
    if (interaction.customId === 'alert_user') {
      const userName = channel.name.split('-').slice(1).join('-'); // ✅ corrigido
      const user = guild.members.cache.find(u => u.user.username.toLowerCase() === userName);
      if (!user) return interaction.reply({ content: "Usuário não encontrado.", ephemeral: true });

      const embedAlert = new EmbedBuilder()
        .setTitle("📣 Você foi alertado!")
        .setDescription(`Olá! Sua solicitação foi atualizada. Clique no link abaixo para acessar seu ticket.`)
        .setColor(0x00FFFF)
        .addFields({ name: "Ticket", value: `[Clique aqui](${channel.url})` })
        .setFooter({ text: "Equipe de Suporte" })
        .setTimestamp();

      await sendDM(user, { embeds: [embedAlert] });
      await interaction.reply({ content: "Usuário alertado com embed!", ephemeral: true });
    }

    // FECHAR
    if (interaction.customId === 'close_ticket') {
      const modalClose = new ModalBuilder()
        .setCustomId('modal_close_ticket')
        .setTitle('Consideração Final')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('final_note')
              .setLabel('Consideração final')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

      await interaction.showModal(modalClose);
    }
  }

  // 🔒 FECHAMENTO (CORRIGIDO)
  if (interaction.type === InteractionType.ModalSubmit) {
    const channel = interaction.channel;
    const guild = interaction.guild; // ✅ corrigido

    if (interaction.customId === 'modal_close_ticket') {
      const note = interaction.fields.getTextInputValue('final_note');

      const messages = await channel.messages.fetch({ limit: 100 });
      let transcriptHTML = `
      <html>
      <head>
      <style>
      body { font-family: Arial; background:#2C2F33; color:#fff; }
      .message { border-bottom:1px solid #555; padding:5px; }
      </style>
      </head>
      <body>
      <h2>${channel.name}</h2>
      `;

      messages.reverse().forEach(msg => {
        transcriptHTML += `<div class="message"><b>${msg.author.tag}:</b> ${msg.content}</div>`;
      });

      transcriptHTML += "</body></html>";

      const fileName = path.join(__dirname, `${channel.name}-transcript.html`);
      fs.writeFileSync(fileName, transcriptHTML);

      const userName = channel.name.split('-').slice(1).join('-'); // ✅ corrigido
      const user = guild.members.cache.find(u => u.user.username.toLowerCase() === userName);

      const dmEmbed = new EmbedBuilder()
        .setTitle("✅ Seu Ticket foi fechado")
        .setDescription(`Sua solicitação foi concluída.\n\n**Consideração final:** ${note}`)
        .setColor(0xFF0000)
        .setFooter({ text: "Equipe de Suporte" })
        .setTimestamp();

      await sendDM(user, { embeds: [dmEmbed], files: [fileName] });

      const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("Ticket Fechado")
              .setDescription(`**Ticket:** ${channel.name}\n**Fechado por:** ${interaction.user.tag}\n**Hora:** <t:${Math.floor(Date.now()/1000)}:F>\n**Consideração:** ${note}\nTranscript em anexo.`)
              .setColor(0xFF0000)
          ],
          files: [fileName]
        });
      }

      const closeEmbed = new EmbedBuilder()
        .setTitle("✅ Ticket fechado")
        .setDescription(`O ticket foi fechado por **${interaction.user.tag}**\n**Consideração:** ${note}`)
        .setColor(0xFF0000)
        .setTimestamp();

      await channel.send({ embeds: [closeEmbed] });

      setTimeout(() => {
        channel.delete().catch(console.error);
        fs.unlinkSync(fileName);
      }, 5000);

      await interaction.reply({ content: 'Ticket fechado com sucesso!', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);