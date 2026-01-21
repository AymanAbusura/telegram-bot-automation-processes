module.exports = function rulesCommand(bot, deps) {
    const { messages } = deps;
    
    bot.command('rules', (ctx) => {
        ctx.reply(messages.rulesMessage);
    });
};