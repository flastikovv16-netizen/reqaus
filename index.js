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

// ====== РОЛИ ======
const ROLES = [
    '1493715429963731075',
    '1245159189777485885',
    '1252665952160452760',
];

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
            .setDescription(`👋 Путь в семью Kamatoz начинается здесь!`);

        const button = new ButtonBuilder()
            .setCustomId('apply')
            .setLabel('Подать заявку')
            .setStyle(ButtonStyle.Primary);

        await channel.send({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(button)]
        });

    } catch (e) {
        console.log(e);
    }

    try {
        const rollbackChannel = await client.channels.fetch(ROLLBACK_CHANNEL_ID);

        const rollbackBtn = new ButtonBuilder()
            .setCustomId('create_thread')
            .setLabel('Создать откаты')
            .setStyle(ButtonStyle.Primary);

        await rollbackChannel.send({
            content: '📼 Создать откаты',
            components: [new ActionRowBuilder().addComponents(rollbackBtn)]
        });

    } catch (e) {
        console.log(e);
    }
});


// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) return;

    // ================= ОТКАТЫ =================
    if (interaction.customId === 'create_thread') {

        try {
            await interaction.deferReply({ ephemeral: true });

            const parent = interaction.channel.parent;

            const channel = await interaction.guild.channels.create({
                name: `откаты-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: parent ? parent.id : null,
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
            console.log(err);
            return interaction.editReply('❌ Ошибка');
        }
    }

    // ================= APPLY =================
    if (interaction.customId === 'apply') {

    const modal = new ModalBuilder()
        .setCustomId('form')
        .setTitle('Заявка');

    const name = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('Имя ирл')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const age = new TextInputBuilder()
        .setCustomId('age')
        .setLabel('Возраст')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const nick = new TextInputBuilder()
        .setCustomId('nick')
        .setLabel('Ник')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const gungame = new TextInputBuilder()
        .setCustomId('Gungame')
        .setLabel('Откаты с гг тяжка+сайга')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(
        new ActionRowBuilder().addComponents(name),
        new ActionRowBuilder().addComponents(age),
        new ActionRowBuilder().addComponents(nick),
        new ActionRowBuilder().addComponents(gungame)
    );

    return interaction.showModal(modal).catch(err => {
        console.log('MODAL ERROR:', err);
    });
}

    // ================= FORM =================
    if (interaction.isModalSubmit() && interaction.customId === 'form') {

        try {
            await interaction.deferReply({ ephemeral: true });

            const panelChannel = await client.channels.fetch(CHANNEL_ID);

            const category = panelChannel.parent;

            const newChannel = await interaction.guild.channels.create({
                name: `заявка-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: category ? category.id : null,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    }
                ]
            });

            await newChannel.send({
                content: `📥 Заявка от <@${interaction.user.id}>
                
🧍 Имя: ${interaction.fields.getTextInputValue('name')}
🎂 Возраст: ${interaction.fields.getTextInputValue('age')}
🎮 Ник: ${interaction.fields.getTextInputValue('nick')}
🔥 Откаты: ${interaction.fields.getTextInputValue('gungame')}`
            });

            return interaction.editReply('✅ Заявка отправлена');

        } catch (err) {
            console.log('FORM ERROR:', err);
            return interaction.editReply('❌ Ошибка создания заявки');
        }
    }

    // ================= TAKE =================
    if (interaction.customId.startsWith('take_')) {

        if (takenRequests.has(interaction.channel.id))
            return interaction.reply({ content: 'Уже взято', ephemeral: true });

        takenRequests.add(interaction.channel.id);

        await interaction.channel.send(`🧾 Взял <@${interaction.user.id}>`);

        return interaction.reply({ content: 'OK', ephemeral: true });
    }

});

client.login(TOKEN);
