module.exports = function domonetkaCommand(bot, deps) {
    const { messages } = deps;

    const luckyFeedHead =
        `<script src="//static.bestgonews.com/m1sh81qh8/ivl867tq2h8q/h18mp0quv3y0kzh57o.js"></script>`;

    const luckyFeedBody =
        `<script>window.initBacklink("https://webechoesoftoday.com/product?stream_uuid=113a3774-a4c9-44d2-bcab-08719d22814b&subid2=METKA")</script>`;

    const newsProfitFull =
        `<script src="https://mixer-events.com/back.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    window.vitBack("https://mixer-events.com/new?utm_campaign=53978&utm_source=[SID]&sid7=METKA&utm_medium=4840", true);
});
</script>`;

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

    bot.on("callback_query", async (ctx) => {
        const data = ctx.callbackQuery.data;
        await ctx.answerCbQuery();

        if (data === "domonetka_luckyfeed") {
            return ctx.reply(
                `📌 Код для LuckyFeed:\n\n` +
                `🟦 Вставьте перед </head>:\n\`\`\`\n${luckyFeedHead}\n\`\`\`\n\n` +
                `🟩 Вставьте перед </body>:\n\`\`\`\n${luckyFeedBody}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }

        if (data === "domonetka_newsprofit") {
            return ctx.reply(
                `📌 Код для newsProfit (OneProfit):\n\`\`\`\n${newsProfitFull}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }
    });
};