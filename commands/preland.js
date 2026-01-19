module.exports = function prelandCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('preland', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';

        const paramText = text.replace('/preland', '').trim();

        // ─────────────────────────────
        // STEP 1: No params → show help
        // ─────────────────────────────
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
                                    text: "📋 Скопировать пример",
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

        // ─────────────────────────────
        // STEP 2: Parse param (key=value)
        // ─────────────────────────────
        const match = paramText.match(/^\s*([^=]+)=([^=]+)\s*$/);

        if (!match) {
            return ctx.reply(
                '⛔️ Неверный формат.\n\nИспользуйте:\n/preland key=value'
            );
        }

        const [, key, value] = match;

        userSessions[userId] = {
            type: 'prelanding',
            waitPreParams: false,
            prelandParam: { key, value },
            archives: [],
            processingMultiple: false
        };

        // ─────────────────────────────
        // STEP 3: Ask for ZIPs + button
        // ─────────────────────────────
        ctx.reply(
            `✅ Параметры сохранены: ${key}=${value}\n\n` +
            `📦 Теперь отправьте ZIP архив(ы).\n\n` +
            `⚠️ После отправки всех архивов нажмите кнопку ниже.`,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🚀 Запустить обработку",
                                callback_data: "process_preland_archives"
                            }
                        ]
                    ]
                }
            }
        );
    });
};