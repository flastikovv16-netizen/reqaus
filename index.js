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
const ROLES = [
    '1493715429963731075',
    '1245159189777485885',
    '1252665952160452760',
];

const PORTFOLIO_ROLES = [
    '1493715429963731075'
];

const ROLE_ACCEPT = '1245316820903395349';
const RECRUIT_ROLE = '1493715429963731075';
const LOG_CHANNEL_ID = '1493716294531416085';

// ====== СТАТЫ ======
const stats = {};
const takenRequests = new Set();

// защита от дюпа панелей
let panelsSent = false;

// ================= READY =================
client.once('ready', async () => {
    console.log('Бот запущен');

    if (panelsSent) return;
    panelsSent = true;

    // ====== ЗАЯВКИ ======
    const channel = await client.channels.fetch(CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setImage('https://i.imgur.com/JkO2Vvi.png')
        .setDescription(`
👋 Путь в семью Kamatoz начинается здесь!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Важно  
Прочитайте ВСЕ ВОПРОСЫ.  
Если не ответили — ЗАЯВКА ОТКЛОНЯЕТСЯ.  
ЗАЯВКИ только на сервер Orlando (18)

Требования:  
Возраст - 15+  
Прайм тайм - 4+  
Базовая стрельба  
Адекватность  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Нажми кнопку ниже
`);

    const applyBtn = new ButtonBuilder()
        .setCustomId('apply')
        .setLabel('Подать заявку')
        .setStyle(ButtonStyle.Primary);

    await channel.send({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(applyBtn)]
    });

    // ====== ОТЧЕТЫ (портфель) ======
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);

    const portfolioBtn = new ButtonBuilder()
        .setCustomId('create_portfolio')
        .setLabel('Создать портфель')
        .setStyle(ButtonStyle.Success);

    await reportChannel.send({
        content: '📂 Создать портфель',
        components: [new ActionRowBuilder().addComponents(portfolioBtn)]
    });

    // ====== ОТКАТЫ ======
    const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

    const rollbackBtn = new ButtonBuilder()
        .setCustomId('create_thread')
        .setLabel('Создать откаты')
        .setStyle(ButtonStyle.Primary);

    await rollbackChannel.send({
        content: '📼 Создать откаты',
        components: [new ActionRowBuilder().addComponents(rollbackBtn)]
    });
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    // ====== APPLY ======
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
            )
        );

        return interaction.showModal(modal);
    }

    // ====== FORM ======
    if (interaction.isModalSubmit() && interaction.customId === 'form') {

        await interaction.deferReply({ ephemeral: true });

        const panelChannel = await client.channels.fetch(CHANNEL_ID);
        const category = panelChannel.parent;

        const newChannel = await interaction.guild.channels.create({
            name: `заявка-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: category?.id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                ...ROLES.map(id => ({
                    id,
                    allow: ['ViewChannel', 'SendMessages']
                }))
            ]
        });

        await newChannel.send(`📥 Заявка от <@${interaction.user.id}>`);

        return interaction.editReply('✅ Заявка отправлена');
    }

    if (!interaction.isButton()) return;

    const userId = interaction.customId.split('_')[1];

    // ====== ПОРТФЕЛЬ ======
    if (interaction.customId === 'create_portfolio') {

        await interaction.deferReply({ ephemeral: true });

        const category = await interaction.guild.channels.create({
            name: `портфель-${interaction.user.username}`,
            type: ChannelType.GuildCategory
        });

        await category.permissionOverwrites.set([
            { id: interaction.guild.id, deny: ['ViewChannel'] },
            { id: interaction.user.id, allow: ['ViewChannel'] },
            ...PORTFOLIO_ROLES.map(id => ({ id, allow: ['ViewChannel'] }))
        ]);

        const names = ['рп', 'капты', 'mcl/vzz'];

        for (let n of names) {
            await interaction.guild.channels.create({
                name: n,
                type: ChannelType.GuildText,
                parent: category.id
            });
        }

        return interaction.editReply('✅ Портфель создан');
    }

    // ====== ОТКАТЫ ======
    if (interaction.customId === 'create_thread') {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parentId,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                ...ROLES.map(id => ({ id, allow: ['ViewChannel'] }))
            ]
        });

        await channel.send(`📼 Откаты <@${interaction.user.id}>`);

        return interaction.editReply('✅ Откаты созданы');
    }

    // ====== ACCEPT ======
    if (interaction.customId.startsWith('accept_')) {

        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(ROLE_ACCEPT);

        stats[interaction.user.id] = (stats[interaction.user.id] || 0) + 1;

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(
            `✅ <@${interaction.user.id}> принял <@${userId}> | Всего: ${stats[interaction.user.id]}`
        );

        await interaction.reply('✅ Принят');

        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }

    // ====== DENY ======
    if (interaction.customId.startsWith('deny_')) {

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(`❌ <@${interaction.user.id}> отклонил <@${userId}>`);

        await interaction.reply('❌ Отклонён');

        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }
});

client.login(TOKEN);
