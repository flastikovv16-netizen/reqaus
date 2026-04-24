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
    ChannelType,
    PermissionsBitField
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const TOKEN = process.env.TOKEN;

// ====== ОСНОВНЫЕ КАНАЛЫ ======
const CHANNEL_ID = '1493632481763790954';

// ====== НОВЫЕ КАНАЛЫ ======
const REPORT_CHANNEL_ID = '1497290160273096744';
const ROLLBACK_CHANNEL_ID = '1497292157499867166';

// ====== РОЛИ ДОСТУПА ======
const PORTFOLIO_ROLES = [
    '1319640563401752586',
    '1319640756524417046',
    '1252673349440508034',
    '1245159189777485885'
];

// ====== ТВОЙ КОД ======
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

// ====== ФИКС ОТ ДУБЛЕЙ ======
const safeSendOnce = async (channel, payload) => {
    try {
        const msgs = await channel.messages.fetch({ limit: 10 });
        const exists = msgs.find(m => m.author.id === client.user.id);
        if (exists) return;
        await channel.send(payload);
    } catch (e) {
        console.error('safeSend error:', e);
    }
};

// ---------- ПАНЕЛИ ----------
client.once('ready', async () => {
    console.log('Бот запущен');

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);
        const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

       const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setImage('https://i.imgur.com/JkO2Vvi.png')
    .setDescription(`👋 Путь в семью Kamatoz начинается здесь!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Важно
Прочитайте ВСЕ ВОПРОСЫ.
Если не ответили — ЗАЯВКА ОТКЛОНЯЕТСЯ.
ЗАЯВКИ только на сервер Orlando (18)

Требования:
• Возраст - 15+
• Прайм тайм - 4+ (исключения)
• Базовая стрельба с тяжки + сайга
• Адекватность

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Нажми кнопку ниже`);

        const button = new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        await safeSendOnce(channel, {
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(button)]
        });

        await safeSendOnce(reportChannel, {
            content: '📂 Создай свой портфель',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_portfolio')
                        .setLabel('Создать портфель')
                        .setStyle(ButtonStyle.Success)
                )
            ]
        });

        await safeSendOnce(rollbackChannel, {
            content: '🎥 Создать ветку для откатов',
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_thread')
                        .setLabel('Создать ветку')
                        .setStyle(ButtonStyle.Primary)
                )
            ]
        });

    } catch (err) {
        console.error('READY ERROR:', err);
    }
});

// ---------- ОБРАБОТЧИК ----------
client.on(Events.InteractionCreate, async interaction => {

    // ---------- ПОДАТЬ ----------
    if (interaction.isButton() && interaction.customId === 'apply') {

        const modal = new ModalBuilder()
            .setCustomId('form')
            .setTitle('Заявка');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('name').setLabel('Имя ирл').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('age').setLabel('Возраст').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('nick').setLabel('Ник игровой').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('history').setLabel('История семей и почему ушел').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('video').setLabel('Откат с гг тяжка + сайга').setStyle(TextInputStyle.Paragraph)
            )
        );

        return interaction.showModal(modal);
    }

    // ---------- СОЗДАНИЕ ЗАЯВКИ ----------
    if (interaction.isModalSubmit() && interaction.customId === 'form') {
        try {

            const panelChannel = await client.channels.fetch(CHANNEL_ID);
            const category = panelChannel.parent;

            const newChannel = await interaction.guild.channels.create({
                name: `заявка-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category?.id || null,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                    ...ROLES.map(roleId => ({
                        id: roleId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
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

            return interaction.reply({ content: '✅ Заявка отправлена!', ephemeral: true });

        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Ошибка', ephemeral: true });
        }
    }

    // ---------- ПОРТФЕЛЬ ----------
    if (interaction.isButton() && interaction.customId === 'create_portfolio') {

        const parent = interaction.channel.parent;

        const portfolio = await interaction.guild.channels.create({
            name: `портфель-${interaction.user.username}`,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                ...PORTFOLIO_ROLES.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel] }))
            ]
        });

        const channels = ['Capt', 'Mcl/Vzz', 'RP', 'gungame'];

        for (let name of channels) {
            await interaction.guild.channels.create({
                name,
                type: ChannelType.GuildText,
                parent: portfolio.id
            });
        }

        return interaction.reply({ content: '✅ Портфель создан', ephemeral: true });
    }

    // ---------- ОТКАТЫ ----------
    if (interaction.isButton() && interaction.customId === 'create_thread') {

        const parent = interaction.channel.parent;

        await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: parent?.id || null,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ...PORTFOLIO_ROLES.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel] }))
            ]
        });

        return interaction.reply({ content: '✅ Ветка создана', ephemeral: true });
    }

    // ---------- КНОПКИ ЗАЯВОК ----------
    if (!interaction.isButton()) return;

    const userId = interaction.customId.split('_')[1];

    if (interaction.customId.startsWith('call_')) {
        await interaction.channel.send(`📞 <@${userId}> зайди в войс`);
        return interaction.reply({ content: '📞 Отправлено', ephemeral: true });
    }

    if (interaction.customId.startsWith('accept_')) {
        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(ROLE_ACCEPT);

        stats[interaction.user.id] = (stats[interaction.user.id] || 0) + 1;

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send(`✅ <@${interaction.user.id}> принял <@${userId}>`);

        await interaction.reply('✅ Принят');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }

    if (interaction.customId.startsWith('deny_')) {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send(`❌ <@${interaction.user.id}> отклонил <@${userId}>`);

        await interaction.reply('❌ Отклонён');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }
});

client.login(TOKEN);
