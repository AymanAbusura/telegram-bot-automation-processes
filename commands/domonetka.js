module.exports = function domonetkaCommand(bot, deps) {
    const { messages } = deps;

    bot.command("domonetka", (ctx) => {
        return ctx.reply(
            messages.domonetkaMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📋 LuckyFeed", callback_data: "domonetka_luckyfeed" },
                            { text: "📋 newsProfit", callback_data: "domonetka_newsprofit" }
                        ]
                    ]
                }
            }
        );
    });
};