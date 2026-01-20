const fs = require('fs');
const path = require('path');

module.exports = function loadCommands(bot, deps) {
    const commandsPath = __dirname;

    fs.readdirSync(commandsPath)
        .filter(file => file !== 'index.js' && file.endsWith('.js'))
        .forEach(file => {
            const register = require(path.join(commandsPath, file));
            register(bot, deps);
        });
};