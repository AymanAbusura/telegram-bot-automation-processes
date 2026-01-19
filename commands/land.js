module.exports = function landCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('land', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';

        const paramStr = text.replace('/land', '').trim();

        if (!paramStr) {
            userSessions[userId] = {
                type: 'landing',
                waitParams: true,
                params: null,
                archives: [],
                processingMultiple: false
            };

            return ctx.reply(
                messages.landMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать пример",
                                    copy_text: {
                                        text:
                                            "/land\n" +
                                            "kt=5\n" +
                                            "metka=1A\n" +
                                            "country=RU\n" +
                                            "lang=RU\n" +
                                            "number_code=+7\n" +
                                            "funnel=PrimeAura\n" +
                                            "source=Prime-Aura.com\n" +
                                            "logs=0"
                                    }
                                }
                            ]
                        ]
                    }
                }
            );
        }

        const lines = paramStr
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            return ctx.reply(
                '⛔️ Неверный формат.\n\nИспользуйте:\n' +
                '/land\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0'
            );
        }

        const params = {};
        for (const line of lines) {
            const idx = line.indexOf('=');
            if (idx === -1) continue;

            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();

            if (key && value) {
                params[key] = decodeURIComponent(value);
            }
        }

        userSessions[userId] = {
            type: 'landing',
            waitParams: false,
            params: Object.keys(params).length ? params : null,
            archives: [],
            processingMultiple: false
        };

        ctx.reply(
            '✅ Параметры сохранены!\n\n' +
            '📦 Теперь отправьте ZIP архив(ы).\n\n' +
            '⚠️ После отправки всех архивов нажмите кнопку ниже.',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🚀 Запустить обработку",
                                callback_data: "process_land_archives"
                            }
                        ]
                    ]
                }
            }
        );
    });
};