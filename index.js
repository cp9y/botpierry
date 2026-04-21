require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  ActivityType
} = require('discord.js');

console.log("🚀 Iniciando bot...");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// 🔥 CONFIG
const PANEL_CHANNEL_ID = '1256055468045111326';
const REGISTER_ROLE_ID = '1256030343518224416';

// 🔐 captcha
const captchaCache = new Map();

function gerarCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return {
    pergunta: `${a} + ${b}`,
    resposta: String(a + b)
  };
}

// 📦 painel
async function sendPanel() {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return console.log("❌ Canal não encontrado");

  const embed = new EmbedBuilder()
    .setTitle("✨ SISTEMA DE ACESSO")
    .setDescription(
      "━━━━━━━━━━━━━━━━━━\n" +
      "🔓 Clique abaixo para liberar seu acesso\n\n" +
      "🛡️ Proteção com captcha\n" +
      "⚡ Liberação automática\n" +
      "━━━━━━━━━━━━━━━━━━"
    )
    .setColor(0x2b2d31)
    .setFooter({ text: "Developed by 96a" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('liberar')
      .setLabel('LIBERAR ACESSO')
      .setEmoji('\<a:dark_verify:1470891734345977948>')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({
    embeds: [embed],
    components: [row]
  });
}

// 🤖 ready
client.once('ready', async () => {
  console.log(`✅ Logado como ${client.user.tag}`);

  client.user.setActivity("developed by 96", {
    type: ActivityType.Watching
  });

  setInterval(() => {
    client.user.setActivity("96a dev", {
      type: ActivityType.Playing
    });
  }, 15000);

  await sendPanel();
});

// 🔘 interações
client.on('interactionCreate', async interaction => {

  // botão
  if (interaction.isButton() && interaction.customId === 'liberar') {

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const role = interaction.guild.roles.cache.get(REGISTER_ROLE_ID);

    if (member.roles.cache.has(REGISTER_ROLE_ID)) {
      return interaction.reply({
        content: "⚠️ Você já possui o cargo.",
        ephemeral: true
      });
    }

    const captcha = gerarCaptcha();

    captchaCache.set(interaction.user.id, {
      resposta: captcha.resposta,
      tempo: Date.now()
    });

    const modal = new ModalBuilder()
      .setCustomId('captcha')
      .setTitle('Verificação');

    const input = new TextInputBuilder()
      .setCustomId('resposta')
      .setLabel(`Quanto é ${captcha.pergunta}?`)
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input)
    );

    return interaction.showModal(modal);
  }

  // captcha resposta
  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'captcha') {

    const data = captchaCache.get(interaction.user.id);

    if (!data) {
      return interaction.reply({
        content: "❌ Captcha expirado.",
        ephemeral: true
      });
    }

    const respostaUser = interaction.fields.getTextInputValue('resposta');

    if (respostaUser !== data.resposta) {
      return interaction.reply({
        content: "❌ Captcha incorreto.",
        ephemeral: true
      });
    }

    captchaCache.delete(interaction.user.id);

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const role = interaction.guild.roles.cache.get(REGISTER_ROLE_ID);

    try {
      await member.roles.add(role);

      const embed = new EmbedBuilder()
        .setTitle("✅ ACESSO LIBERADO")
        .setDescription(
          `${interaction.user}\n\n` +
          "🎉 Você foi verificado com sucesso!\n" +
          "🔓 Cargo liberado automaticamente"
        )
        .setColor(0x00ff88)
        .setThumbnail(interaction.user.displayAvatarURL())
        .setFooter({ text: "Developed by 96" })
        .setTimestamp();

      return interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (err) {
      console.error(err);

      return interaction.reply({
        content: "❌ Erro ao dar cargo.",
        ephemeral: true
      });
    }
  }
});

// 🔑 login
client.login(process.env.TOKEN);