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
                                    text: "📋 Скопировать команду",
                                    copy_text: {
                                        text: "/land\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
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
                '⛔️ Неверный формат.\nИспользуйте:\n/land\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0'
            );
        }

        const params = {};
        lines.forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) {
                params[k.trim()] = decodeURIComponent(v.trim());
            }
        });

        userSessions[userId] = { 
            type: 'landing', 
            waitParams: false, 
            params: Object.keys(params).length ? params : null,
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