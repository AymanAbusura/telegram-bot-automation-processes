module.exports = function cobekloCommand(bot) {
    bot.command("cobeklo", (ctx) => {
        return ctx.reply(
            "📌 Выберите вариант Cobeklo:",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📋 Cobeklo без Fuckoff", callback_data: "cobeklo_simple" },
                            { text: "📋 Cobeklo с Fuckoff", callback_data: "cobeklo_rawclick" }
                        ]
                    ]
                }
            }
        );
    });
};