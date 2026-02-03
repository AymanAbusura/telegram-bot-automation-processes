module.exports = function startCommand(bot, deps) {
    const { messages } = deps;

    bot.start((ctx) => {
        return ctx.reply(
            messages.greetingMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 Ленденги", callback_data: "cmd_land" },
                            { text: "📄 Прилендинги", callback_data: "cmd_preland" },
                            { text: "🎯 Проклолендинги", callback_data: "cmd_prokla_land" }
                        ],
                        [
                            { text: "📝 Добавить форму", callback_data: "cmd_land_form" },
                            { text: "🔄 Форма → Кнопка", callback_data: "cmd_land_to_preland" }
                        ],
                        [
                            { text: "✏️ Изменить ордер", callback_data: "cmd_edit_order" },
                            { text: "🛡️ Антиспам ордер", callback_data: "cmd_order_antispam" },
                            { text: "📜 Скрипты", callback_data: "cmd_scripts" }
                        ],
                        [
                            { text: "📱 Код страны", callback_data: "cmd_phone" },
                            { text: "🌐 Перевести лендинг", callback_data: "cmd_translate" }
                        ],
                        [
                            { text: "🗜 Сжать изображение", callback_data: "cmd_compress" },
                            { text: "🌍 Скачать сайт", callback_data: "cmd_scrape" }
                        ],
                        [
                            { text: "🔗 Полезные сайты", callback_data: "cmd_webtools" },
                            { text: "📖 Мануал", callback_data: "cmd_guide" }
                        ],
                        [
                            { text: "📋 Правила", callback_data: "cmd_rules" },
                            { text: "ℹ️ О боте", callback_data: "cmd_bot_info" }
                        ]
                    ]
                }
            }
        );
    });
};