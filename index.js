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

// ====== КАНАЛЫ ======
const CHANNEL_ID = '1493632481763790954';
const REPORT_CHANNEL_ID = '1497290160273096744';
const ROLLBACK_CHANNEL_ID = '1497292157499867166';

// ====== РОЛИ ======
const PORTFOLIO_ROLES = [
    '1493715429963731075',
    '1319640563401752586'
];

const ROLES = [
    '1493715429963731075',
    '1245159189777485885',
    '1252665952160452760',
];

const ROLE_ACCEPT = '1245316820903395349';
const RECRUIT_ROLE = '1493715429963731075';
const LOG_CHANNEL_ID = '1493716294531416085';

// ====== СТАТЫ ======
const stats = {};
const takenRequests = new Set();

// ================= READY =================
client.once('ready', async () => {
    console.log('Бот запущен');

    try {
        const channel = await client.channels.fetch(CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setImage('https://i.imgur.com/JkO2Vvi.png')
            .setDescription(`📥 Нажми кнопку ниже`);

        const button = new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        await channel.send({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(button)]
        });

    } catch (e) {
        console.log('Ошибка заявки:', e.message);
    }

    try {
        const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);

        const reportBtn = new ButtonBuilder()
            .setCustomId('create_portfolio')
            .setLabel('Создать портфель')
            .setStyle(ButtonStyle.Success);

        await reportChannel.send({
            content: '📂 Создай свой портфель',
            components: [new ActionRowBuilder().addComponents(reportBtn)]
        });

    } catch (e) {
        console.log('Ошибка отчетов:', e.message);
    }

    try {
        const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

        const rollbackBtn = new ButtonBuilder()
            .setCustomId('create_thread')
            .setLabel('Создать ветку')
            .setStyle(ButtonStyle.Primary);

        await rollbackChannel.send({
            content: '🎥 Создать ветку для откатов',
            components: [new ActionRowBuilder().addComponents(rollbackBtn)]
        });

    } catch (e) {
        console.log('Ошибка откатов:', e.message);
    }
});


// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // ================= ПОРТФЕЛЬ =================
    if (interaction.isButton() && interaction.customId === 'create_portfolio') {

        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;

            const category = await guild.channels.create({
                name: `портфель-${interaction.user.username}`,
                type: ChannelType.GuildCategory,
            });

            const channel = await guild.channels.create({
                name: `📁-портфель`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                    ...PORTFOLIO_ROLES.map(id => ({
                        id,
                        allow: ['ViewChannel', 'SendMessages']
                    }))
                ]
            });

            const msg = await channel.send({
                content: `📂 Портфель создан`
            });

            const threads = ['Capt', 'Mcl/Vzz', 'RP', 'gungame'];

            for (const name of threads) {
                await msg.startThread({
                    name,
                    autoArchiveDuration: 1440
                });
            }

            return interaction.editReply('✅ Портфель + ветки созданы');

        } catch (err) {
            console.log(err);

            if (interaction.deferred || interaction.replied) {
                return interaction.editReply('❌ Ошибка');
            }
        }
    }

    // ================= ОТКАТЫ =================
    if (interaction.isButton() && interaction.customId === 'create_thread') {

        try {
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;

            const category = await guild.channels.create({
                name: `откаты-${interaction.user.username}`,
                type: ChannelType.GuildCategory,
            });

            const channel = await guild.channels.create({
                name: `📼-откаты`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    { id: guild.id, deny: ['ViewChannel'] },
                    { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                    ...PORTFOLIO_ROLES.map(id => ({
                        id,
                        allow: ['ViewChannel', 'SendMessages']
                    }))
                ]
            });

            const msg = await channel.send({
                content: `📼 Откаты`
            });

            const threads = ['РП', 'GUNGAME', 'CAPT/MCL/VZZ'];

            for (const name of threads) {
                await msg.startThread({
                    name,
                    autoArchiveDuration: 1440
                });
            }

            return interaction.editReply('✅ Ветка создана');

        } catch (err) {
            console.log(err);
            return interaction.editReply('❌ Ошибка');
        }
    }

    // ================= APPLY =================
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
                new TextInputBuilder().setCustomId('nick').setLabel('Ник').setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('history').setLabel('История').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('video').setLabel('Откат').setStyle(TextInputStyle.Paragraph)
            )
        );

        return interaction.showModal(modal);
    }

    // ================= FORM =================
    if (interaction.isModalSubmit() && interaction.customId === 'form') {

        const panelChannel = await client.channels.fetch(CHANNEL_ID);
        const category = panelChannel.parent;

        const newChannel = await interaction.guild.channels.create({
            name: `заявка-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category.id,
        });

        const embed = new EmbedBuilder()
            .setTitle('📥 Новая заявка')
            .addFields(
                { name: 'Имя ирл', value: interaction.fields.getTextInputValue('name') },
                { name: 'Возраст', value: interaction.fields.getTextInputValue('age') },
                { name: 'Ник', value: interaction.fields.getTextInputValue('nick') },
                { name: 'История семей и почему ушел', value: interaction.fields.getTextInputValue('history') },
                { name: 'Откаты с гг', value: interaction.fields.getTextInputValue('video') }
            );

        await newChannel.send({
            embeds: [embed]
        });

        return interaction.reply({ content: '✅ Заявка отправлена', ephemeral: true });
    }
});

client.login(TOKEN);
