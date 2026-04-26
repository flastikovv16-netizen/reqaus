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
const ROLLBACK_CHANNEL_ID = '1497292157499867166';
const REPORT_CHANNEL_ID = '1497290160273096744';

// ====== РОЛИ ======
const ROLES = [
    '1493715429963731075',
    '1319640563401752586',
    '1319640756524417046',
    '1252673349440508034',
    '1245159189777485885'
];

// 🔥 КТО МОЖЕТ ПРИНИМАТЬ
const STAFF_ROLES = [
    '1493715429963731075',
    '1319640563401752586',
    '1319640756524417046',
    '1252673349440508034',
    '1245159189777485885'
];

const ROLE_ACCEPT = '1245316820903395349';
const RECRUIT_ROLE = '1493715429963731075';
const LOG_CHANNEL_ID = '1493716294531416085';

const stats = {};
const takenRequests = new Set();


// ================= READY =================
client.once('ready', async () => {
    console.log('Бот запущен');

    // ===== ЗАЯВКИ =====
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
Прайм тайм - 4+ (исключения)  
Базовая стрельба с тяжки + сайга  
Адекватность  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Нажми кнопку ниже
`);

    await channel.send({
        embeds: [embed],
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('apply')
                    .setLabel('Подать заявку')
                    .setStyle(ButtonStyle.Primary)
            )
        ]
    });

    // ===== ОТКАТЫ =====
    const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

    await rollbackChannel.send({
        content: '📼 Создать откаты',
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_thread')
                    .setLabel('Создать откаты')
                    .setStyle(ButtonStyle.Primary)
            )
        ]
    });

    // ===== ПОРТФЕЛЬ =====
    const reportChannel = await client.channels.fetch(REPORT_CHANNEL_ID);

    await reportChannel.send({
        content: '📂 Создать портфель',
        components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_portfolio')
                    .setLabel('Создать портфель')
                    .setStyle(ButtonStyle.Success)
            )
        ]
    });
});


// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    // ===== APPLY =====
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
                new TextInputBuilder().setCustomId('video').setLabel('Откаты с тяжки+сайга с гг').setStyle(TextInputStyle.Paragraph)
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
                { name: 'История семей и почему ушли', value: interaction.fields.getTextInputValue('history') },
                { name: 'Откаты с гг сайга + тяжка', value: interaction.fields.getTextInputValue('video') }
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

    // 🔒 ПРОВЕРКА ДОСТУПА
    const hasAccess = STAFF_ROLES.some(role =>
        interaction.member.roles.cache.has(role)
    );

    // ❌ ЗАПРЕТ САМОМУ СЕБЯ
    if (interaction.user.id === userId) {
        return interaction.reply({ content: '❌ Нельзя самому себя принять', ephemeral: true });
    }

    // ===== CALL =====
    if (interaction.customId.startsWith('call_')) {

        if (!hasAccess)
            return interaction.reply({ content: '❌ Нет доступа', ephemeral: true });

        await interaction.channel.send(
            `📞 <@${userId}> Вы были вызваны на обзвон, зайдите в любой войс или напишите удобное для вас время`
        );

        return interaction.reply({ content: '📞 Вызов отправлен', ephemeral: true });
    }

    // ===== ACCEPT =====
    if (interaction.customId.startsWith('accept_')) {

        if (!hasAccess)
            return interaction.reply({ content: '❌ Нет доступа', ephemeral: true });

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

    // ===== DENY =====
    if (interaction.customId.startsWith('deny_')) {

        if (!hasAccess)
            return interaction.reply({ content: '❌ Нет доступа', ephemeral: true });

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(`❌ <@${interaction.user.id}> отклонил <@${userId}>`);

        await interaction.reply('❌ Отклонён');

        setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
    }

    // ===== ОТКАТЫ =====
    if (interaction.customId === 'create_thread') {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `откаты-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent?.id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                ...STAFF_ROLES.map(id => ({
                    id,
                    allow: ['ViewChannel']
                }))
            ]
        });

        await channel.send(`📼 Откаты <@${interaction.user.id}>`);

        return interaction.editReply('✅ Откаты созданы');
    }

    // ===== ПОРТФЕЛЬ (ФИКС 3 ВЕТОК) =====
    if (interaction.customId === 'create_portfolio') {

        await interaction.deferReply({ ephemeral: true });

        const channel = await interaction.guild.channels.create({
            name: `портфель-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent?.id,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: ['ViewChannel'] },
                { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                ...STAFF_ROLES.map(id => ({
                    id,
                    allow: ['ViewChannel']
                }))
            ]
        });

        // 🔥 ЖЁСТКИЙ ФИКС: создаём 3 РАЗНЫХ СООБЩЕНИЯ
        const m1 = await channel.send('📁 РП');
        await m1.startThread({ name: 'РП', autoArchiveDuration: 1440 });

        const m2 = await channel.send('📁 КАПТЫ');
        await m2.startThread({ name: 'КАПТЫ', autoArchiveDuration: 1440 });

        const m3 = await channel.send('📁 МЦЛ');
        await m3.startThread({ name: 'МЦЛ', autoArchiveDuration: 1440 });

        return interaction.editReply('✅ Портфель создан');
    }
});

client.login(TOKEN);
