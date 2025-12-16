require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cheerio = require('cheerio');

const app = express();

const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSessions = {};

const ORDER_TEMPLATE_PATH = './api/order_template.php';
const { generateFormScriptsContent } = require('./scripts/form-scripts');
const { generateFormHTML } = require('./scripts/form');
const getButtonHtml = require('./scripts/buttonTemplate.js');
const messages = require('./data/messages.json');


/* ---------------------- TELEGRAM COMMAND MENU ---------------------- */
bot.telegram.setMyCommands([
    { command: 'land', description: 'Ленденги' },
    { command: 'preland', description: 'Прилендинги' },
    { command: 'prokla_land', description: 'Проклолендинги' },
    { command: 'land_form', description: 'Добавить форму и настроить ленд' },
    { command: 'land_to_preland', description: 'Заменить форму на кнопку' },
    { command: 'edit_order', description: 'Изменить фйал ордер' },
    { command: 'domonetka', description: 'Домонетки' },
    { command: 'phone_code', description: 'Коды телефонов стран' },
    { command: 'bot_info', description: 'Информация о боте' }
]);

/* ------------------------ BOT COMMANDS ------------------------ */
bot.start((ctx) => {
    ctx.reply(
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
                    [{ text: "/domonetka" }],
                    [{ text: "/phone_code" }],
                    [{ text: "/bot_info" }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        }
    );
});

/* ------------------------ /land ------------------------ */
bot.command('land', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';

    const paramStr = text.replace('/land', '').trim();

    if (!paramStr) {
        userSessions[userId] = {
            type: 'landing',
            waitParams: true,
            params: null,
            archives: [],
            processingMultiple: false
        };

        return ctx.reply(
            messages.landMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/land\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const lines = paramStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
        return ctx.reply(
            '⛔️ Неверный формат.\nИспользуйте:\n/land\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0'
        );
    }

    const params = {};
    lines.forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) {
            params[k.trim()] = decodeURIComponent(v.trim());
        }
    });

    userSessions[userId] = { 
        type: 'landing', 
        waitParams: false, 
        params: Object.keys(params).length ? params : null,
        archives: [],
        processingMultiple: false 
    };

    ctx.reply(
        '✅ Параметры сохранены!\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📋 Скопировать команду",
                            copy_text: {
                                text: "process"
                            }
                        }
                    ]
                ]
            }
        }
    );
});
/* ------------------------ /preland ------------------------ */
bot.command('preland', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';

    const paramText = text.replace('/preland', '').trim();

    if (!paramText) {
        userSessions[userId] = {
            type: 'prelanding',
            waitPreParams: true,
            prelandParam: null,
            archives: [],
            processingMultiple: false
        };
        return ctx.reply(
            messages.preLandMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/preland key=value"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const match = paramText.match(/^\s*([^=]+)=([^=]+)\s*$/);
    if (!match) return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/preland key=value');

    const [, key, value] = match;
    userSessions[userId] = {
        type: 'prelanding',
        waitPreParams: false,
        prelandParam: { key, value },
        archives: [],
        processingMultiple: false
    };

    ctx.reply(
        `✅ Параметры сохранены: ${key}=${value}\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📋 Скопировать команду",
                            copy_text: {
                                text: "process"
                            }
                        }
                    ]
                ]
            }
        }
    );
});

/* ------------------------ prokla_land ------------------------ */
bot.command('prokla_land', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';
    const paramStr = text.replace('/prokla_land', '').trim();

    if (!paramStr) {
        return ctx.reply(
            messages.proklaLandMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const lines = paramStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
        return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0');
    }

    const keyValueMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
    if (!keyValueMatch) return ctx.reply('⛔️ Неверный формат первой строки.\nИспользуйте:\n/prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0');

    const [, key, value] = keyValueMatch;

    const params = {};
    lines.slice(1).forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) params[k.trim()] = decodeURIComponent(v.trim());
    });

    userSessions[userId] = { 
        type: 'prokla_land', 
        params: Object.keys(params).length ? params : null,
        prelandParam: { key, value },
        archives: [],
        processingMultiple: false
    };

    ctx.reply(
        '✅ Параметры сохранены!\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".',
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📋 Скопировать команду",
                            copy_text: {
                                text: "process"
                            }
                        }
                    ]
                ]
            }
        }
    );
});

/* ------------------------ land_form ------------------------ */
bot.command('land_form', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';

    const paramStr = text.replace('/land_form', '').trim();

    if (!paramStr) {
        userSessions[userId] = {
            type: 'land_form',
            waitParams: true,
            params: null,
            marker: null,
            archives: [],
            processingMultiple: false,
            chatId: ctx.chat.id
        };

        return ctx.reply(messages.landFormMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/land_form\nmarker=Official site\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const lines = paramStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
        return ctx.reply(
            '⛔️ Неверный формат.\nИспользуйте:\n/land_form\nmarker=Official site\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0'
        );
    }

    const params = {};
    let marker = null;

    lines.forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) {
            const key = k.trim();
            const value = decodeURIComponent(v.trim());
            
            if (key === 'marker') {
                marker = value;
            } else {
                params[key] = value;
            }
        }
    });

    if (!marker) {
        return ctx.reply('⛔️ Параметр "marker" обязателен! Укажите текст, который нужно заменить на форму.');
    }

    if (Object.keys(params).length === 0) {
        return ctx.reply('⛔️ Не указаны параметры для формы (kt, metka, country и т.д.)');
    }

    userSessions[userId] = { 
        type: 'land_form', 
        waitParams: false, 
        params: params,
        marker: marker,
        archives: [],
        processingMultiple: false,
        chatId: ctx.chat.id
    };

    ctx.reply(
        `✅ Параметры сохранены!\n\n` +
        `🎯 Marker: "${marker}"\n` +
        `📋 Параметры формы: ${Object.keys(params).length} параметров\n\n` +
        `📦 Теперь отправьте ZIP архив(ы).\n\n` +
        `⚠️ ВАЖНО: После отправки ВСЕХ архивов нажмите кнопку для копирования команды или напишите "process".`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📋 Скопировать команду",
                            copy_text: {
                                text: "process"
                            }
                        }
                    ]
                ]
            }
        }
    );
});

/* ------------------------ /land_to_preland ------------------------ */
bot.command('land_to_preland', (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text || '';
    const paramStr = text.replace('/land_to_preland', '').trim();

    if (!paramStr) {
        return ctx.reply(messages.landToPrelandMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/land_to_preland\nkey=value\nmarker=Official Website"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const lines = paramStr.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
        return ctx.reply('⛔️ Неверный формат.\nИспользуйте:\n/land_to_preland\nkey=value\nmarker=Official Website');
    }

    const keyValueMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
    if (!keyValueMatch) return ctx.reply('⛔️ Неверный формат первой строки.\nИспользуйте:\n/land_to_preland\nkey=value\nmarker=Official Website');

    const [, key, value] = keyValueMatch;

    const params = {};
    let marker = 'process';
    lines.slice(1).forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) {
            const trimmedKey = k.trim();
            const trimmedValue = decodeURIComponent(v.trim());
            if (trimmedKey.toLowerCase() === 'marker') marker = trimmedValue;
            else params[trimmedKey] = trimmedValue;
        }
    });

    userSessions[userId] = { 
        type: 'land_to_preland', 
        prelandParam: { key, value },
        marker: marker,
        params: Object.keys(params).length ? params : null,
        archives: [],
        processingMultiple: false
    };

    ctx.reply(
        `✅ Параметры сохранены!\n\n📦 Теперь отправьте ZIP архив(ы).\n\n⚠️ После отправки всех архивов нажмите кнопку или напишите "process".`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "📋 Скопировать команду",
                            copy_text: {
                                text: "process"
                            }
                        }
                    ]
                ]
            }
        }
    );
});

/* ------------------------ /edit_order ------------------------ */
bot.command('edit_order', (ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = {
        type: 'edit_order',
        waitFile: true,
        filePath: null,
        code: null
    };
    ctx.reply('📦 Отправьте ваш файл order.php для редактирования.');
});

/* ------------------------ /domonetka ------------------------ */
const luckyFeedHead = `<script src="//static.bestgonews.com/m1sh81qh8/ivl867tq2h8q/h18mp0quv3y0kzh57o.js"></script>`;
const luckyFeedBody = `<script>window.initBacklink("https://webechoesoftoday.com/product?stream_uuid=113a3774-a4c9-44d2-bcab-08719d22814b&subid2=METKA")</script>`;

const newsProfitFull =
`<script src="https://mixer-events.com/back.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    window.vitBack("https://mixer-events.com/new?utm_campaign=53978&utm_source=[SID]&sid7=METKA&utm_medium=4840", true);
});
</script>`;

bot.command("domonetka", (ctx) => {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "📋 LuckyFeed", callback_data: "domonetka_luckyfeed" },
                    { text: "📋 newsProfit", callback_data: "domonetka_newsprofit" }
                ]
            ]
        }
    };

    return ctx.reply(
        messages.domonetkaMessage,
        keyboard
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
            `📌 Код для newsProfit(OneProfit):\n\`\`\`\n${newsProfitFull}\n\`\`\``,
            { parse_mode: "Markdown" }
        );
    }
});

/* ------------------------ /phone_code ------------------------ */
let countryMap = {};
try {
    let data = fs.readFileSync(path.join(__dirname, 'data', 'countryPhoneCodes.json'), 'utf8');
    if (!data.trim().startsWith('[')) {
        data = '[' + data + ']';
    }

    const countries = JSON.parse(data);

    countryMap = {};
    countries.forEach(c => {
        if (c.iso && c.code) {
            countryMap[c.iso.toUpperCase()] = `+${c.code}`;
        }
    });

} catch (err) {
    console.error('Failed to load countryPhoneCodes.json:', err);
}

bot.command('phone_code', (ctx) => {
    const message = ctx.message.text;
    const parts = message.split(' ');

    if (parts.length < 2) {
        return ctx.reply(messages.phoneCodeMessage,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: {
                                    text: "/phone_code RU"
                                }
                            }
                        ]
                    ]
                }
            }
        );
    }

    const countryCode = parts[1].toUpperCase();
    const phoneCode = countryMap[countryCode];

    if (phoneCode) {
        ctx.reply(`✅ Код страны ${countryCode}: ${phoneCode}`);
    } else {
        ctx.reply(`❌ Страна с кодом "${countryCode}" не найдена.`);
    }
});

/* ------------------------ /bot_info ------------------------ */
bot.command('bot_info', (ctx) => {
    ctx.reply(messages.botInfoMessage);
});

/* ------------------------ DOCUMENT HANDLING ------------------------ */
bot.on('document', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];

    if (session && session.type === 'edit_order' && session.waitFile) {
        const fileName = ctx.message.document.file_name;
        if (!fileName.endsWith('.php')) return ctx.reply('Отправьте файл с расширением .php');

        try {
            const fileId = ctx.message.document.file_id;
            const url = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(url.href);
            const buffer = Buffer.from(await response.arrayBuffer());

            session.code = buffer.toString('utf8');
            session.waitFile = false;

            ctx.reply(
                "✅ Файл получен. Какие параметры вы хотите изменить?\n" +
                "Вы можете менять: $box, $land_id, $partner_name\n" +
                "Пример:\n" + 
                "$box=91, $land_id=123, $partner_name=PartnerName\n"
            );

        } catch (err) {
            console.error(err);
            ctx.reply('Ошибка при получении файла.');
        }
        return;
    }

    if (!session) {
        return ctx.reply('Сначала выберите команду /land, /preland или /prokla_land');
    }

    const caption = (ctx.message.caption || '').trim();

    if (session.type === 'landing' && session.waitParams) {
        if (!caption || !caption.includes('=')) {
            return ctx.reply(
                "Параметры не обнаружены. Прикрепите ZIP и укажите параметры, например:\n\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0"
            );
        }

        const params = {};
        caption.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k && v) params[k] = decodeURIComponent(v);
        });

        session.params = params;
        session.waitParams = false;
        ctx.reply('Параметры получены. Добавляю архив...');
    }

    if (session.type === 'prelanding' && session.waitPreParams) {
        if (!caption || !caption.includes('=')) {
            return ctx.reply(
                "Prelanding параметр не обнаружен. Прикрепите ZIP и укажите: key=value"
            );
        }

        const m = caption.match(/^\s*([^=]+)=([^&\s]+)\s*$/);
        if (!m) {
            return ctx.reply('Неверный формат prelanding. Используйте key=value');
        }

        session.prelandParam = { key: m[1], value: m[2] };
        session.waitPreParams = false;
        ctx.reply('Prelanding параметр получен. Добавляю архив...');
    }

    if (session.type === 'landing' && !session.params) {
        return ctx.reply('Не могу обработать архив — параметры ещё не заданы. Используйте /land с параметрами.');
    }

    if (session.type === 'prelanding' && !session.prelandParam) {
        return ctx.reply('Не могу обработать архив — prelanding параметр ещё не задан. Используйте /preland с параметром.');
    }

    try {
        const fileId = ctx.message.document.file_id;
        const fileName = ctx.message.document.file_name;

        session.archives.push({ fileId, fileName });

    } catch (err) {
        console.error('Error storing archive info:', err);
        ctx.reply('Ошибка при сохранении архива.');
    }
});

