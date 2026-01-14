module.exports = function landCommand(bot, deps) {
    const { messages } = deps;
    
    bot.command('bot_info', (ctx) => {
        ctx.reply(messages.botInfoMessage);
    });
};