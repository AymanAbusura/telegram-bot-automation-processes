module.exports = function scrapeCommand(bot, deps) {
    const { userSessions } = deps;

    bot.command('scrape', (ctx) => {
        const userId = ctx.from.id;

        userSessions[userId] = {
            type: 'scrape',
            waitingForUrl: true
        };

        return ctx.reply(
            '🌐 <b>Web Scraper</b>\n\n' +
            'Отправьте URL сайта, который хотите скачать.\n\n' +
            '<b>Пример:</b>\n' +
            'https://example.com\n\n' +
            '<i>⚠️ Бот скачает HTML, CSS, JS, изображения и другие ресурсы.</i>',
            { parse_mode: 'HTML' }
        );
    });
};