/* ------------------------ TEXT HANDLER ------------------------ */
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];

    if (session && session.type === 'edit_order' && !session.waitFile) {
        const text = ctx.message.text.trim();

        if (text.toLowerCase() === 'done') {
            if (!session.versions || session.versions.length === 0) 
                return ctx.reply('❌ Нет кода для сохранения. Сначала загрузите order.php');

            const latestCode = session.versions[session.versions.length - 1];
            const tmpFilePath = path.join(__dirname, `edited_order_${userId}.php`);
            fs.writeFileSync(tmpFilePath, latestCode, 'utf8');

            ctx.replyWithDocument({ source: tmpFilePath, filename: 'order.php' })
                .then(() => {
                    ctx.reply('✅ Редактирование завершено.');
                    if (fs.existsSync(tmpFilePath)) {
                        fs.unlinkSync(tmpFilePath);
                    }
                    delete userSessions[userId];
                })
                .catch(err => {
                    console.error(err);
                    ctx.reply('❌ Ошибка при отправке файла.');
                });
            return;
        }

        const changes = {};
        text.split(',').forEach(pair => {
            const [key, value] = pair.split('=').map(s => s.trim());
            if (key && value !== undefined) changes[key] = value.replace(/^['"]|['"]$/g, '');
        });

        if (!session.versions) session.versions = [];

        const baseCode = session.versions.length > 0 ? session.versions[session.versions.length - 1] : session.code;
        const newVersion = applyChangesToOrderPhp(baseCode, changes);

        session.versions.push(newVersion);

        ctx.reply(
            '✅ Изменения внесены и сохранены как новая версия.\n\n⚠️ ВАЖНО: нажмите кнопку для копирования команды или напишите "done"',
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "📋 Скопировать команду",
                                copy_text: { text: "done" }
                            }
                        ]
                    ]
                }
            }
        );
        return;
    }

    if (!session) return;

    const text = ctx.message.text.trim().toLowerCase();

    if (text === 'process') {
        if (!session.archives || session.archives.length === 0) {
            return ctx.reply('Нет архивов для обработки. Отправьте хотя бы один ZIP архив.');
        }

        session.processingMultiple = true;
        await ctx.reply(`⏳ Начинаю обработку ${session.archives.length} архива(ов)...`);

        const processedFiles = [];

        for (let i = 0; i < session.archives.length; i++) {
            const archive = session.archives[i];
            
            try {
                const resultFile = await processArchive(archive, session, userId, ctx);
                if (!resultFile || resultFile.skipped) {
                    await ctx.reply(`⚠️ Маркер "${session.marker}" не найден в файле ${archive.fileName}. Файл не обработан.`);
                    continue;
                }
                processedFiles.push(resultFile);

                await ctx.replyWithDocument({ 
                    source: resultFile.path, 
                    filename: resultFile.name 
                });

            } catch (err) {
                console.error(`Error processing archive ${archive.fileName}:`, err);
                if (err?.response?.description?.includes('file is too big')) {
                    await ctx.reply(`⚠️ Архив должен быть меньше 20 МБ`);
                } else {
                    await ctx.reply(`❌ Ошибка при обработке ${archive.fileName}: ${err.message}`);
                }
            }
        }

        processedFiles.forEach(file => {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        });

        if (processedFiles.length > 0) {
            await ctx.reply(`✅ Готово! Обработано ${processedFiles.length} из ${session.archives.length} архивов.`);
        } else {
            await ctx.reply(`❌ Обработка не выполнена.`);
        }

        delete userSessions[userId];
    }
});

