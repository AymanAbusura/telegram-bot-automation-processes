module.exports = function landFormCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('land_form', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        const paramStr = text.replace('/land_form', '').trim();

        // ─────────────────────────────
        // STEP 1: No params → show help
        // ─────────────────────────────
        if (!paramStr) {
            userSessions[userId] = {
                type: 'land_form',
                params: null,
                marker: null,
                archives: [],
                processingMultiple: false,
                chatId: ctx.chat.id
            };

            return ctx.reply(
                messages.landFormMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать пример",
                                    copy_text: {
                                        text:
                                            "/land_form\n" +
                                            "marker=Official site\n" +
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

        // ─────────────────────────────
        // STEP 2: Parse params
        // ─────────────────────────────
        const lines = paramStr
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(Boolean);

        const params = {};
        let marker = null;

        for (const line of lines) {
            const idx = line.indexOf('=');
            if (idx === -1) continue;

            const key = line.slice(0, idx).trim();
            const value = decodeURIComponent(line.slice(idx + 1).trim());

            if (key === 'marker') {
                marker = value;
            } else {
                params[key] = value;
            }
        }

        if (!marker) {
            return ctx.reply('⛔️ Параметр "marker" обязателен.');
        }

        if (Object.keys(params).length === 0) {
            return ctx.reply('⛔️ Не указаны параметры формы.');
        }

        userSessions[userId] = {
            type: 'land_form',
            params,
            marker,
            archives: [],
            processingMultiple: false,
            chatId: ctx.chat.id
        };

        // ─────────────────────────────
        // STEP 3: Ask for ZIPs + button
        // ─────────────────────────────
        ctx.reply(
            `✅ Параметры сохранены!\n\n` +
            `🎯 Marker: "${marker}"\n` +
            `📋 Параметров формы: ${Object.keys(params).length}\n\n` +
            `📦 Теперь отправьте ZIP архив(ы).\n\n` +
            `⚠️ После отправки всех архивов нажмите кнопку ниже.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🚀 Запустить обработку",
                                callback_data: "process_land_form_archives"
                            }
                        ]
                    ]
                }
            }
        );
    });
};