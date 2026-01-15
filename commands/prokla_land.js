module.exports = function proklaLandCommand(bot, deps) {
    const { userSessions, messages } = deps;

    bot.command('prokla_land', (ctx) => {
        const userId = ctx.from.id;
        const text = ctx.message.text || '';
        const paramStr = text.replace('/prokla_land', '').trim();

        if (!paramStr) {
            return ctx.reply(
                messages.proklaLandMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать команду",
                                    copy_text: {
                                        text: "/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
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
            return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0');
        }

        const keyValueMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
        if (!keyValueMatch) return ctx.reply('⛔️ Неверный формат первой строки.\nИспользуйте:\n/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0');

        const [, key, value] = keyValueMatch;

        const params = {};
        lines.slice(1).forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) params[k.trim()] = decodeURIComponent(v.trim());
        });

        userSessions[userId] = { 
            type: 'prokla_land', 
            params: Object.keys(params).length ? params : null,
            prelandParam: { key, value },
            archives: [],
            processingMultiple: false
        };

        ctx.reply(
            '✅ Параметры сохранены!\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".',
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