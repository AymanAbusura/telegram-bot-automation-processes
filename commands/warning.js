module.exports = function warningCommand(bot, deps) {
    const { messages } = deps;
    
    bot.command('warning', (ctx) => {
        ctx.reply(messages.warningMessage);
    });
};