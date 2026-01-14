module.exports = function landCommand(bot, deps) {
    const { userSessions } = deps;

    bot.command('translate', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        
        const paramText = text.replace('/translate', '').trim();
        
        if (!paramText) {
            userSessions[userId] = {
                type: 'translate',
                waitLang: true,
                targetLang: null
            };
            
            return ctx.reply(
                '🌍 Команда /translate\n\n' +
                'Доступные языки для перевода:\n' +
                '🇬🇧 EN - Английский\n' +
                '🇪🇸 ES - Испанский\n' +
                '🇫🇷 FR - Французский\n' +
                '🇩🇪 DE - Немецкий\n' +
                '🇮🇹 IT - Итальянский\n' +
                '🇵🇹 PT - Португальский\n' +
                '🇳🇱 NL - Голландский\n' +
                '🇵🇱 PL - Польский\n' +
                '🇷🇺 RU - Русский\n' +
                '🇯🇵 JA - Японский\n' +
                '🇨🇳 ZH - Китайский\n\n' +
                '📋 Формат:\n/translate ES\n\n' +
                '⚠️ После отправки команды с языком, отправьте HTML файл для перевода.',
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать команду",
                                    copy_text: { text: "/translate ES" }
                                }
                            ]
                        ]
                    }
                }
            );
        }
        
        const targetLang = paramText.toUpperCase();
        const validLangs = ['EN', 'ES', 'FR', 'DE', 'IT', 'PT', 'NL', 'PL', 'RU', 'JA', 'ZH', 'EN-GB', 'EN-US', 'PT-BR', 'PT-PT'];
        
        if (!validLangs.includes(targetLang)) {
            return ctx.reply(
                '❌ Неверный код языка.\n\n' +
                'Используйте один из: EN, ES, FR, DE, IT, PT, NL, PL, RU, JA, ZH'
            );
        }
        
        userSessions[userId] = {
            type: 'translate',
            waitLang: false,
            targetLang: targetLang
        };
        
        ctx.reply(
            `✅ Язык перевода установлен: ${targetLang}\n\n` +
            '📄 Теперь отправьте HTML файл для перевода.'
        );
    });
};