module.exports = function landCommand(bot, deps) {
    const { userSessions } = deps;

    bot.command('edit_order', (ctx) => {
        const userId = ctx.from.id;
        userSessions[userId] = {
            type: 'edit_order',
            waitFile: true,
            filePath: null,
            code: null
        };
        ctx.reply('📦 Отправьте ваш файл order.php для редактирования.');
    });
};