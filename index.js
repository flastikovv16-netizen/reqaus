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

// ====== РОЛИ ======
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

// ================= READY =================
client.once('ready', async () => {
    console.log('Бот запущен');

    const channel = await client.channels.fetch(CHANNEL_ID);

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setImage('https://i.imgur.com/JkO2Vvi.png')
        .setDescription(`👋 Путь в семью Kamatoz начинается здесь!`);

    const button = new ButtonBuilder()
        .setCustomId('apply')
        .setLabel('Подать заявку')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
        embeds: [embed],
        components: [row]
    });
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    // ---------- APPLY ----------
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
                new TextInputBuilder().setCustomId('history').setLabel('История семей').setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('video').setLabel('Откаты с гг тяжка+сайга').setStyle(TextInputStyle.Paragraph)
            )
        );

        return interaction.showModal(modal);
    }

    // ---------- FORM ----------
    if (interaction.isModalSubmit() && interaction.customId === 'form') {
        try {
            const panelChannel = await client.channels.fetch(CHANNEL_ID);
            const category = panelChannel.parent;

            const newChannel = await interaction.guild.channels.create({
                name: `заявка-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
                    },
                    ...ROLES.map(roleId => ({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
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

    if (!interaction.isButton()) return;

    const userId = interaction.customId.split('_')[1];

    // ---------- TAKE ----------
    if (interaction.customId.startsWith('take_')) {

        if (!interaction.member.roles.cache.has(RECRUIT_ROLE)) {
            return interaction.reply({ content: '❌ Только рекрут', ephemeral: true });
        }

        if (takenRequests.has(interaction.channel.id)) {
            return interaction.reply({ content: '❌ Уже взята', ephemeral: true });
        }

        takenRequests.add(interaction.channel.id);

        for (let roleId of ROLES) {
            await interaction.channel.permissionOverwrites.edit(roleId, {
                ViewChannel: false
            });
        }

        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });

        await interaction.channel.send(`🧾 <@${interaction.user.id}> взял заявку`);

        return interaction.reply({ content: '✅ Ты взял заявку', ephemeral: true });
    }

    // ---------- CALL ----------
    if (interaction.customId.startsWith('call_')) {
        await interaction.channel.send(`📞 <@${userId}> зайди в войс`);
        return interaction.reply({ content: '📞 Отправлено', ephemeral: true });
    }

    // ---------- ACCEPT ----------
    if (interaction.customId.startsWith('accept_')) {

        const member = await interaction.guild.members.fetch(userId);
        await member.roles.add(ROLE_ACCEPT);

        stats[interaction.user.id] = (stats[interaction.user.id] || 0) + 1;

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(`✅ <@${interaction.user.id}> принял <@${userId}>`);

        await interaction.reply('✅ Принят');

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 10000);

        return;
    }

    // ---------- DENY ----------
    if (interaction.customId.startsWith('deny_')) {

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        await logChannel.send(`❌ <@${interaction.user.id}> отклонил <@${userId}>`);

        await interaction.reply('❌ Отклонён');

        setTimeout(() => {
            interaction.channel.delete().catch(() => {});
        }, 10000);

        return;
    }

    // ================= ОТКАТЫ (ДОБАВЛЕНО) =================
    if (interaction.customId === 'create_thread') {
        try {
            await interaction.deferReply({ ephemeral: true });

            const channel = await interaction.guild.channels.create({
                name: `откаты-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: interaction.channel.parent?.id || null,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    },
                    ...ROLES.map(id => ({
                        id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    }))
                ]
            });

            await channel.send(`📼 Откаты пользователя <@${interaction.user.id}>`);

            return interaction.editReply('✅ Успешно');

        } catch (err) {
            console.log('ROLLBACK ERROR:', err);
            return interaction.editReply('❌ Ошибка');
        }
    }
});

client.login(TOKEN);
