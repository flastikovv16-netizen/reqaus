const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    Events,
    ChannelType
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

// ===== КАНАЛЫ =====
const CHANNEL_ID = '1493632481763790954';
const ROLLBACK_CHANNEL_ID = '1497292157499867166';
const REPORT_CHANNEL_ID = '1497290160273096744';

// ===== РОЛИ =====
const ROLES = [
    '1493715429963731075',
    '1245159189777485885',
    '1252665952160452760',
];

const ROLE_ACCEPT = '1245316820903395349';
const RECRUIT_ROLE = '1493715429963731075';
const LOG_CHANNEL_ID = '1493716294531416085';

const stats = {};
const takenRequests = new Set();


// ===== READY =====
client.once('ready', async () => {
    console.log('Бот запущен');

    // ===== ФУНКЦИЯ: проверка есть ли уже панель =====
    async function sendIfNotExists(channel, textCheck, payload) {
        const messages = await channel.messages.fetch({ limit: 10 });
        const exists = messages.some(m => m.content?.includes(textCheck));
        if (!exists) await channel.send(payload);
    }

    // ===== ЗАЯВКИ =====
    const channel = await client.channels.fetch(CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setImage('https://i.imgur.com/JkO2Vvi.png')
        .setDescription(`👋 Путь в семью Kamatoz начинается здесь!`);

    const button = new ButtonBuilder()
        .setCustomId('apply')
        .setLabel('Подать заявку')
        .setStyle(ButtonStyle.Primary);

    await sendIfNotExists(channel, 'Путь в семью', {
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(button)]
    });

    // ===== ОТКАТЫ =====
    const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

    const rollbackBtn = new ButtonBuilder()
        .setCustomId('create_thread')
        .setLabel('Создать откаты')
        .setStyle(ButtonStyle.Primary);

    await sendIfNotExists(rollbackChannel, 'Создать откаты', {
        content: '📼 Создать откаты',
        components: [new ActionRowBuilder().addComponents(rollbackBtn)]
    });

    // ===== ОТЧЕТЫ =====
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);

    const reportBtn = new ButtonBuilder()
        .setCustomId('create_portfolio')
        .setLabel('Создать портфель')
        .setStyle(ButtonStyle.Success);

    await sendIfNotExists(reportChannel, 'Создать портфель', {
        content: '📂 Создать портфель',
        components: [new ActionRowBuilder().addComponents(reportBtn)]
    });
});


// ===== INTERACTIONS =====
client.on(Events.InteractionCreate, async interaction => {

    // ===== APPLY =====
    if (interaction.isButton() && interaction.customId === 'apply') {

        const modal = new ModalBuilder()
            .setCustomId('form')
            .setTitle('Заявка');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('name').setLabel('Имя').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('age').setLabel('Возраст').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('history').setLabel('История').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('video').setLabel('Откаты').setStyle(TextInputStyle.Paragraph)
            )
        );

        return interaction.showModal(modal);
    }

    // ===== FORM =====
    if (interaction.isModalSubmit() && interaction.customId === 'form') {

        await interaction.deferReply({ ephemeral: true });

        const panelChannel = await client.channels.fetch(CHANNEL_ID);
        const category = panelChannel.parent;

        const newChannel = await interaction.guild.channels.create({
            name: `заявка-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                ...ROLES.map(id => ({
                    id,
                    allow: ['ViewChannel', 'SendMessages']
                }))
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle('📥 Новая заявка')
            .addFields(
                { name: 'Имя', value: interaction.fields.getTextInputValue('name') },
                { name: 'Возраст', value: interaction.fields.getTextInputValue('age') },
                { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
                { name: 'История', value: interaction.fields.getTextInputValue('history') },
                { name: 'Видео', value: interaction.fields.getTextInputValue('video') }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('Принять').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`deny_${interaction.user.id}`).setLabel('Отклонить').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`call_${interaction.user.id}`).setLabel('Обзвон').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`take_${interaction.user.id}`).setLabel('Взять').setStyle(ButtonStyle.Primary)
        );

        await newChannel.send({
            content: `<@&${RECRUIT_ROLE}> <@${interaction.user.id}>`,
            embeds: [embed],
            components: [row]
        });

        return interaction.editReply('✅ Заявка отправлена');
    }

    if (!interaction.isButton()) return;

    const userId = interaction.customId.split('_')[1];

    // ===== CALL =====
    if (interaction.customId.startsWith('call_')) {
        await interaction.channel.send(`📞 <@${userId}> Вы были вызваны на обзвон`);
        return interaction.reply({ content: 'OK', ephemeral: true });
    }

    // ===== ACCEPT =====
    if (interaction.customId.startsWith('accept_')) {

        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(ROLE_ACCEPT);

        stats[interaction.user.id] = (stats[interaction.user.id] || 0) + 1;

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(
            `✅ <@${interaction.user.id}> принял <@${userId}> | ${stats[interaction.user.id]}`
        );

        await interaction.reply('OK');

        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }

    // ===== ОТКАТЫ =====
    if (interaction.customId === 'create_thread') {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent?.id,
        });

        return interaction.editReply('OK');
    }

    // ===== ПОРТФЕЛЬ (FIX) =====
    if (interaction.customId === 'create_portfolio') {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `портфель-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent?.id,
        });

        const msg = await channel.send(`📂 Портфель`);

        // 🔥 ГАРАНТИРОВАННЫЙ ФИКС
        const create = (name, delay) =>
            new Promise(resolve =>
                setTimeout(async () => {
                    await msg.startThread({
                        name,
                        autoArchiveDuration: 1440
                    }).catch(() => {});
                    resolve();
                }, delay)
            );

        await Promise.all([
            create('РП', 0),
            create('КАПТЫ', 800),
            create('МЦЛ', 1600)
        ]);

        return interaction.editReply('✅');
    }
});

client.login(TOKEN);
