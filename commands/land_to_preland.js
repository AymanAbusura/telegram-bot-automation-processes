module.exports = function landToPrelandCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('land_to_preland', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        const paramStr = text.replace('/land_to_preland', '').trim();

        // ─────────────────────────────
        // STEP 1: No params → show help
        // ─────────────────────────────
        if (!paramStr) {
            userSessions[userId] = {
                type: 'land_to_preland',
                prelandParam: null,
                marker: null,
                params: null,
                archives: [],
                processingMultiple: false
            };

            return ctx.reply(
                messages.landToPrelandMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать пример",
                                    copy_text: {
                                        text:
                                            "/land_to_preland\n" +
                                            "key=value\n" +
                                            "marker=Official Website"
                                    }
                                }
                            ]
                        ]
                    }
                }
            );
        }

        // ─────────────────────────────
        // STEP 2: Parse params
        // ─────────────────────────────
        const lines = paramStr
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        if (lines.length < 1) {
            return ctx.reply('⛔️ Неверный формат.');
        }

        const firstLineMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
        if (!firstLineMatch) {
            return ctx.reply('⛔️ Первая строка должна быть key=value');
        }

        const [, key, value] = firstLineMatch;

        const params = {};
        let marker = null;

        for (const line of lines.slice(1)) {
            const idx = line.indexOf('=');
            if (idx === -1) continue;

            const k = line.slice(0, idx).trim();
            const v = decodeURIComponent(line.slice(idx + 1).trim());

            if (k.toLowerCase() === 'marker') {
                marker = v;
            } else {
                params[k] = v;
            }
        }

        if (!marker) {
            return ctx.reply('⛔️ Параметр "marker" обязателен.');
        }

        userSessions[userId] = {
            type: 'land_to_preland',
            prelandParam: { key, value },
            marker,
            params: Object.keys(params).length ? params : null,
            archives: [],
            processingMultiple: false
        };

        // ─────────────────────────────
        // STEP 3: Ask for ZIPs + button
        // ─────────────────────────────
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
                                callback_data: "process_land_to_preland_archives"
                            }
                        ]
                    ]
                }
            }
        );
    });
};