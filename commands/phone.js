const fs = require('fs');
const path = require('path');

module.exports = function phoneCodeCommand(bot, deps) {
    const { messages } = deps;

    let countryMap = {};

    try {
        let data = fs.readFileSync(
            path.join(__dirname, '..', 'data', 'countryPhoneCodes.json'),
            'utf8'
        );

        if (!data.trim().startsWith('[')) {
            data = `[${data}]`;
        }

        const countries = JSON.parse(data);

        countries.forEach(c => {
            if (c.iso && c.code) {
                countryMap[c.iso.toUpperCase()] = `+${c.code}`;
            }
        });

    } catch (err) {
        console.error('Failed to load countryPhoneCodes.json:', err);
    }

    bot.command('phone', (ctx) => {
        const parts = ctx.message.text.split(' ');

        if (parts.length < 2) {
            return ctx.reply(
                messages.phoneCodeMessage,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "📋 Скопировать пример",
                                    copy_text: { text: "/phone RU" }
                                }
                            ]
                        ]
                    }
                }
            );
        }

        const countryCode = parts[1].toUpperCase();
        const phoneCode = countryMap[countryCode];

        if (phoneCode) {
            return ctx.reply(`✅ Код страны ${countryCode}: ${phoneCode}`);
        }

        return ctx.reply(`❌ Страна с кодом "${countryCode}" не найдена.`);
    });
};