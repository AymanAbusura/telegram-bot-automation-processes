module.exports = function prelandCommand(bot, deps) {
    const { userSessions, messages } = deps;
    
    bot.command('preland', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';

        const paramText = text.replace('/preland', '').trim();

        if (!paramText) {
            userSessions[userId] = {
                type: 'prelanding',
                waitPreParams: true,
                prelandParam: null,
                archives: [],
                processingMultiple: false
            };
            return ctx.reply(
                messages.preLandMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать команду",
                                    copy_text: {
                                        text: "/preland key=value"
                                    }
                                }
                            ]
                        ]
                    }
                }
            );
        }

        const match = paramText.match(/^\s*([^=]+)=([^=]+)\s*$/);
        if (!match) return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/preland key=value');

        const [, key, value] = match;
        userSessions[userId] = {
            type: 'prelanding',
            waitPreParams: false,
            prelandParam: { key, value },
            archives: [],
            processingMultiple: false
        };

        ctx.reply(
            `✅ Параметры сохранены: ${key}=${value}\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "process"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    });
};