/* ------------------------ ARCHIVE PROCESSING FUNCTION ------------------------ */
async function processArchive(archive, session, userId, ctx) {
    const { fileId, fileName } = archive;
    
    let tempDir = null;
    let localFile = null;

    try {
        const url = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(url.href);
        const buffer = Buffer.from(await response.arrayBuffer());

        localFile = path.join(__dirname, `temp_${userId}_${Date.now()}_${fileName}`);
        fs.writeFileSync(localFile, buffer);

        const zip = new AdmZip(localFile);
        tempDir = path.join(__dirname, `temp_${userId}_${Date.now()}`);
        fs.mkdirSync(tempDir);

        zip.extractAllTo(tempDir, true);

        const entries = zip.getEntries();
        if (!entries || entries.length === 0) throw new Error('ZIP пустой или некорректный');

        const rootFolders = [...new Set(entries.map(e => e.entryName.split('/')[0]))];
        let rootPath;
        let rootFolder;

        if (rootFolders.length === 1) {
            rootFolder = rootFolders[0];
            rootPath = path.join(tempDir, rootFolder);

            if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
                rootPath = tempDir;
                rootFolder = '';
            }
        } else {
            rootPath = tempDir;
            rootFolder = '';
        }


        ['order.php', 'form-scripts.js'].forEach(f => {
            const p = path.join(rootPath, f);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });

        if (session.type === 'landing' || session.type === 'prokla_land' || session.type === 'land_form') {
            handleOrderAndScripts(session, rootPath);
        }

        const allFiles = fs.readdirSync(rootPath);
        for (const file of allFiles) {
            const filePath = path.join(rootPath, file);

            if (file.endsWith('index.html') || file.endsWith('.htm') || file.endsWith('index.php')) {
                let html = fs.readFileSync(filePath, 'utf8');

                if (['landing', 'prelanding', 'prokla_land', 'land_to_preland', 'land_form'].includes(session.type)) {
                    html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<!DOCTYPE html>)/i, '');
                    html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<html>)/i, '');
                    html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<html\b[^>]*>)/i, '');
                    html = html.replace(/<!--\s*<\?php[\s\S]*?\?>\s*-->/gi, '');

                    const doctypeIndex = html.search(/<!DOCTYPE\s+html/i);
                    if (doctypeIndex > 0) {
                        html = html.substring(doctypeIndex);
                    } else {
                        const htmlMatch = html.match(/(?:^|>)\s*(<html[\s>])/i);
                        if (htmlMatch && htmlMatch.index !== undefined) {
                            const htmlIndex = html.indexOf(htmlMatch[1], htmlMatch.index);
                            if (htmlIndex > 0) {
                                html = html.substring(htmlIndex);
                            }
                        }
                    }
                    
                    const p = session.params || {};
                    const funnelNames = [
                        'Nearest Edge', 'Paragonix Edge', 'Pantera Edge', 'Ethereon Edge',
                        'Nearest Finance', 'Atom Capital', 'Nearest Earn', 'Eclipse Earn',
                        'Paragonix Earn', 'Equinox Earn', 'Iron Earn', 'Arcane Trade',
                        'EdgeVaultra', 'SBI Earn', 'ParagonixPrimeX', 'NetherexPro',
                        'Pantera Earn', 'San Miguel Corporation', 'Finesse Serendipidade',
                        'ShaddersAgent', 'FortuixAgent', 'SecuroomAi', 'MonitrexPRO',
                        'AffinexisAgent', 'NethertoxAGENT', 'FinovexPro', 'PrimeAura',
                        'SpectraX', 'SpectraX Bot', 'BlockJet', 'NovusX', 'Blizzetrix',
                        'Coinsterix', 'PrimeAurora', 'Fluxorium Corporation'
                    ];

                    if (p.funnel) {
                        const sortedNames = [...funnelNames].sort((a, b) => b.length - a.length);
                        const pattern = new RegExp(
                            sortedNames
                                .map(name =>
                                    `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
                                )
                                .join('|'),
                            'gi'
                        );

                        html = html.replace(pattern, p.funnel);
                    }
                }

                const $ = cheerio.load(html, { decodeEntities: false });
                
                /* ------------------------ LAND ------------------------ */
                if (session.type === 'landing') {
                    $('meta[name="msapplication"]').each((i, el) => {
                        const content = $(el).attr('content') || '';
                        if (/^0x[0-9A-Za-z]*$/.test(content)) {
                            $(el).remove();
                        }
                    });

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css') ||
                            href.includes('tel.css')
                        ) {
                            $(el).remove();
                        }
                    });
                    $('link[data-type="F1TFunnelSdkCss"]').remove();
                    $('style').each((i, el) => {
                        const styleContent = $(el).html() || '';
                        if (styleContent.includes('.rf-form__loader')) {
                            $(el).remove();
                        }
                    });

                    $('style').each(function() {
                        const styleContent = $(this).html();
                        if (styleContent.includes('input.failed-input') || styleContent.includes('.input_error')) {
                            $(this).remove();
                        }
                    });

                    $('html').removeAttr('data-scrapbook-source');
                    $('html').removeAttr('data-scrapbook-create');
                    $('html').removeAttr('data-scrapbook-title');

                    $('*').contents().each(function () {
                        if (this.nodeType === 8) {
                            const text = this.nodeValue;

                            if (text && text.toLowerCase().includes('<script')) {
                                $(this).remove();
                            }
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');
                        
                        if (html.includes('.main-chat')) return;
                        if (html.includes('#chatbox')) return;

                        if (html.includes('updateTimer') && html.includes('countdown(')) {
                            return;
                        }

                        const isScrollAndLinkFixScript = (
                            html.includes('link.href = link.href.replace(\'https:///\',') &&
                            html.includes('maxScroll') &&
                            html.includes('window.addEventListener("scroll"')
                        );
                        
                        if (isScrollAndLinkFixScript) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('on("submit", \'form\'') ||
                            html.includes('on("submit", "form"') ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form') ||
                            html.includes('_signup_form') ||
                            html.includes('querySelectorAll("a")') ||
                            html.includes('scrollIntoView') ||
                            html.includes('submit-btn') ||
                            html.includes('.Hear-from-You-Form') ||
                            html.includes('patternSubid') ||
                            html.includes('cleanedPad') ||
                            html.includes('.subid') ||
                            html.includes('.pad') ||
                            html.includes('uwt.js') ||
                            html.includes('window.aioBus') ||
                            html.includes('.iti--allow-dropdown.iti--separate-dial-code') ||
                            html.includes("'first_name', 'last_name'") ||
                            html.includes('"first_name", "last_name"') || 
                            html.includes('getCookie(') ||
                            html.includes('setCookie(') ||
                            html.includes('showDuplicatePopup') ||
                            html.includes('disableSubmit') ||
                            html.includes('rf-form__loader') ||
                            html.includes('input[type="email"]') ||
                            html.includes('input[name="email"]') ||
                            html.includes('input[name="phone"]') ||
                            html.includes('user_phone_recent') ||
                            html.includes('user_phone_in_progress') ||
                            html.includes('user_email_recent') ||
                            html.includes('getTemplate(') ||
                            html.includes('duplicate-email-popup') ||
                            html.includes('closePopup()') ||
                            html.includes('$("body").on("submit"') ||
                            html.includes("$('body').on('submit'") ||
                            html.includes("$( \"body\" ).on( \"submit\"") ||
                            html.includes("$( 'body' ).on( 'submit'") ||
                            html.includes('$(document).on("submit"') ||
                            html.includes("$(document).on('submit'") ||
                            html.includes("$('a').click(function") ||
                            html.includes('$("a").click(function') ||
                            html.includes('[name=name]') ||
                            html.includes('[name=phone]') ||
                            html.includes("'[name=phone]'") ||
                            html.includes('"[name=phone]"') ||
                            html.includes('Order is not accepted') ||
                            html.includes('You was ordering') ||
                            html.includes('recently_confirmed') ||
                            html.includes('in_progress') ||
                            html.includes('duplicate_order_phone') ||
                            html.includes('order_in_progress') ||
                            html.includes('order_recently_confirmed') ||
                            html.includes('.offset().top') ||
                            html.includes('.animate({scrollTop:') ||
                            html.includes('input[type=submit]')
                        ) {
                            $el.remove();
                            return;
                        }

                        const isFbPixelInline = html.includes('fbq(');
                        if (isFbPixelInline) {
                            $el.remove();
                            return;
                        }

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'utils.min.js',
                            'jquery-3.7.1.min.js',
                            'bean-script.js',
                            'messages_es.min.js',
                            'messages_fr.min.js',
                            'functions.js',
                            'intl-tel-input/17.0.8/js/utils.min.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.js',
                            'intlTelInput.min.js',
                            'jquery-migration-3.7.1.min.js',
                            'lib.js',
                            'plgintlTel',
                            'validation.js',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            '/aio-static/sdk/',
                            '/_cdn/production/landing-cdn/',
                            'time-scripts/main.js',
                            'bundle.umd.min.js',
                            './index/track.js',
                            'loader.js',
                            'i18n.min.js',
                            'form.js',
                            'validator.js',
                            'axios.min.js',
                            'app.js',
                            'jquery.maskedinput.min.js',
                            'polyfill.min.js',
                            'handlers.js'
                        ];

                        if (removeFiles.some(f => src.includes(f))) {
                            $el.remove();
                            return;
                        }

                        if (src === 'scripts.js') {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('code.jquery.com/jquery') ||
                            src.includes('ajax.googleapis.com/ajax/libs/jquery') ||
                            src.includes('cdnjs.cloudflare.com/ajax/libs/jquery') ||
                            src.includes('jquery.min.js') ||
                            src.includes('jquery.js') ||
                            src.includes('jquery-1.11.1.min.js')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('googletagmanager.com') ||
                            src.includes('gtag/js') ||
                            html.includes('gtag(') ||
                            html.includes('dataLayer') ||
                            html.includes('GoogleAnalyticsObject') ||
                            html.includes('GTM-') ||
                            html.includes('googletagmanager.com/gtag/js') ||
                            html.includes('googletagmanager.com')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('mc.yandex.ru') ||
                            src.includes('yandex.ru/metrika') ||
                            html.includes('Ya.Metrika') ||
                            html.includes('ym(') ||
                            html.includes('yandex_metrika_callbacks') ||
                            html.includes('metrika') ||
                            html.includes('yandex')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('intlTelInput') ||
                            html.includes('window.intlTelInput') ||
                            html.includes('separateDialCode') ||
                            html.includes('initialCountry') ||
                            html.includes('utilsScript')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('(function(c,l,a,r,i,t,y)') ||
                            html.includes('clarity') ||
                            html.includes('clarity("set"')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('minfobiz.online')) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
                            $el.remove();
                            return;
                        }

                        if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html)) {
                            $el.remove();
                            return;
                        }

                        if (/(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html)) {
                            $el.remove();
                            return;
                        }

                        const removeInlinePatterns = [
                            'ipapi.co',
                            '_d',
                            '_chk',
                            '_t',
                            'vid'
                        ];

                        if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.aioBus') && html.includes('aio.landing')) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.includes('googletag.cmd.push')) {
                            $el.remove();
                            return;
                        }

                        const removeClickHandlerScript = /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html);
                        if (removeClickHandlerScript) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
                            $el.remove();
                            return;
                        }

                        if ($el.attr('data-cf-beacon')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.F1TFunnelsSdkConfig')) {
                            $el.remove();
                            return;
                        }

                        const removeScreenResizeScript = /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html);
                        if (removeScreenResizeScript) {
                            $el.remove();
                            return;
                        }

                        const isDateScript =
                            html.includes('Date') ||
                            html.includes('getDate') ||
                            html.includes('getMonth') ||
                            html.includes('getFullYear') ||
                            html.match(/\bday\b/i) ||
                            html.match(/\bmonth\b/i) ||
                            html.match(/\byear\b/i);

                        if (isDateScript) {
                            return;
                        }
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();
                    $('body .rf-form__loader1.js-rf-loader1').remove();

                    $('form').each((i, form) => {
                        const $form = $(form);

                        $form.find('input[type="submit"][disabled]').removeAttr('disabled');
                        $form.find('button[disabled]').removeAttr('disabled');
                        $form.find('div.form-preloader.hidden').remove();
                        $form.find('span#error').remove();
                        $form.removeAttr('novalidate');
                        $form.find('.valid-msg').remove();
                        $form.find('.error-msg').remove();
                        $form.find('.error-text').remove();
                        $form.find('div.input_error[data-for-error="phone"]').remove();

                        const requiredFields = ['first_name', 'last_name', 'email', 'phone'];
                        const hasAllFields = requiredFields.every(name => $form.find(`input[name="${name}"]`).length > 0);

                        if (hasAllFields) {
                            $form.find('button').each(function () {
                                const $btn = $(this);
                                if (!$btn.attr('type')) {
                                    $btn.attr('type', 'submit');
                                }
                            });
                        }

                        $form.find('.iti').each(function () {
                            const $iti = $(this);

                            const $visibleInputs = $iti.find('input:not([type="hidden"])');
                            $visibleInputs.each(function () {
                                $(this).insertBefore($iti);
                            });

                            $iti.remove();
                        });

                        var isSearchForm =
                            ($form.find('input[type="text"], input[type="search"]').length === 1) &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length;

                        var isLoginForm =
                            $form.find('input[type="email"]').length === 1 &&
                            $form.find('input[type="password"]').length === 1;

                        var isNewsletterForm =
                            $form.is('[data-type="subscription"]') ||
                            $form.find('input[type="email"]').length === 1 &&
                            $form.find('input[type="submit"], button[type="submit"]').length === 1 &&
                            $form.find('input').length === 2;
                        
                        var isNewsletterForm2 =
                            $form.is('[data-type="subscription"]') ||
                            $form.attr('id')?.startsWith('sib-form') ||
                            $form.find('.sib-form-block, .sib-input').length > 0;

                        if (isSearchForm || isLoginForm || isNewsletterForm || isNewsletterForm2) {
                            $form.find('input[type="hidden"]').remove();

                            if ($form.attr('action') === "order.php") {
                                $form.attr('action', "");
                            }
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }

                        if (
                            $form.find('input[type="text"]').length === 1 &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length
                        ) {
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }

                        if ($form.hasClass('no-modify') || $form.closest('.newsletter-wrapper').length) {
                            return;
                        }

                        if ($form.find('input[type="search"]').length > 0) {
                            return;
                        }

                        if (
                            $form.find('input[type="text"]').length === 1 ||
                            $form.find('textarea').length === 1 ||
                            $form.find('input[type="checkbox"]').length > 1
                        ) {
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }

                        if (!$form.attr('action') || $form.attr('action').trim() === '') {
                            $form.attr('action', 'order.php');
                        }

                        const action1 = $form.attr('action') ? $form.attr('action').trim() : '';
                        if (!action1 || action1 !== 'order.php') {
                            $form.attr('action', 'order.php');
                        }

                        if (!$form.attr('method') || $form.attr('method').toUpperCase() !== 'POST') {
                            $form.attr('method', 'POST');
                        }

                        if (!$form.attr('id') || $form.attr('id') !== 'form') {
                            $form.attr('id', 'form');
                        }

                        $form.attr('style', 'position: relative; z-index: 1;');

                        $form.removeAttr('onsubmit');
                        $form.find('input[type="submit"]#ds').removeAttr('id');
                        $form.find('.flag-container').remove();
                        $form.find('input[name="areaCode"]').remove();

                        $form.find('input[type="hidden"]').remove();

                        const sub1 = `<input type="hidden" name="sub1" value="{subid}">`;
                        const ip   = `<input type="hidden" name="ip" value="{ip}">`;
                        const pc   = `<input type="hidden" name="pc" value="<?=$_GET['scroll'];?>">`;
                        const loaderDiv = `<div class="rf-form__loader js-rf-loader" style="display: none;"></div>`;

                        $form.prepend(`\n\n${sub1}\n${ip}\n${pc}\n\n${loaderDiv}`);

                        $form.find('input:not([type="hidden"])').each((j, input) => {
                            const $input = $(input);

                            let name = $input.attr('name') || '';
                            let id = $input.attr('id') || '';

                            const firstNameVariants = [
                                'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', 'form-first_name', 'name'
                            ];

                            if (firstNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'first_name');
                                name = 'first_name';
                                
                                $input.attr('id', 'first_name');
                                
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const lastNameVariants = [
                                'lastName', 'lastname', 'lname', 'surname', 'secondname', 'fio', 'last_name', 'l_name', '1-last_name', 'form-last_name', 'last'
                            ];

                            if (lastNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'last_name');
                                name = 'last_name';
                                
                                $input.attr('id', 'last_name');

                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const emailVariants = [
                                '1-email', 'form-email', 'email', 'solrka'
                            ];

                            if (emailVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'email');
                                name = 'email';

                                $input.attr('id', 'email');

                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const phoneVariants = [
                                'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number', 'phone1', 'search2'
                            ];

                            if (phoneVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'phone');
                                name = 'phone';
                                $input.attr('id', 'phone');

                                $input.attr('type', 'tel');

                                $input.removeAttr('title');
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            if ($input.attr('type') !== 'submit' && !$input.attr('data-validation-status')) {
                                $input.attr('data-validation-status', 'inactive');
                            }

                            $input.nextAll('.input_error').remove();

                            let errorText = '';
                            switch ($input.attr('name')) {
                                case 'first_name':
                                    errorText = 'Your first name is too short (at least 2 characters)';
                                    break;
                                case 'last_name':
                                    errorText = 'Your last name is too short (at least 2 characters)';
                                    break;
                                case 'email':
                                    errorText = 'Please enter your real email address (example@email.com)';
                                    break;
                                case 'phone':
                                    errorText = 'Please enter a valid phone number';
                                    break;
                            }

                            if (errorText) {
                                const errorDiv = $(
                                    `<div class="input_error" data-for-error="${$input.attr('name')}" data-error-status="inactive">${errorText}</div>`
                                );
                                $input.after('\n', errorDiv);
                            }
                        });
                    });

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const $el = $(el);
                        const href = $el.attr('href');
                        if (href && href.includes('intlTelInput.css')) {
                            if (!href.startsWith('http')) {
                                const fileToDelete = path.resolve(rootPath, href);
                                if (fs.existsSync(fileToDelete)) {
                                    fs.unlinkSync(fileToDelete);
                                }
                            }
                            $el.remove();
                        }
                    });

                    const directoryPath = rootPath;
                    fs.readdirSync(directoryPath).forEach(file => {
                        if (/^lead_.*\.txt$/.test(file)) {
                            const fileToDelete = path.join(directoryPath, file);
                            fs.unlinkSync(fileToDelete);
                        }
                    });

                    const ASSETS_DIR = path.join(__dirname, 'assets');
                    if (fs.existsSync(ASSETS_DIR)) {
                        const assetFiles = fs.readdirSync(ASSETS_DIR);
                        assetFiles.forEach(file => {
                            const src = path.join(ASSETS_DIR, file);
                            const dest = path.join(rootPath, file);
                            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                        });
                    }

                    const landingHead = require('./scripts/landing-head');
                    if ($('head').length) {
                        $('head').prepend(landingHead);
                    } else {
                        html = landingHead + html;
                    }

                    $('body').append(`\n<script src="intlTelInput.min.js"></script>`);
                    $('body').append(`\n<script src="form-scripts.js"></script>\n\n`);

                    $('body').find('[target]').each(function () {
                        $(this).attr('target', '');
                    });

                    $('body').find('[onclick]').each(function () {
                        $(this).attr('onclick', '');
                    });

                    $('body [href]').each((i, el) => {
                        const $el = $(el);
                        
                        if ($el.is('use') && $el.closest('svg').length) {
                            return;
                        }

                        const href = $el.attr('href') || '';
                        if (
                            href === '{offer}' ||
                            href === '#' ||
                            href === '/' ||
                            href.startsWith('http') ||
                            href.startsWith('/') ||
                            href.startsWith('#')
                        ) {
                            $el.attr('href', '');
                        }
                    });

                    $('body meta, body title, body link[rel="stylesheet"], body style[type="text/css"]').each(function() {
                        $('head').append('\n', this);
                    });

                    $('body link[rel*="icon"]').each(function() {
                        $(this).appendTo('head');
                    });

                    fs.writeFileSync(filePath, $.html());
                }

                /* ------------------------ PRELANDING ------------------------ */
                if (session.type === 'prelanding') {
                    const prelandScriptPath = path.join(__dirname, 'scripts', 'preland-script.js');
                    const scriptContent = fs.readFileSync(prelandScriptPath, 'utf8');

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css') ||
                            href.includes('tel.css')
                        ) {
                            $(el).remove();
                        }
                    });
                    $('style').each((i, el) => {
                        const styleContent = $(el).html() || '';
                        if (styleContent.includes('.rf-form__loader')) {
                            $(el).remove();
                        }
                    });

                    $('meta[name="msapplication"]').each((i, el) => {
                        const content = $(el).attr('content') || '';
                        if (/^0x[0-9A-Za-z]*$/.test(content)) {
                            $(el).remove();
                        }
                    });

                    $('html').removeAttr('data-scrapbook-source');
                    $('html').removeAttr('data-scrapbook-create');
                    $('html').removeAttr('data-scrapbook-title');

                    $('*').contents().each(function () {
                        if (this.nodeType === 8) {
                            const text = this.nodeValue;

                            if (text && text.toLowerCase().includes('<script')) {
                                $(this).remove();
                            }
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');
                        
                        if (html.includes('.main-chat')) return;
                        if (html.includes('#chatbox')) return;

                        if (html.includes('updateTimer') && html.includes('countdown(')) {
                            return;
                        }

                        const isScrollAndLinkFixScript = (
                            html.includes('link.href = link.href.replace(\'https:///\',') &&
                            html.includes('maxScroll') &&
                            html.includes('window.addEventListener("scroll"')
                        );
                        
                        if (isScrollAndLinkFixScript) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('on("submit", \'form\'') ||
                            html.includes('on("submit", "form"') ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form') ||
                            html.includes('_signup_form') ||
                            html.includes('querySelectorAll("a")') ||
                            html.includes('scrollIntoView') ||
                            html.includes('submit-btn') ||
                            html.includes('.Hear-from-You-Form') ||
                            html.includes('patternSubid') ||
                            html.includes('cleanedPad') ||
                            html.includes('.subid') ||
                            html.includes('.pad') ||
                            html.includes('uwt.js') ||
                            html.includes('window.aioBus') ||
                            html.includes('.iti--allow-dropdown.iti--separate-dial-code') ||
                            html.includes("'first_name', 'last_name'") ||
                            html.includes('"first_name", "last_name"') || 
                            html.includes('getCookie(') ||
                            html.includes('setCookie(') ||
                            html.includes('showDuplicatePopup') ||
                            html.includes('disableSubmit') ||
                            html.includes('rf-form__loader') ||
                            html.includes('input[type="email"]') ||
                            html.includes('input[name="email"]') ||
                            html.includes('input[name="phone"]') ||
                            html.includes('user_phone_recent') ||
                            html.includes('user_phone_in_progress') ||
                            html.includes('user_email_recent') ||
                            html.includes('getTemplate(') ||
                            html.includes('duplicate-email-popup') ||
                            html.includes('closePopup()') ||
                            html.includes('$("body").on("submit"') ||
                            html.includes("$('body').on('submit'") ||
                            html.includes("$( \"body\" ).on( \"submit\"") ||
                            html.includes("$( 'body' ).on( 'submit'") ||
                            html.includes('$(document).on("submit"') ||
                            html.includes("$(document).on('submit'") ||
                            html.includes("$('a').click(function") ||
                            html.includes('$("a").click(function') ||
                            html.includes('[name=name]') ||
                            html.includes('[name=phone]') ||
                            html.includes("'[name=phone]'") ||
                            html.includes('"[name=phone]"') ||
                            html.includes('Order is not accepted') ||
                            html.includes('You was ordering') ||
                            html.includes('recently_confirmed') ||
                            html.includes('in_progress') ||
                            html.includes('duplicate_order_phone') ||
                            html.includes('order_in_progress') ||
                            html.includes('order_recently_confirmed') ||
                            html.includes('.offset().top') ||
                            html.includes('.animate({scrollTop:') ||
                            html.includes('input[type=submit]')
                        ) {
                            $el.remove();
                            return;
                        }

                        const isFbPixelInline = html.includes('fbq(');
                        if (isFbPixelInline) {
                            $el.remove();
                            return;
                        }

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'utils.min.js',
                            'jquery-3.7.1.min.js',
                            'bean-script.js',
                            'messages_es.min.js',
                            'messages_fr.min.js',
                            'functions.js',
                            'intl-tel-input/17.0.8/js/utils.min.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.js',
                            'intlTelInput.min.js',
                            'jquery-migration-3.7.1.min.js',
                            'lib.js',
                            'plgintlTel',
                            'validation.js',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            '/aio-static/sdk/',
                            '/_cdn/production/landing-cdn/',
                            'time-scripts/main.js',
                            'bundle.umd.min.js',
                            './index/track.js',
                            'loader.js',
                            'i18n.min.js',
                            'form.js',
                            'validator.js',
                            'axios.min.js',
                            'app.js',
                            'jquery.maskedinput.min.js',
                            'polyfill.min.js',
                            'handlers.js'
                        ];

                        if (removeFiles.some(f => src.includes(f))) {
                            $el.remove();
                            return;
                        }

                        if (src === 'scripts.js') {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('code.jquery.com/jquery') ||
                            src.includes('ajax.googleapis.com/ajax/libs/jquery') ||
                            src.includes('cdnjs.cloudflare.com/ajax/libs/jquery') ||
                            src.includes('jquery.min.js') ||
                            src.includes('jquery.js') ||
                            src.includes('jquery-1.11.1.min.js')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('googletagmanager.com') ||
                            src.includes('gtag/js') ||
                            html.includes('gtag(') ||
                            html.includes('dataLayer') ||
                            html.includes('GoogleAnalyticsObject') ||
                            html.includes('GTM-') ||
                            html.includes('googletagmanager.com/gtag/js') ||
                            html.includes('googletagmanager.com')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('mc.yandex.ru') ||
                            src.includes('yandex.ru/metrika') ||
                            html.includes('Ya.Metrika') ||
                            html.includes('ym(') ||
                            html.includes('yandex_metrika_callbacks') ||
                            html.includes('metrika') ||
                            html.includes('yandex')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('intlTelInput') ||
                            html.includes('window.intlTelInput') ||
                            html.includes('separateDialCode') ||
                            html.includes('initialCountry') ||
                            html.includes('utilsScript')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('(function(c,l,a,r,i,t,y)') ||
                            html.includes('clarity') ||
                            html.includes('clarity("set"')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('minfobiz.online')) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
                            $el.remove();
                            return;
                        }

                        if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html)) {
                            $el.remove();
                            return;
                        }

                        if (/(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html)) {
                            $el.remove();
                            return;
                        }

                        const removeInlinePatterns = [
                            'ipapi.co',
                            '_d',
                            '_chk',
                            '_t',
                            'vid'
                        ];

                        if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.aioBus') && html.includes('aio.landing')) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.includes('googletag.cmd.push')) {
                            $el.remove();
                            return;
                        }

                        const removeClickHandlerScript = /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html);
                        if (removeClickHandlerScript) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
                            $el.remove();
                            return;
                        }

                        if ($el.attr('data-cf-beacon')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.F1TFunnelsSdkConfig')) {
                            $el.remove();
                            return;
                        }

                        const removeScreenResizeScript = /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html);
                        if (removeScreenResizeScript) {
                            $el.remove();
                            return;
                        }

                        const isDateScript =
                            html.includes('Date') ||
                            html.includes('getDate') ||
                            html.includes('getMonth') ||
                            html.includes('getFullYear') ||
                            html.match(/\bday\b/i) ||
                            html.match(/\bmonth\b/i) ||
                            html.match(/\byear\b/i);

                        if (isDateScript) {
                            return;
                        }
                    });

                    $('form').each((i, el) => {
                        $(el).attr('action', '');
                    });

                    $('noscript').remove();

                    $('body').find('[target]').each(function () {
                        $(this).attr('target', '');
                    });

                    $('body').find('[onclick]').each(function () {
                        $(this).attr('onclick', '');
                    });

                    $('body a').each((i, el) => {
                        $(el).attr('href', '{offer}');
                    });

                    $('head, body').contents().filter((i, node) => node.type === 'comment').remove();

                    const inlineScript = `<script>\n${scriptContent}\n</script>\n\n`;
                    $('body').append(inlineScript);

                    const migrationScript = `<script src="../jquery-migration-3.7.1.min.js"></script>\n`;
                    if ($('head').length) {
                        $('head').append(migrationScript);
                    } else {
                        $('html').prepend(migrationScript);
                    }

                    let finalHtml = $.html();

                    const { key, value } = session.prelandParam || {};
                    if (key && value && !(key === '0' && value === '0')) {
                        const phpCode =
                            `<?php if ($_GET["${key}"] != "${value}") { echo '<script>window.location.replace("https://www.google.com/");document.location.href="https://www.google.com/";</script>'; exit; } ?>\n\n`;

                        if (finalHtml.includes('<!DOCTYPE')) {
                            finalHtml = finalHtml.replace('<!DOCTYPE', phpCode + '<!DOCTYPE');
                        } else {
                            finalHtml = phpCode + finalHtml;
                        }
                    }


                    fs.writeFileSync(filePath, finalHtml, 'utf8');
                }
                
                /* ------------------------ PROKLA-LANDING ------------------------ */
                if (session.type === 'prokla_land') {
                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css') ||
                            href.includes('tel.css')
                        ) {
                            $(el).remove();
                        }
                    });
                    
                    $('style').each((i, el) => {
                        const styleContent = $(el).html() || '';
                        if (styleContent.includes('.rf-form__loader')) {
                            $(el).remove();
                        }
                    });

                    $('style').each(function() {
                        const styleContent = $(this).html();
                        if (styleContent.includes('input.failed-input') || styleContent.includes('.input_error')) {
                            $(this).remove();
                        }
                    });

                    $('meta[name="msapplication"]').each((i, el) => {
                        const content = $(el).attr('content') || '';
                        if (/^0x[0-9A-Za-z]*$/.test(content)) {
                            $(el).remove();
                        }
                    });

                    $('html').removeAttr('data-scrapbook-source');
                    $('html').removeAttr('data-scrapbook-create');
                    $('html').removeAttr('data-scrapbook-title');

                    $('*').contents().each(function () {
                        if (this.nodeType === 8) {
                            const text = this.nodeValue;

                            if (text && text.toLowerCase().includes('<script')) {
                                $(this).remove();
                            }
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');
                        
                        if (html.includes('.main-chat')) return;
                        if (html.includes('#chatbox')) return;

                        if (html.includes('updateTimer') && html.includes('countdown(')) {
                            return;
                        }

                        const isScrollAndLinkFixScript = (
                            html.includes('link.href = link.href.replace(\'https:///\',') &&
                            html.includes('maxScroll') &&
                            html.includes('window.addEventListener("scroll"')
                        );
                        
                        if (isScrollAndLinkFixScript) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('on("submit", \'form\'') ||
                            html.includes('on("submit", "form"') ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form') ||
                            html.includes('_signup_form') ||
                            html.includes('querySelectorAll("a")') ||
                            html.includes('scrollIntoView') ||
                            html.includes('submit-btn') ||
                            html.includes('.Hear-from-You-Form') ||
                            html.includes('patternSubid') ||
                            html.includes('cleanedPad') ||
                            html.includes('.subid') ||
                            html.includes('.pad') ||
                            html.includes('uwt.js') ||
                            html.includes('window.aioBus') ||
                            html.includes('.iti--allow-dropdown.iti--separate-dial-code') ||
                            html.includes("'first_name', 'last_name'") ||
                            html.includes('"first_name", "last_name"') || 
                            html.includes('getCookie(') ||
                            html.includes('setCookie(') ||
                            html.includes('showDuplicatePopup') ||
                            html.includes('disableSubmit') ||
                            html.includes('rf-form__loader') ||
                            html.includes('input[type="email"]') ||
                            html.includes('input[name="email"]') ||
                            html.includes('input[name="phone"]') ||
                            html.includes('user_phone_recent') ||
                            html.includes('user_phone_in_progress') ||
                            html.includes('user_email_recent') ||
                            html.includes('getTemplate(') ||
                            html.includes('duplicate-email-popup') ||
                            html.includes('closePopup()') ||
                            html.includes('$("body").on("submit"') ||
                            html.includes("$('body').on('submit'") ||
                            html.includes("$( \"body\" ).on( \"submit\"") ||
                            html.includes("$( 'body' ).on( 'submit'") ||
                            html.includes('$(document).on("submit"') ||
                            html.includes("$(document).on('submit'") ||
                            html.includes("$('a').click(function") ||
                            html.includes('$("a").click(function') ||
                            html.includes('[name=name]') ||
                            html.includes('[name=phone]') ||
                            html.includes("'[name=phone]'") ||
                            html.includes('"[name=phone]"') ||
                            html.includes('Order is not accepted') ||
                            html.includes('You was ordering') ||
                            html.includes('recently_confirmed') ||
                            html.includes('in_progress') ||
                            html.includes('duplicate_order_phone') ||
                            html.includes('order_in_progress') ||
                            html.includes('order_recently_confirmed') ||
                            html.includes('.offset().top') ||
                            html.includes('.animate({scrollTop:') ||
                            html.includes('input[type=submit]')
                        ) {
                            $el.remove();
                            return;
                        }

                        const isFbPixelInline = html.includes('fbq(');
                        if (isFbPixelInline) {
                            $el.remove();
                            return;
                        }

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'utils.min.js',
                            'jquery-3.7.1.min.js',
                            'bean-script.js',
                            'messages_es.min.js',
                            'messages_fr.min.js',
                            'functions.js',
                            'intl-tel-input/17.0.8/js/utils.min.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.js',
                            'intlTelInput.min.js',
                            'jquery-migration-3.7.1.min.js',
                            'lib.js',
                            'plgintlTel',
                            'validation.js',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            '/aio-static/sdk/',
                            '/_cdn/production/landing-cdn/',
                            'time-scripts/main.js',
                            'bundle.umd.min.js',
                            './index/track.js',
                            'loader.js',
                            'i18n.min.js',
                            'form.js',
                            'validator.js',
                            'axios.min.js',
                            'app.js',
                            'jquery.maskedinput.min.js',
                            'polyfill.min.js',
                            'handlers.js'
                        ];

                        if (removeFiles.some(f => src.includes(f))) {
                            $el.remove();
                            return;
                        }

                        if (src === 'scripts.js') {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('code.jquery.com/jquery') ||
                            src.includes('ajax.googleapis.com/ajax/libs/jquery') ||
                            src.includes('cdnjs.cloudflare.com/ajax/libs/jquery') ||
                            src.includes('jquery.min.js') ||
                            src.includes('jquery.js') ||
                            src.includes('jquery-1.11.1.min.js')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('googletagmanager.com') ||
                            src.includes('gtag/js') ||
                            html.includes('gtag(') ||
                            html.includes('dataLayer') ||
                            html.includes('GoogleAnalyticsObject') ||
                            html.includes('GTM-') ||
                            html.includes('googletagmanager.com/gtag/js') ||
                            html.includes('googletagmanager.com')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('querySelectorAll(\'a[href*="')) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('mc.yandex.ru') ||
                            src.includes('yandex.ru/metrika') ||
                            html.includes('Ya.Metrika') ||
                            html.includes('ym(') ||
                            html.includes('yandex_metrika_callbacks') ||
                            html.includes('metrika') ||
                            html.includes('yandex')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('intlTelInput') ||
                            html.includes('window.intlTelInput') ||
                            html.includes('separateDialCode') ||
                            html.includes('initialCountry') ||
                            html.includes('utilsScript')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('(function(c,l,a,r,i,t,y)') ||
                            html.includes('clarity') ||
                            html.includes('clarity("set"')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('minfobiz.online')) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
                            $el.remove();
                            return;
                        }

                        if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html)) {
                            $el.remove();
                            return;
                        }

                        if (/(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html)) {
                            $el.remove();
                            return;
                        }

                        const removeInlinePatterns = [
                            'ipapi.co',
                            '_d',
                            '_chk',
                            '_t',
                            'vid'
                        ];

                        if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.aioBus') && html.includes('aio.landing')) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.includes('googletag.cmd.push')) {
                            $el.remove();
                            return;
                        }

                        const removeClickHandlerScript = /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html);
                        if (removeClickHandlerScript) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
                            $el.remove();
                            return;
                        }

                        if ($el.attr('data-cf-beacon')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.F1TFunnelsSdkConfig')) {
                            $el.remove();
                            return;
                        }

                        const removeScreenResizeScript = /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html);
                        if (removeScreenResizeScript) {
                            $el.remove();
                            return;
                        }

                        const isDateScript =
                            html.includes('Date') ||
                            html.includes('getDate') ||
                            html.includes('getMonth') ||
                            html.includes('getFullYear') ||
                            html.match(/\bday\b/i) ||
                            html.match(/\bmonth\b/i) ||
                            html.match(/\byear\b/i);

                        if (isDateScript) {
                            return;
                        }
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();
                    $('body .rf-form__loader1.js-rf-loader1').remove();

                    $('form').each((i, form) => {
                        const $form = $(form);

                        $form.find('input[type="submit"][disabled]').removeAttr('disabled');
                        $form.find('button[disabled]').removeAttr('disabled');
                        $form.find('div.form-preloader.hidden').remove();
                        $form.find('span#error').remove();
                        $form.removeAttr('novalidate');
                        $form.find('.valid-msg').remove();
                        $form.find('.error-msg').remove();
                        $form.find('.error-text').remove();
                        $form.find('div.input_error[data-for-error="phone"]').remove();

                        const requiredFields = ['first_name', 'last_name', 'email', 'phone'];
                        const hasAllFields = requiredFields.every(name => $form.find(`input[name="${name}"]`).length > 0);

                        if (hasAllFields) {
                            $form.find('button').each(function () {
                                const $btn = $(this);
                                if (!$btn.attr('type')) {
                                    $btn.attr('type', 'submit');
                                }
                            });
                        }

                        $form.find('.iti').each(function () {
                            const $iti = $(this);

                            const $visibleInputs = $iti.find('input:not([type="hidden"])');
                            $visibleInputs.each(function () {
                                $(this).insertBefore($iti);
                            });

                            $iti.remove();
                        });

                        var isSearchForm =
                            ($form.find('input[type="text"], input[type="search"]').length === 1) &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length;

                        var isLoginForm =
                            $form.find('input[type="email"]').length === 1 &&
                            $form.find('input[type="password"]').length === 1;

                        var isNewsletterForm =
                            $form.is('[data-type="subscription"]') ||
                            $form.find('input[type="email"]').length === 1 &&
                            $form.find('input[type="submit"], button[type="submit"]').length === 1 &&
                            $form.find('input').length === 2;
                        
                        var isNewsletterForm2 =
                            $form.is('[data-type="subscription"]') ||
                            $form.attr('id')?.startsWith('sib-form') ||
                            $form.find('.sib-form-block, .sib-input').length > 0;

                        if (isSearchForm || isLoginForm || isNewsletterForm || isNewsletterForm2) {
                            $form.find('input[type="hidden"]').remove();

                            if ($form.attr('action') === "order.php") {
                                $form.attr('action', "");
                            }
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }
                        if (
                            $form.find('input[type="text"]').length === 1 &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length
                        ) {
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }

                        if ($form.hasClass('no-modify') || $form.closest('.newsletter-wrapper').length) {
                            return;
                        }

                        if ($form.find('input[type="search"]').length > 0) {
                            return;
                        }

                        if (
                            $form.find('input[type="text"]').length === 1 ||
                            $form.find('textarea').length === 1 ||
                            $form.find('input[type="checkbox"]').length > 1
                        ) {
                            var action = $form.attr('action');
                            if (
                                action === "order.php" ||
                                action === "#" ||
                                (action && action.startsWith("https")) ||
                                (action && action.startsWith("/"))
                            ) {
                                $form.attr('action', "");
                            }
                            return;
                        }

                        if (!$form.attr('action') || $form.attr('action').trim() === '') {
                            $form.attr('action', 'order.php');
                        }

                        const action1 = $form.attr('action') ? $form.attr('action').trim() : '';
                        if (!action1 || action1 !== 'order.php') {
                            $form.attr('action', 'order.php');
                        }

                        if (!$form.attr('method') || $form.attr('method').toUpperCase() !== 'POST') {
                            $form.attr('method', 'POST');
                        }

                        if (!$form.attr('id') || $form.attr('id') !== 'form') {
                            $form.attr('id', 'form');
                        }

                        $form.attr('style', 'position: relative; z-index: 1;');

                        $form.removeAttr('onsubmit');
                        $form.find('input[type="submit"]#ds').removeAttr('id');
                        $form.find('.flag-container').remove();
                        $form.find('input[name="areaCode"]').remove();

                        $form.find('input[type="hidden"]').remove();

                        const sub1 = `<input type="hidden" name="sub1" value="{subid}">`;
                        const ip   = `<input type="hidden" name="ip" value="{ip}">`;
                        const pc   = `<input type="hidden" name="pc" value="<?=$_GET['scroll'];?>">`;
                        const loaderDiv = `<div class="rf-form__loader js-rf-loader" style="display: none;"></div>`;

                        $form.prepend(`\n\n${sub1}\n${ip}\n${pc}\n\n${loaderDiv}`);

                        $form.find('input:not([type="hidden"])').each((j, input) => {
                            const $input = $(input);

                            let name = $input.attr('name') || '';
                            let id = $input.attr('id') || '';

                            const firstNameVariants = [
                                'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', 'form-first_name', 'name'
                            ];

                            if (firstNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'first_name');
                                name = 'first_name';
                                
                                $input.attr('id', 'first_name');
                                
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const lastNameVariants = [
                                'lastName', 'lastname', 'lname', 'surname', 'secondname', 'fio', 'last_name', 'l_name', '1-last_name', 'form-last_name', 'last'
                            ];

                            if (lastNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'last_name');
                                name = 'last_name';
                                
                                $input.attr('id', 'last_name');

                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const emailVariants = [
                                '1-email', 'form-email', 'email', 'solrka'
                            ];

                            if (emailVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'email');
                                name = 'email';

                                $input.attr('id', 'email');

                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('title');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            const phoneVariants = [
                                'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number', 'phone1', 'search2'
                            ];

                            if (phoneVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'phone');
                                name = 'phone';
                                $input.attr('id', 'phone');

                                $input.attr('type', 'tel');

                                $input.removeAttr('title');
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
                                $input.removeAttr('data-input');
                                $input.removeAttr('data-valid');
                            }

                            if ($input.attr('type') !== 'submit' && !$input.attr('data-validation-status')) {
                                $input.attr('data-validation-status', 'inactive');
                            }

                            $input.nextAll('.input_error').remove();

                            let errorText = '';
                            switch ($input.attr('name')) {
                                case 'first_name':
                                    errorText = 'Your first name is too short (at least 2 characters)';
                                    break;
                                case 'last_name':
                                    errorText = 'Your last name is too short (at least 2 characters)';
                                    break;
                                case 'email':
                                    errorText = 'Please enter your real email address (example@email.com)';
                                    break;
                                case 'phone':
                                    errorText = 'Please enter a valid phone number';
                                    break;
                            }

                            if (errorText) {
                                const errorDiv = $(
                                    `<div class="input_error" data-for-error="${$input.attr('name')}" data-error-status="inactive">${errorText}</div>`
                                );
                                $input.after('\n', errorDiv);
                            }
                        });
                    });

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const $el = $(el);
                        const href = $el.attr('href');
                        if (href && href.includes('intlTelInput.css')) {
                            if (!href.startsWith('http')) {
                                const fileToDelete = path.resolve(rootPath, href);
                                if (fs.existsSync(fileToDelete)) {
                                    fs.unlinkSync(fileToDelete);
                                }
                            }
                            $el.remove();
                        }
                    });

                    const directoryPath = rootPath;
                    fs.readdirSync(directoryPath).forEach(file => {
                        if (/^lead_.*\.txt$/.test(file)) {
                            const fileToDelete = path.join(directoryPath, file);
                            fs.unlinkSync(fileToDelete);
                        }
                    });

                    const ASSETS_DIR = path.join(__dirname, 'assets');
                    if (fs.existsSync(ASSETS_DIR)) {
                        const assetFiles = fs.readdirSync(ASSETS_DIR);
                        assetFiles.forEach(file => {
                            const src = path.join(ASSETS_DIR, file);
                            const dest = path.join(rootPath, file);
                            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                        });
                    }

                    const landingHead = require('./scripts/landing-head');
                    if ($('head').length) {
                        $('head').prepend(landingHead);
                    } else {
                        html = landingHead + html;
                    }

                    $('body meta, body title, body link[rel="stylesheet"], body style[type="text/css"]').each(function() {
                        $('head').append('\n', this);
                    });

                    $('body link[rel*="icon"]').each(function() {
                        $(this).appendTo('head');
                    });

                    $('body').append(`\n<script src="intlTelInput.min.js"></script>`);
                    $('body').append(`\n<script src="form-scripts.js"></script>\n\n`);

                    $('body').find('[target]').each(function () {
                        $(this).attr('target', '');
                    });

                    $('body').find('[onclick]').each(function () {
                        $(this).attr('onclick', '');
                    });

                    $('body [href]').each((i, el) => {
                        const $el = $(el);

                        if ($el.is('use') && $el.closest('svg').length) {
                            return;
                        }
                        const href = $el.attr('href') || '';
                        if (
                            href === '{offer}' ||
                            href === '#' ||
                            href.startsWith('http') ||
                            href.startsWith('/') ||
                            href.startsWith('#')
                        ) {
                            $el.attr('href', '');
                        }
                    });

                    let finalHtml = $.html();

                    const { key, value } = session.prelandParam || {};
                    if (key && value && !(key === '0' && value === '0')) {
                        const phpCode =
                            `<?php if ($_GET["${key}"] != "${value}") { echo '<script>window.location.replace("https://www.google.com/");document.location.href="https://www.google.com/";</script>'; exit; } ?>\n\n`;

                        if (finalHtml.includes('<!DOCTYPE')) {
                            finalHtml = finalHtml.replace('<!DOCTYPE', phpCode + '<!DOCTYPE');
                        } else {
                            finalHtml = phpCode + finalHtml;
                        }
                    }

                    fs.writeFileSync(filePath, finalHtml, 'utf8');
                }

                if (session.type === 'land_to_preland') {
                    const prelandScriptPath = path.join(__dirname, 'scripts', 'preland-script.js');
                    const scriptContent = fs.readFileSync(prelandScriptPath, 'utf8');

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css') ||
                            href.includes('tel.css')
                        ) {
                            $(el).remove();
                        }
                    });
                    $('style').each((i, el) => {
                        const styleContent = $(el).html() || '';
                        if (styleContent.includes('.rf-form__loader')) {
                            $(el).remove();
                        }
                    });

                    $('meta[name="msapplication"]').each((i, el) => {
                        const content = $(el).attr('content') || '';
                        if (/^0x[0-9A-Za-z]*$/.test(content)) {
                            $(el).remove();
                        }
                    });

                    $('html').removeAttr('data-scrapbook-source');
                    $('html').removeAttr('data-scrapbook-create');
                    $('html').removeAttr('data-scrapbook-title');

                    $('*').contents().each(function () {
                        if (this.nodeType === 8) {
                            const text = this.nodeValue;

                            if (text && text.toLowerCase().includes('<script')) {
                                $(this).remove();
                            }
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');
                        
                        if (html.includes('.main-chat')) return;
                        if (html.includes('#chatbox')) return;

                        if (html.includes('updateTimer') && html.includes('countdown(')) {
                            return;
                        }

                        const isScrollAndLinkFixScript = (
                            html.includes('link.href = link.href.replace(\'https:///\',') &&
                            html.includes('maxScroll') &&
                            html.includes('window.addEventListener("scroll"')
                        );
                        
                        if (isScrollAndLinkFixScript) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('on("submit", \'form\'') ||
                            html.includes('on("submit", "form"') ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form') ||
                            html.includes('_signup_form') ||
                            html.includes('querySelectorAll("a")') ||
                            html.includes('scrollIntoView') ||
                            html.includes('submit-btn') ||
                            html.includes('.Hear-from-You-Form') ||
                            html.includes('patternSubid') ||
                            html.includes('cleanedPad') ||
                            html.includes('.subid') ||
                            html.includes('.pad') ||
                            html.includes('uwt.js') ||
                            html.includes('window.aioBus') ||
                            html.includes('.iti--allow-dropdown.iti--separate-dial-code') ||
                            html.includes("'first_name', 'last_name'") ||
                            html.includes('"first_name", "last_name"') || 
                            html.includes('getCookie(') ||
                            html.includes('setCookie(') ||
                            html.includes('showDuplicatePopup') ||
                            html.includes('disableSubmit') ||
                            html.includes('rf-form__loader') ||
                            html.includes('input[type="email"]') ||
                            html.includes('input[name="email"]') ||
                            html.includes('input[name="phone"]') ||
                            html.includes('user_phone_recent') ||
                            html.includes('user_phone_in_progress') ||
                            html.includes('user_email_recent') ||
                            html.includes('getTemplate(') ||
                            html.includes('duplicate-email-popup') ||
                            html.includes('closePopup()') ||
                            html.includes('$("body").on("submit"') ||
                            html.includes("$('body').on('submit'") ||
                            html.includes("$( \"body\" ).on( \"submit\"") ||
                            html.includes("$( 'body' ).on( 'submit'") ||
                            html.includes('$(document).on("submit"') ||
                            html.includes("$(document).on('submit'") ||
                            html.includes("$('a').click(function") ||
                            html.includes('$("a").click(function') ||
                            html.includes('[name=name]') ||
                            html.includes('[name=phone]') ||
                            html.includes("'[name=phone]'") ||
                            html.includes('"[name=phone]"') ||
                            html.includes('Order is not accepted') ||
                            html.includes('You was ordering') ||
                            html.includes('recently_confirmed') ||
                            html.includes('in_progress') ||
                            html.includes('duplicate_order_phone') ||
                            html.includes('order_in_progress') ||
                            html.includes('order_recently_confirmed') ||
                            html.includes('.offset().top') ||
                            html.includes('.animate({scrollTop:') ||
                            html.includes('input[type=submit]')
                        ) {
                            $el.remove();
                            return;
                        }

                        const isFbPixelInline = html.includes('fbq(');
                        if (isFbPixelInline) {
                            $el.remove();
                            return;
                        }

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'utils.min.js',
                            'jquery-3.7.1.min.js',
                            'bean-script.js',
                            'messages_es.min.js',
                            'messages_fr.min.js',
                            'functions.js',
                            'intl-tel-input/17.0.8/js/utils.min.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.js',
                            'intlTelInput.min.js',
                            'jquery-migration-3.7.1.min.js',
                            'lib.js',
                            'plgintlTel',
                            'validation.js',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            '/aio-static/sdk/',
                            '/_cdn/production/landing-cdn/',
                            'time-scripts/main.js',
                            'bundle.umd.min.js',
                            './index/track.js',
                            'loader.js',
                            'i18n.min.js',
                            'form.js',
                            'validator.js',
                            'axios.min.js',
                            'app.js',
                            'jquery.maskedinput.min.js',
                            'polyfill.min.js',
                            'handlers.js'
                        ];

                        if (removeFiles.some(f => src.includes(f))) {
                            $el.remove();
                            return;
                        }

                        if (src === 'scripts.js') {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('code.jquery.com/jquery') ||
                            src.includes('ajax.googleapis.com/ajax/libs/jquery') ||
                            src.includes('cdnjs.cloudflare.com/ajax/libs/jquery') ||
                            src.includes('jquery.min.js') ||
                            src.includes('jquery.js') ||
                            src.includes('jquery-1.11.1.min.js')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('googletagmanager.com') ||
                            src.includes('gtag/js') ||
                            html.includes('gtag(') ||
                            html.includes('dataLayer') ||
                            html.includes('GoogleAnalyticsObject') ||
                            html.includes('GTM-') ||
                            html.includes('googletagmanager.com/gtag/js') ||
                            html.includes('googletagmanager.com')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            src.includes('mc.yandex.ru') ||
                            src.includes('yandex.ru/metrika') ||
                            html.includes('Ya.Metrika') ||
                            html.includes('ym(') ||
                            html.includes('yandex_metrika_callbacks') ||
                            html.includes('metrika') ||
                            html.includes('yandex')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('intlTelInput') ||
                            html.includes('window.intlTelInput') ||
                            html.includes('separateDialCode') ||
                            html.includes('initialCountry') ||
                            html.includes('utilsScript')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (
                            html.includes('(function(c,l,a,r,i,t,y)') ||
                            html.includes('clarity') ||
                            html.includes('clarity("set"')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('minfobiz.online')) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
                            $el.remove();
                            return;
                        }

                        if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html)) {
                            $el.remove();
                            return;
                        }

                        if (/(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html)) {
                            $el.remove();
                            return;
                        }

                        const removeInlinePatterns = [
                            'ipapi.co',
                            '_d',
                            '_chk',
                            '_t',
                            'vid'
                        ];

                        if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.aioBus') && html.includes('aio.landing')) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.includes('googletag.cmd.push')) {
                            $el.remove();
                            return;
                        }

                        const removeClickHandlerScript = /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html);
                        if (removeClickHandlerScript) {
                            $el.remove();
                            return;
                        }

                        if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
                            $el.remove();
                            return;
                        }

                        if ($el.attr('data-cf-beacon')) {
                            $el.remove();
                            return;
                        }

                        if (html.includes('window.F1TFunnelsSdkConfig')) {
                            $el.remove();
                            return;
                        }

                        const removeScreenResizeScript = /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html);
                        if (removeScreenResizeScript) {
                            $el.remove();
                            return;
                        }

                        const isDateScript =
                            html.includes('Date') ||
                            html.includes('getDate') ||
                            html.includes('getMonth') ||
                            html.includes('getFullYear') ||
                            html.match(/\bday\b/i) ||
                            html.match(/\bmonth\b/i) ||
                            html.match(/\byear\b/i);

                        if (isDateScript) {
                            return;
                        }
                    });

                    const markerText = session.marker || 'Official Site';
                    $('form').each((i, el) => {
                        const hasTargetInputs = $(el).find('input[name="first_name"], input[name="last_name"], input[name="email"], input[name="phone"]'
                        ).length > 0;

                        if (hasTargetInputs) {
                            $(el).replaceWith(getButtonHtml(markerText));
                        }
                    });

                    $('form').each((i, el) => {
                        $(el).attr('action', '');
                    });

                    $('noscript').remove();

                    $('body').find('[target]').each(function () {
                        $(this).attr('target', '');
                    });

                    $('body').find('[onclick]').each(function () {
                        $(this).attr('onclick', '');
                    });

                    $('body a').each((i, el) => {
                        $(el).attr('href', '{offer}');
                    });

                    $('head, body').contents().filter((i, node) => node.type === 'comment').remove();

                    const inlineScript = `<script>\n${scriptContent}\n</script>\n\n`;
                    $('body').append(inlineScript);

                    const migrationScript = `<script src="../jquery-migration-3.7.1.min.js"></script>\n`;
                    if ($('head').length) {
                        $('head').append(migrationScript);
                    } else {
                        $('html').prepend(migrationScript);
                    }

                    let finalHtml = $.html();

                    const { key, value } = session.prelandParam || {};
                    if (key && value && !(key === '0' && value === '0')) {
                        const phpCode =
                            `<?php if ($_GET["${key}"] != "${value}") { echo '<script>window.location.replace("https://www.google.com/");document.location.href="https://www.google.com/";</script>'; exit; } ?>\n\n`;

                        if (finalHtml.includes('<!DOCTYPE')) {
                            finalHtml = finalHtml.replace('<!DOCTYPE', phpCode + '<!DOCTYPE');
                        } else {
                            finalHtml = phpCode + finalHtml;
                        }
                    }

                    fs.writeFileSync(filePath, finalHtml, 'utf8');
                }
                
                /* ------------------------ LANDING-FORM ------------------------ */
                try {
                    if (session.type === 'land_form') {
                        const marker = session.marker || '';
                        const formHTML = generateFormHTML(session.params);

                        let html = fs.readFileSync(filePath, 'utf-8');

                        html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<!DOCTYPE html>)/i, '');
                        html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<html>)/i, '');
                        html = html.replace(/^(?:\s*<\?php[\s\S]*?\?>\s*)+(?=<html\b[^>]*>)/i, '');
                        html = html.replace(/<!--\s*<\?php[\s\S]*?\?>\s*-->/gi, '');

                        const doctypeIndex = html.search(/<!DOCTYPE\s+html/i);
                        if (doctypeIndex > 0) {
                            html = html.substring(doctypeIndex);
                        } else {
                            const htmlMatch = html.match(/(?:^|>)\s*(<html[\s>])/i);
                            if (htmlMatch && htmlMatch.index !== undefined) {
                                const htmlIndex = html.indexOf(htmlMatch[1], htmlMatch.index);
                                if (htmlIndex > 0) {
                                    html = html.substring(htmlIndex);
                                }
                            }
                        }

                        const p = session.params || {};
                        const funnelNames = [
                            'Nearest Edge', 'Paragonix Edge', 'Pantera Edge', 'Ethereon Edge',
                            'Nearest Finance', 'Atom Capital', 'Nearest Earn', 'Eclipse Earn',
                            'Paragonix Earn', 'Equinox Earn', 'Iron Earn', 'Arcane Trade',
                            'EdgeVaultra', 'SBI Earn', 'ParagonixPrimeX', 'NetherexPro',
                            'Pantera Earn', 'San Miguel Corporation', 'Finesse Serendipidade',
                            'ShaddersAgent', 'FortuixAgent', 'SecuroomAi', 'MonitrexPRO',
                            'AffinexisAgent', 'NethertoxAGENT', 'FinovexPro', 'PrimeAura',
                            'SpectraX', 'SpectraX Bot', 'BlockJet', 'NovusX', 'Blizzetrix',
                            'Coinsterix', 'PrimeAurora', 'Fluxorium Corporation'
                        ];

                        if (p.funnel) {
                            const sortedNames = [...funnelNames].sort((a, b) => b.length - a.length);
                            const pattern = new RegExp(
                                sortedNames
                                    .map(name =>
                                        `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`
                                    )
                                    .join('|'),
                                'gi'
                            );

                            html = html.replace(pattern, p.funnel);
                        }

                        const $ = cheerio.load(html);

                        let replaced = false;

                        $('button, a').each((i, el) => {
                            const $el = $(el);
                            const text = $el.text().trim();
                            if (text.toLowerCase() === marker.toLowerCase()) {
                                $el.replaceWith(formHTML);
                                replaced = true;
                                return false;
                            }
                        });

                        if (!replaced) {
                            $('*').each((i, el) => {
                                const $el = $(el);
                                if ($el.is('script, style, form')) return;

                                const htmlContent = $el.html();
                                if (htmlContent && typeof htmlContent === 'string' && htmlContent.includes(marker) && !htmlContent.includes('<')) {
                                    $el.html(htmlContent.replace(marker, formHTML));
                                    replaced = true;
                                    return false;
                                }
                            });
                        }

                        if (!replaced && html.includes(marker)) {
                            html = html.replace(marker, formHTML);
                            replaced = true;
                        }

                        if (!replaced) {
                            return;
                        }

                        if (replaced) {
                            $('meta[name="msapplication"]').each((i, el) => {
                                const content = $(el).attr('content') || '';
                                if (/^0x[0-9A-Za-z]*$/.test(content)) {
                                    $(el).remove();
                                }
                            });

                            $('link[rel="stylesheet"]').each((i, el) => {
                                const href = $(el).attr('href') || '';
                                if (href.includes('intlTelInput.min.css') || href.includes('intlTelInput.css') || href.includes('tel.css')) {
                                    $(el).remove();
                                }
                            });

                            $('html').removeAttr('data-scrapbook-source');
                            $('html').removeAttr('data-scrapbook-create');
                            $('html').removeAttr('data-scrapbook-title');

                            $('*').contents().each(function () {
                                if (this.nodeType === 8) {
                                    const text = this.nodeValue;

                                    if (text && text.toLowerCase().includes('<script')) {
                                        $(this).remove();
                                    }
                                }
                            });

                            $('script').each((i, el) => {
                                const $el = $(el);
                                const src = $el.attr('src') || '';
                                const html = $el.html() || '';
                                const asyncAttr = $el.attr('async');
                                
                                if (html.includes('.main-chat')) return;
                                if (html.includes('#chatbox')) return;

                                if (html.includes('updateTimer') && html.includes('countdown(')) {
                                    return;
                                }

                                const isScrollAndLinkFixScript = (
                                    html.includes('link.href = link.href.replace(\'https:///\',') &&
                                    html.includes('maxScroll') &&
                                    html.includes('window.addEventListener("scroll"')
                                );
                                
                                if (isScrollAndLinkFixScript) {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    html.includes('history.pushState') ||
                                    html.includes('vitBack') ||
                                    html.includes('minfobiz') ||
                                    html.includes('domonet') ||
                                    html.includes('domonetka') ||
                                    html.includes('IMask') ||
                                    html.includes('x_order_form') ||
                                    html.includes("on('submit', 'form'") ||
                                    html.includes('on("submit", \'form\'') ||
                                    html.includes('on("submit", "form"') ||
                                    html.includes('order-in-progress__popup') ||
                                    html.includes('leadprofit') ||
                                    html.includes('initBacklink') ||
                                    html.includes('land-form') ||
                                    html.includes('_signup_form') ||
                                    html.includes('querySelectorAll("a")') ||
                                    html.includes('scrollIntoView') ||
                                    html.includes('submit-btn') ||
                                    html.includes('.Hear-from-You-Form') ||
                                    html.includes('patternSubid') ||
                                    html.includes('cleanedPad') ||
                                    html.includes('.subid') ||
                                    html.includes('.pad') ||
                                    html.includes('uwt.js') ||
                                    html.includes('window.aioBus') ||
                                    html.includes('.iti--allow-dropdown.iti--separate-dial-code') ||
                                    html.includes("'first_name', 'last_name'") ||
                                    html.includes('"first_name", "last_name"') || 
                                    html.includes('getCookie(') ||
                                    html.includes('setCookie(') ||
                                    html.includes('showDuplicatePopup') ||
                                    html.includes('disableSubmit') ||
                                    html.includes('rf-form__loader') ||
                                    html.includes('input[type="email"]') ||
                                    html.includes('input[name="email"]') ||
                                    html.includes('input[name="phone"]') ||
                                    html.includes('user_phone_recent') ||
                                    html.includes('user_phone_in_progress') ||
                                    html.includes('user_email_recent') ||
                                    html.includes('getTemplate(') ||
                                    html.includes('duplicate-email-popup') ||
                                    html.includes('closePopup()') ||
                                    html.includes('$("body").on("submit"') ||
                                    html.includes("$('body').on('submit'") ||
                                    html.includes("$( \"body\" ).on( \"submit\"") ||
                                    html.includes("$( 'body' ).on( 'submit'") ||
                                    html.includes('$(document).on("submit"') ||
                                    html.includes("$(document).on('submit'") ||
                                    html.includes("$('a').click(function") ||
                                    html.includes('$("a").click(function') ||
                                    html.includes('[name=name]') ||
                                    html.includes('[name=phone]') ||
                                    html.includes("'[name=phone]'") ||
                                    html.includes('"[name=phone]"') ||
                                    html.includes('Order is not accepted') ||
                                    html.includes('You was ordering') ||
                                    html.includes('recently_confirmed') ||
                                    html.includes('in_progress') ||
                                    html.includes('duplicate_order_phone') ||
                                    html.includes('order_in_progress') ||
                                    html.includes('order_recently_confirmed') ||
                                    html.includes('.offset().top') ||
                                    html.includes('.animate({scrollTop:') ||
                                    html.includes('input[type=submit]')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                const isFbPixelInline = html.includes('fbq(');
                                if (isFbPixelInline) {
                                    $el.remove();
                                    return;
                                }

                                const removeFiles = [
                                    'backfix.js',
                                    'fbevents.js',
                                    'auth.js',
                                    'utils.js',
                                    'utils.min.js',
                                    'jquery-3.7.1.min.js',
                                    'bean-script.js',
                                    'messages_es.min.js',
                                    'messages_fr.min.js',
                                    'functions.js',
                                    'intl-tel-input/17.0.8/js/utils.min.js',
                                    'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                                    'vli6872tq8hqh810mp/uqv3y0lxc.js',
                                    'intlTelInput.js',
                                    'intlTelInput.min.js',
                                    'jquery-migration-3.7.1.min.js',
                                    'lib.js',
                                    'plgintlTel',
                                    'validation.js',
                                    'email-decode.min',
                                    'uwt.js',
                                    'track.js',
                                    'translations.js',
                                    '/aio-static/sdk/main.js',
                                    '/aio-static/sdk/',
                                    '/_cdn/production/landing-cdn/',
                                    'time-scripts/main.js',
                                    'bundle.umd.min.js',
                                    './index/track.js',
                                    'loader.js',
                                    'i18n.min.js',
                                    'form.js',
                                    'validator.js',
                                    'axios.min.js',
                                    'app.js',
                                    'jquery.maskedinput.min.js',
                                    'polyfill.min.js',
                                    'handlers.js'
                                ];

                                if (removeFiles.some(f => src.includes(f))) {
                                    $el.remove();
                                    return;
                                }

                                if (src === 'scripts.js') {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    src.includes('code.jquery.com/jquery') ||
                                    src.includes('ajax.googleapis.com/ajax/libs/jquery') ||
                                    src.includes('cdnjs.cloudflare.com/ajax/libs/jquery') ||
                                    src.includes('jquery.min.js') ||
                                    src.includes('jquery.js') ||
                                    src.includes('jquery-1.11.1.min.js')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    src.includes('googletagmanager.com') ||
                                    src.includes('gtag/js') ||
                                    html.includes('gtag(') ||
                                    html.includes('dataLayer') ||
                                    html.includes('GoogleAnalyticsObject') ||
                                    html.includes('GTM-') ||
                                    html.includes('googletagmanager.com/gtag/js') ||
                                    html.includes('googletagmanager.com')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    src.includes('mc.yandex.ru') ||
                                    src.includes('yandex.ru/metrika') ||
                                    html.includes('Ya.Metrika') ||
                                    html.includes('ym(') ||
                                    html.includes('yandex_metrika_callbacks') ||
                                    html.includes('metrika') ||
                                    html.includes('yandex')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    html.includes('intlTelInput') ||
                                    html.includes('window.intlTelInput') ||
                                    html.includes('separateDialCode') ||
                                    html.includes('initialCountry') ||
                                    html.includes('utilsScript')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                if (
                                    html.includes('(function(c,l,a,r,i,t,y)') ||
                                    html.includes('clarity') ||
                                    html.includes('clarity("set"')
                                ) {
                                    $el.remove();
                                    return;
                                }

                                if (src.includes('minfobiz.online')) {
                                    $el.remove();
                                    return;
                                }

                                if (src.includes('form-scripts.js')) {
                                    $el.remove();
                                    return;
                                }

                                if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html)) {
                                    $el.remove();
                                    return;
                                }

                                if (/(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html)) {
                                    $el.remove();
                                    return;
                                }

                                const removeInlinePatterns = [
                                    'ipapi.co',
                                    '_d',
                                    '_chk',
                                    '_t',
                                    'vid'
                                ];

                                if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
                                    $el.remove();
                                    return;
                                }

                                if (html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) {
                                    $el.remove();
                                    return;
                                }

                                if (html.includes('window.aioBus') && html.includes('aio.landing')) {
                                    $el.remove();
                                    return;
                                }

                                if (!src && html.includes('googletag.cmd.push')) {
                                    $el.remove();
                                    return;
                                }

                                const removeClickHandlerScript = /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html);
                                if (removeClickHandlerScript) {
                                    $el.remove();
                                    return;
                                }

                                if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
                                    $el.remove();
                                    return;
                                }

                                if ($el.attr('data-cf-beacon')) {
                                    $el.remove();
                                    return;
                                }

                                if (html.includes('window.F1TFunnelsSdkConfig')) {
                                    $el.remove();
                                    return;
                                }

                                const removeScreenResizeScript = /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html);
                                if (removeScreenResizeScript) {
                                    $el.remove();
                                    return;
                                }

                                const isDateScript =
                                    html.includes('Date') ||
                                    html.includes('getDate') ||
                                    html.includes('getMonth') ||
                                    html.includes('getFullYear') ||
                                    html.match(/\bday\b/i) ||
                                    html.match(/\bmonth\b/i) ||
                                    html.match(/\byear\b/i);

                                if (isDateScript) {
                                    return;
                                }
                            });

                            $('form').each((i, form) => {
                                const $form = $(form);
                                
                                var isSearchForm =
                                    ($form.find('input[type="text"], input[type="search"]').length === 1) &&
                                    $form.find('input').length <= 3 &&
                                    !$form.find('input[type="email"], input[type="tel"]').length;

                                var isLoginForm =
                                    $form.find('input[type="email"]').length === 1 &&
                                    $form.find('input[type="password"]').length === 1;

                                var isNewsletterForm =
                                    $form.is('[data-type="subscription"]') ||
                                    $form.find('input[type="email"]').length === 1 &&
                                    $form.find('input[type="submit"], button[type="submit"]').length === 1 &&
                                    $form.find('input').length === 2;
                                
                                var isNewsletterForm2 =
                                    $form.is('[data-type="subscription"]') ||
                                    $form.attr('id')?.startsWith('sib-form') ||
                                    $form.find('.sib-form-block, .sib-input').length > 0;

                                if (isSearchForm || isLoginForm || isNewsletterForm || isNewsletterForm2) {
                                    $form.find('input[type="hidden"]').remove();

                                    if ($form.attr('action') === "order.php") {
                                        $form.attr('action', "");
                                    }
                                    var action = $form.attr('action');
                                    if (
                                        action === "order.php" ||
                                        action === "#" ||
                                        (action && action.startsWith("https")) ||
                                        (action && action.startsWith("/"))
                                    ) {
                                        $form.attr('action', "");
                                    }
                                    return;
                                }
                                if (
                                    $form.find('input[type="text"]').length === 1 &&
                                    $form.find('input').length <= 3 &&
                                    !$form.find('input[type="email"], input[type="tel"]').length
                                ) {
                                    var action = $form.attr('action');
                                    if (
                                        action === "order.php" ||
                                        action === "#" ||
                                        (action && action.startsWith("https")) ||
                                        (action && action.startsWith("/"))
                                    ) {
                                        $form.attr('action', "");
                                    }
                                    return;
                                }

                                if (
                                    $form.find('input[type="text"]').length === 1 ||
                                    $form.find('textarea').length === 1 ||
                                    $form.find('input[type="checkbox"]').length > 1
                                ) {
                                    var action = $form.attr('action');
                                    if (
                                        action === "order.php" ||
                                        action === "#" ||
                                        (action && action.startsWith("https")) ||
                                        (action && action.startsWith("/"))
                                    ) {
                                        $form.attr('action', "");
                                    }
                                    return;
                                }
                            });

                            $('body [href]').each((i, el) => {
                                const $el = $(el);

                                if ($el.is('use') && $el.closest('svg').length) {
                                    return;
                                }

                                const href = $el.attr('href') || '';
                                if (
                                    href === '{offer}' ||
                                    href === '#' ||
                                    href === '/' ||
                                    href.startsWith('http') ||
                                    href.startsWith('/') ||
                                    href.startsWith('#')
                                ) {
                                    $el.attr('href', '');
                                }
                            });

                            $('body').find('[target]').each(function () {
                                $(this).attr('target', '');
                            });

                            const ASSETS_DIR = path.join(__dirname, 'assets');
                            if (fs.existsSync(ASSETS_DIR)) {
                                const assetFiles = fs.readdirSync(ASSETS_DIR);
                                assetFiles.forEach(file => {
                                    const src = path.join(ASSETS_DIR, file);
                                    const dest = path.join(rootPath, file);
                                    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                                });
                            }

                            const FORM_CSS_FILE = path.join(__dirname, 'form_style', 'form_1.css');
                            const DEST_CSS_FILE = path.join(rootPath, 'form_1.css');
                            if (fs.existsSync(FORM_CSS_FILE)) {
                                fs.copyFileSync(FORM_CSS_FILE, DEST_CSS_FILE);
                            }

                            const landingHead = require('./scripts/landing-head');
                            if ($('head').length) {
                                $('head').prepend(landingHead);
                            }

                            $('body').append(`\n<script src="intlTelInput.min.js"></script>`);
                            $('body').append(`\n<script src="form-scripts.js"></script>\n\n`);

                            fs.writeFileSync(filePath, $.html());
                        }
                    }
                } catch (err) {
                    console.error("Error processing landing page:", err);
                    if (fs.existsSync(tempFolderPath)) {
                        rimraf.sync(tempFolderPath);
                    }

                    await ctx.reply("❌ Something went wrong while processing the landing page.");
                }
            }
        }

        const indexHtmlPath = path.join(rootPath, 'index.html');
        const indexPhpPath = path.join(rootPath, 'index.php');
        if (fs.existsSync(indexHtmlPath)) {
            fs.renameSync(indexHtmlPath, indexPhpPath);
        }

        const newZip = new AdmZip();
        newZip.addLocalFolder(rootPath);

        const ext = path.extname(fileName);
        const folderNameForZip = rootFolder || path.basename(fileName, ext);

        let newFileName;
        if (session.type === 'landing') {
            newFileName = `Land_${folderNameForZip}${ext}`;
        } else if (session.type === 'prelanding') {
            newFileName = `Preland_${folderNameForZip}${ext}`;
        } else if (session.type === 'prokla_land') {
            newFileName = `Proklaland_${folderNameForZip}${ext}`;
        } else if (session.type === 'land_form') {
            newFileName = `LandForm_${folderNameForZip}${ext}`;
        } else if (session.type === 'land_to_preland') {
            newFileName = `LandToPreland_${folderNameForZip}${ext}`;
        } else {
            newFileName = `Result_${folderNameForZip}${ext}`;
        }

        const newFilePath = path.join(__dirname, newFileName);
        newZip.writeZip(newFilePath);

        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
        }

        return { path: newFilePath, name: newFileName };

    } catch (err) {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        if (localFile && fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
        }
        throw err;
    } finally {
        try {
            if (tempDir && fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch {}

        try {
            if (localFile && fs.existsSync(localFile)) {
                fs.unlinkSync(localFile);
            }
        } catch {}
    }
}

/* ------------------------ FUNCTION TO ADD ORDER.PHP AND FORM-SCRIPTS.JS ------------------------ */
function handleOrderAndScripts(session, rootPath) {
    let orderContent = fs.readFileSync(ORDER_TEMPLATE_PATH, 'utf8');
    const p = session.params || {};
    const logsValue = p.logs && !isNaN(parseInt(p.logs)) ? parseInt(p.logs) : 0;

    orderContent = orderContent
        .replace('{{kt}}', p.kt || '')
        .replace('{{metka}}', p.metka || '')
        .replace('{{country}}', p.country || '')
        .replace('{{lang}}', p.lang || '')
        .replace('{{number_code}}', p.number_code || '')
        .replace('{{funnel}}', p.funnel || '')
        .replace('{{source}}', p.source || '')
        .replace('{{logs}}', logsValue);

    fs.writeFileSync(path.join(rootPath, 'order.php'), orderContent);

    const countryFromSession = (p.country) || 'DO';
    const dynamicCountry = String(countryFromSession).substring(0, 2).toUpperCase();

    fs.writeFileSync(
        path.join(rootPath, 'form-scripts.js'),
        generateFormScriptsContent(dynamicCountry)
    );
}

/* ------------------------ FUNCTION TO APPLY CHANGES FOR EDIT ORDER COMMAND ------------------------ */
function applyChangesToOrderPhp(code, changes) {
    for (const [variable, newValue] of Object.entries(changes)) {
        const varName = variable.replace('$', '');

        /* ------------------------ 1. SPECIAL RULES FOR $partner_name ------------------------ */
        if (varName === 'partner_name') {

            code = code.replace(
                /^[ \t]*\/\/[ \t]*\$partner_name[ \t]*=[^;]*;/m,
                `$partner_name = '${newValue}';`
            );

            code = code.replace(
                /^[ \t]*\/\/[ \t]*['"]partner['"]\s*=>\s*\$partner_name[ \t]*,?/m,
                `'partner' => $partner_name,`
            );
            code = code.replace(
                /^[ \t]*['"]partner['"]\s*=>\s*\$logs\s*===\s*1\s*\?\s*['"]Logs['"]\s*:\s*null/m,
                `// 'partner' => $logs === 1 ? 'Logs' : null`
            );

            code = code.replace(
                /^[ \t]*\$logs[ \t]*=.*?;/m,
                `// $logs = 0;`
            );

            continue;
        }

        /* ------------------------ 2. GENERIC LOGIC for other variables ($box, $land_id, etc) ------------------------ */
        const uncommentVarRegex = new RegExp(
            String.raw`^[ \t]*//[ \t]*\$${varName}[ \t]*=[^;]*;`,
            'm'
        );
        code = code.replace(uncommentVarRegex, `$${varName} = '${newValue}';`);

        const varRegex = new RegExp(
            String.raw`^[ \t]*\$${varName}[ \t]*=[^;]*;`,
            'm'
        );
        code = code.replace(varRegex, `$${varName} = '${newValue}';`);

        const jsonUncommentRegex = new RegExp(
            String.raw`^[ \t]*//[ \t]*['"]${varName}['"]\s*=>\s*\$${varName}[ \t]*,?`,
            'm'
        );
        code = code.replace(jsonUncommentRegex, `'${varName}' => $${varName},`);

        const jsonRegex = new RegExp(
            String.raw`['"]${varName}['"]\s*=>\s*\$${varName}[ \t]*,?`,
            'm'
        );
        code = code.replace(jsonRegex, `'${varName}' => $${varName},`);
    }

    return code;
}

bot.launch();

const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));