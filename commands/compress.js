module.exports = (bot, { userSessions }) => {
    bot.command('compress', (ctx) => {
        const userId = ctx.from.id;
        
        userSessions[userId] = {
            type: 'compress',
            waitingForImage: true
        };
        
        return ctx.reply(
            '📷 Отправьте изображение для сжатия.\n\n' +
            'Поддерживаемые форматы: JPG, PNG, WebP, AVIF, TIFF\n' +
            'После отправки изображения выберите качество сжатия.',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '❌ Отмена', callback_data: 'cancel_compress' }
                        ]
                    ]
                }
            }
        );
    });
};