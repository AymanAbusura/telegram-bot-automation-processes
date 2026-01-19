module.exports = function startCommand(bot, deps) {
    const { messages } = deps;

    bot.start((ctx) => {
        return ctx.reply(
            messages.greetingMessage,
            {
                reply_markup: {
                    keyboard: [
                        [{ text: "/land" }],
                        [{ text: "/preland" }],
                        [{ text: "/prokla_land" }],
                        [{ text: "/land_form" }],
                        [{ text: "/land_to_preland" }],
                        [{ text: "/edit_order" }],
                        [{ text: "/phone" }],
                        [{ text: "/cobeklo" }],
                        [{ text: "/domonetka" }],
                        [{ text: "/translate" }],
                        [{ text: "/bot_info" }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: false
                }
            }
        );
    });
};
