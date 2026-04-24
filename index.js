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

// ====== TOKEN ======
const TOKEN = process.env.DISCORD_TOKEN;

// ====== CHANNELS ======
const CHANNEL_ID = '1493632481763790954';
const REPORT_CHANNEL_ID = '1497290160273096744';
const ROLLBACK_CHANNEL_ID = '1497292157499867166';

// ====== ROLES ======
const PORTFOLIO_ROLES = [
    '1319640563401752586',
    '1319640756524417046',
    '1252673349440508034',
    '1245159189777485885'
];

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

// ====== SAFE SEND (FIX ДУБЛЕЙ) ======
const safeSendOnce = async (channel, payload) => {
    try {
        const messages = await channel.messages.fetch({ limit: 10 });
        const exists = messages.find(m => m.author.id === client.user.id);
        if (exists) return;
        await channel.send(payload);
    } catch (err) {
        console.error('safeSendOnce error:', err);
    }
};

// ================= READY =================
client.once('ready', async () => {
    console.log(`Бот запущен как ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);
        const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

        if (!channel || !reportChannel || !rollbackChannel) {
            console.log('❌ Один из каналов не найден');
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setImage('https://i.imgur.com/JkO2Vvi.png')
            .setDescription('📥 Нажми кнопку ниже');

        const applyBtn = new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        await safeSendOnce(channel, {
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(applyBtn)]
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

        console.log('✅ Панели загружены');

    } catch (err) {
        console.error('READY ERROR:', err);
    }
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    // ===== APPLY BUTTON =====
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
                new TextInputBuilder().setCustomId('video').setLabel('Видео').setStyle(TextInputStyle.Paragraph)
            )
        );

        return interaction.showModal(modal);
    }

    // ===== FORM =====
    if (interaction.isModalSubmit() && interaction.customId === 'form') {
        try {

            const newChannel = await interaction.guild.channels.create({
                name: `заявка-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    ...ROLES.map(r => ({
                        id: r,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
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

            return interaction.reply({ content: '✅ Заявка отправлена', ephemeral: true });

        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ Ошибка', ephemeral: true });
        }
    }

    // ===== PORTFOLIO FIX =====
    if (interaction.isButton() && interaction.customId === 'create_portfolio') {

        try {
            const portfolio = await interaction.guild.channels.create({
                name: `портфель-${interaction.user.username}`,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
                    ...PORTFOLIO_ROLES.map(r => ({ id: r, allow: [PermissionsBitField.Flags.ViewChannel] }))
                ]
            });

            const names = ['Capt', 'Mcl/Vzz', 'RP', 'gungame'];

            for (const name of names) {
                await interaction.guild.channels.create({
                    name,
                    type: ChannelType.GuildText,
                    parent: portfolio.id
                });
            }

            return interaction.reply({ content: '✅ Портфель создан', ephemeral: true });

        } catch (err) {
            console.error('PORTFOLIO ERROR:', err);
            return interaction.reply({ content: '❌ Ошибка создания портфеля', ephemeral: true });
        }
    }

    // ===== THREAD =====
    if (interaction.isButton() && interaction.customId === 'create_thread') {

        await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel?.parent?.id || null
        });

        return interaction.reply({ content: '✅ Ветка создана', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
