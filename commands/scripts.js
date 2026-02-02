module.exports = function scriptsCommand(bot, deps) {
    const { messages } = deps;

    bot.command('scripts', (ctx) => {
        return ctx.reply(
            messages.scriptsMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📋 Cobeklo без Fuckoff", callback_data: "cobeklo_simple" },
                            { text: "📋 Cobeklo с Fuckoff", callback_data: "cobeklo_rawclick" }
                        ],
                        [
                            { text: "📋 LuckyFeed", callback_data: "luckyfeed" },
                            { text: "📋 newsProfit", callback_data: "newsprofit" }
                        ],
                        [
                            { text: "📅 Скрипт даты", callback_data: "date" },
                            { text: "⏱ Скрипт таймера", callback_data: "timer" }
                        ]
                    ]
                }
            }
        );
    });
};