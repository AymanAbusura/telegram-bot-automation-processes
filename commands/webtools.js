module.exports = function webtoolsCommand(bot, deps) {
    const { messages } = deps;

    bot.command('webtools', (ctx) => {
        return ctx.reply(messages.webtoolsMessage || 'Полезные веб-инструменты', {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🧹 DirtyMarkup', url: 'https://www.10bestdesign.com/dirtymarkup/' }],
                    [{ text: '🗜 CompressWEBP', url: 'https://imagecompressor.com/' }],
                    [{ text: '🗜 CompressPNG', url: 'https://compresspng.com/' }],
                    [{ text: '🗜 CompressJPEG', url: 'https://compressjpeg.com/' }],
                    [{ text: '📦 SaveWeb2ZIP', url: 'https://saveweb2zip.com/ru' }],
                    [{ text: '📦 Web2Zip', url: 'https://web2zip.ru/' }]
                ]
            }
        });
    });
};