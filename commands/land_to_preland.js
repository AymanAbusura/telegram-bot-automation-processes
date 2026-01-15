module.exports = function landToPrelandCommand(bot, deps) {
    const { userSessions, messages } = deps;
    
    bot.command('land_to_preland', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        const paramStr = text.replace('/land_to_preland', '').trim();

        if (!paramStr) {
            return ctx.reply(messages.landToPrelandMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать команду",
                                    copy_text: {
                                        text: "/land_to_preland\nkey=value\nmarker=Official Website"
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
            return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/land_to_preland\nkey=value\nmarker=Official Website');
        }

        const keyValueMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
        if (!keyValueMatch) return ctx.reply('⛔️ Неверный формат первой строки.\nИспользуйте:\n/land_to_preland\nkey=value\nmarker=Official Website');

        const [, key, value] = keyValueMatch;

        const params = {};
        let marker = 'process';
        lines.slice(1).forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) {
                const trimmedKey = k.trim();
                const trimmedValue = decodeURIComponent(v.trim());
                if (trimmedKey.toLowerCase() === 'marker') marker = trimmedValue;
                else params[trimmedKey] = trimmedValue;
            }
        });

        userSessions[userId] = { 
            type: 'land_to_preland', 
            prelandParam: { key, value },
            marker: marker,
            params: Object.keys(params).length ? params : null,
            archives: [],
            processingMultiple: false
        };

        ctx.reply(
            `✅ Параметры сохранены!\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ После отправки всех архивов нажмите кнопку или напишите "process".`,
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