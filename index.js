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

// ====== ОСНОВНЫЕ КАНАЛЫ ======
const CHANNEL_ID = '1493632481763790954';

// ====== НОВЫЕ КАНАЛЫ ======
const REPORT_CHANNEL_ID = '1497290160273096744';
const ROLLBACK_CHANNEL_ID = '1497292157499867166';

// ====== РОЛИ ДОСТУПА К ВЕТКАМ ======
const PORTFOLIO_ROLES = [
    '1319640563401752586',
    '1319640756524417046'
    '1252673349440508034'
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


// ---------- ПАНЕЛИ ----------
client.once('ready', async () => {
    console.log('Бот запущен');

    // ====== ПАНЕЛЬ ЗАЯВОК ======
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

    // ====== ПАНЕЛЬ ОТЧЕТОВ ======
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);

    const reportBtn = new ButtonBuilder()
        .setCustomId('create_portfolio')
        .setLabel('Создать портфель')
        .setStyle(ButtonStyle.Success);

    await reportChannel.send({
        content: '📂 Создай свой портфель',
        components: [new ActionRowBuilder().addComponents(reportBtn)]
    });

    // ====== ПАНЕЛЬ ОТКАТОВ ======
    const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

    const rollbackBtn = new ButtonBuilder()
        .setCustomId('create_thread')
        .setLabel('Создать ветку')
        .setStyle(ButtonStyle.Primary);

    await rollbackChannel.send({
        content: '🎥 Создать ветку для откатов',
        components: [new ActionRowBuilder().addComponents(rollbackBtn)]
    });
});


// ---------- ОБРАБОТЧИК ----------
client.on(Events.InteractionCreate, async interaction => {

    // ====== СОЗДАНИЕ ПОРТФЕЛЯ ======
    if (interaction.isButton() && interaction.customId === 'create_portfolio') {

        const parent = interaction.channel.parent;

        const portfolio = await interaction.guild.channels.create({
            name: `портфель-${interaction.user.username}`,
            type: ChannelType.GuildCategory,
            parent: parent.id,
        });

        // ПРАВА
        await portfolio.permissionOverwrites.set([
            {
                id: interaction.guild.id,
                deny: ['ViewChannel'],
            },
            {
                id: interaction.user.id,
                allow: ['ViewChannel']
            },
            ...PORTFOLIO_ROLES.map(id => ({
                id,
                allow: ['ViewChannel']
            }))
        ]);

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

    // ====== СОЗДАНИЕ ВЕТКИ ОТКАТОВ ======
    if (interaction.isButton() && interaction.customId === 'create_thread') {

        const parent = interaction.channel.parent;

        const newChannel = await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: parent.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel'],
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages']
                },
                ...PORTFOLIO_ROLES.map(id => ({
                    id,
                    allow: ['ViewChannel']
                }))
            ]
        });

        return interaction.reply({ content: '✅ Ветка создана', ephemeral: true });
    }

    // ====== ДАЛЬШЕ ТВОЙ КОД БЕЗ ИЗМЕНЕНИЙ ======

    // (оставляю как есть)
});
client.login(TOKEN);
