module.exports = function proklaLandCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('prokla_land', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        const paramStr = text.replace('/prokla_land', '').trim();

        if (!paramStr) {
            userSessions[userId] = {
                type: 'prokla_land',
                params: null,
                prelandParam: null,
                archives: [],
                processingMultiple: false
            };

            return ctx.reply(
                messages.proklaLandMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать пример",
                                    copy_text: {
                                        text:
                                            "/prokla_land\n" +
                                            "key=value\n" +
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

        if (lines.length < 2) {
            return ctx.reply(
                '⛔️ Неверный формат.\n\nИспользуйте:\n' +
                '/prokla_land\nkey=value\nkt=5\n...'
            );
        }

        const firstLineMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
        if (!firstLineMatch) {
            return ctx.reply(
                '⛔️ Неверный формат первой строки.\n\nПервая строка должна быть:\nkey=value'
            );
        }

        const [, key, value] = firstLineMatch;

        const params = {};
        for (const line of lines.slice(1)) {
            const idx = line.indexOf('=');
            if (idx === -1) continue;

            const k = line.slice(0, idx).trim();
            let v = line.slice(idx + 1).trim();

            if (k && v) {
                if (k === 'country' || k === 'lang') {
                    v = v.toUpperCase();
                }
                
                if (k === 'metka') {
                    const metkaMatch = v.match(/([a-zA-Z])(\d+)|(\d+)([a-zA-Z])/);
                    if (metkaMatch) {
                        if (metkaMatch[1] && metkaMatch[2]) {
                            v = metkaMatch[2] + metkaMatch[1].toUpperCase();
                        } else if (metkaMatch[3] && metkaMatch[4]) {
                            v = metkaMatch[3] + metkaMatch[4].toUpperCase();
                        }
                    }
                }
                
                params[k] = decodeURIComponent(v);
            }
        }

        userSessions[userId] = {
            type: 'prokla_land',
            params: Object.keys(params).length ? params : null,
            prelandParam: { key, value },
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
                                callback_data: "process_prokla_land_archives"
                            }
                        ]
                    ]
                }
            }
        );
    });
};