module.exports = function scriptsCommand(bot, deps) {
    const { messages } = deps;

    bot.command("scripts", (ctx) => {
        return ctx.reply(
            "📌 Выберите нужный скрипт:",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "📅 Скрипт даты", callback_data: "scripts_date" },
                            { text: "⏱ Скрипт таймера", callback_data: "scripts_timer" }
                        ]
                    ]
                }
            }
        );
    });
};
