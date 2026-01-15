module.exports = function landFormCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('land_form', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';

        const paramStr = text.replace('/land_form', '').trim();

        if (!paramStr) {
            userSessions[userId] = {
                type: 'land_form',
                waitParams: true,
                params: null,
                marker: null,
                archives: [],
                processingMultiple: false,
                chatId: ctx.chat.id
            };

            return ctx.reply(messages.landFormMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать команду",
                                    copy_text: {
                                        text: "/land_form\nmarker=Official site\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
                                    }
                                }
                            ]
                        ]
                    }
                }
            );
        }

        const lines = paramStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        if (lines.length === 0) {
            return ctx.reply(
                '⛔️ Неверный формат.\nИспользуйте:\n/land_form\nmarker=Official site\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0'
            );
        }

        const params = {};
        let marker = null;

        lines.forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) {
                const key = k.trim();
                const value = decodeURIComponent(v.trim());
                
                if (key === 'marker') {
                    marker = value;
                } else {
                    params[key] = value;
                }
            }
        });

        if (!marker) {
            return ctx.reply('⛔️ Параметр "marker" обязателен! Укажите текст, который нужно заменить на форму.');
        }

        if (Object.keys(params).length === 0) {
            return ctx.reply('⛔️ Не указаны параметры для формы (kt, metka, country и т.д.)');
        }

        userSessions[userId] = { 
            type: 'land_form', 
            waitParams: false, 
            params: params,
            marker: marker,
            archives: [],
            processingMultiple: false,
            chatId: ctx.chat.id
        };

        ctx.reply(
            `✅ Параметры сохранены!\n\n` +
            `🎯 Marker: "${marker}"\n` +
            `📋 Параметры формы: ${Object.keys(params).length} параметров\n\n` +
            `📦 Теперь отправьте ZIP архив(ы).\n\n` +
            `⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".`,
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