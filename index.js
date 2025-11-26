require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cheerio = require('cheerio');

const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSessions = {};

const ORDER_TEMPLATE_PATH = './order_template.php';
const { generateFormScriptsContent } = require('./form-scripts');
const messages = require('./messages.json');

/* ---------------------- TELEGRAM COMMAND MENU ---------------------- */
bot.telegram.setMyCommands([
    { command: 'land', description: 'Ленденги' },
    { command: 'preland', description: 'Прилендинги' },
    { command: 'prokla_land', description: 'Проклолендинги' },
    { command: 'edit_order', description: 'Изменить фйал ордер' },
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
                    [{ text: "/edit_order" }],
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

    const params = {};

    paramStr.split(/\r?\n/).forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) params[k.trim()] = decodeURIComponent(v.trim());
    });

    userSessions[userId] = { 
        type: 'landing', 
        waitParams: false, 
        params, 
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
            messages.prelandMessage,
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
    if (!match) return ctx.reply('⛔️ Неверный формат. Используйте: /preland key=value');

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
            messages.proklalandMessage,
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
        return ctx.reply('⛔️ Неверный формат. Отправьте параметры в виде: key=value и остальные параметры по строкам.');
    }

    const keyValueMatch = lines[0].match(/^([^=\s]+)=([^=\s]+)$/);
    if (!keyValueMatch) return ctx.reply('⛔️ Неверный формат первой строки. Используйте: /prokla_land\nkey=value\nkt=5\nmetka=1A\ncountry=RU\nlang=RU\nnumber_code=+7\nfunnel=PrimeAura\nsource=Prime-Aura.com\nlogs=0');

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

/* ------------------------ /edit_order ------------------------ */
bot.command('edit_order', (ctx) => {
    const userId = ctx.from.id;
    userSessions[userId] = {
        type: 'edit_order',
        waitFile: true,
        filePath: null,
        code: null
    };
    ctx.reply('Отправьте ваш файл order.php для редактирования.');
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
                "Параметры не обнаружены в caption. Прикрепите ZIP и укажите строку параметров в описании (caption), например:\n\nkt=45&metka=189A&country=DO&lang=ES&number_code=+1&funnel=PrimeAura&source=Prime-Aura.com&logs=0"
            );
        }

        const params = {};
        caption.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k && v) params[k] = decodeURIComponent(v);
        });

        session.params = params;
        session.waitParams = false;
        ctx.reply('Параметры получены из caption. Добавляю архив...');
    }

    if (session.type === 'prelanding' && session.waitPreParams) {
        if (!caption || !caption.includes('=')) {
            return ctx.reply(
                "Prelanding параметр не обнаружен в caption. Прикрепите ZIP и укажите в описании (caption): key=value"
            );
        }

        const m = caption.match(/^\s*([^=]+)=([^&\s]+)\s*$/);
        if (!m) {
            return ctx.reply('Неверный формат prelanding в caption. Используйте key=value');
        }

        session.prelandParam = { key: m[1], value: m[2] };
        session.waitPreParams = false;
        ctx.reply('Prelanding параметр получен из caption. Добавляю архив...');
    }

    if (session.type === 'landing' && !session.params) {
        return ctx.reply('Не могу обработать архив — параметры ещё не заданы. Используйте /land с параметрами или пришлите ZIP с caption содержащим параметры.');
    }

    if (session.type === 'prelanding' && !session.prelandParam) {
        return ctx.reply('Не могу обработать архив — prelanding параметр ещё не задан. Используйте /preland с параметром или пришлите ZIP с caption содержащим key=value.');
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
                return ctx.reply('Нет кода для сохранения. Сначала загрузите order.php');

            const latestCode = session.versions[session.versions.length - 1];
            const tmpFilePath = path.join(__dirname, `edited_order_${userId}.php`);
            fs.writeFileSync(tmpFilePath, latestCode, 'utf8');

            ctx.replyWithDocument({ source: tmpFilePath, filename: 'order.php' })
                .then(() => {
                    ctx.reply('Редактирование завершено.');
                    if (fs.existsSync(tmpFilePath)) {
                        fs.unlinkSync(tmpFilePath);
                    }
                    delete userSessions[userId];
                })
                .catch(err => {
                    console.error(err);
                    ctx.reply('Ошибка при отправке файла.');
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
        
        const rootFolder = entries[0].entryName.split('/')[0];
        const rootPath = path.join(tempDir, rootFolder);

        ['order.php', 'form-scripts.js'].forEach(f => {
            const p = path.join(rootPath, f);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        });

        if (session.type === 'landing' || session.type === 'prokla_land') {
            handleOrderAndScripts(session, rootPath);
        }

        const allFiles = fs.readdirSync(rootPath);
        for (const file of allFiles) {
            const filePath = path.join(rootPath, file);

            if (file.endsWith('index.html') || file.endsWith('.htm') || file.endsWith('index.php')) {
                let html = fs.readFileSync(filePath, 'utf8');
                const $ = cheerio.load(html, { xmlMode: false });

                // --- Land ---
                if (session.type === 'landing') {
                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css')
                        ) {
                            $(el).remove();
                        }
                    });
                    $('link[data-type="F1TFunnelSdkCss"]').remove();

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');
                        if (html.includes('.main-chat')) return;

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.min.js',
                            'lib.js',
                            'plgintlTel',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            '/aio-static/sdk/',
                            '/_cdn/production/landing-cdn/',
                            'time-scripts/main.js',
                            'bundle.umd.min.js',
                            './index/track.js'
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
                            src.includes('jquery.js')
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
                            html.includes('GTM-')
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
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
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
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();

                    $('form').each((i, form) => {
                        const $form = $(form);

                        if ($form.find('input[type="text"]').length === 1 &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length) {
                            return;
                        }

                        if ($form.find('input[type="text"]').length === 1 || $form.find('textarea').length === 1) {
                            return;
                        }

                        if (!$form.attr('action') || $form.attr('action').trim() === '') {
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
                                'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', 'form-first_name'
                            ];

                            if (firstNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'first_name');
                                name = 'first_name';
                                $input.attr('id', 'first_name');
                            }

                            const lastNameVariants = [
                                'lastName', 'lastname', 'lname', 'surname', 'secondname', 'fio', 'last_name', 'l_name', '1-last_name', 'form-last_name'
                            ];

                            if (lastNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'last_name');
                                name = 'last_name';
                                $input.attr('id', 'last_name');
                            }

                            const emailVariants = [
                                '1-email', 'form-email'
                            ];

                            if (emailVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'email');
                                name = 'email';
                                $input.attr('id', 'email');
                            }

                            const phoneVariants = [
                                'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number'
                            ];

                            if (phoneVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'phone');
                                name = 'phone';
                                $input.attr('id', 'phone');

                                $input.attr('type', 'tel');

                                $input.removeAttr('title');
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
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

                    const landingHead = require('./landing-head');
                    if ($('head').length) {
                        $('head').prepend(landingHead);
                    } else {
                        html = landingHead + html;
                    }

                    $('body').append(`\n<script src="intlTelInput.min.js"></script>`);
                    $('body').append(`\n<script src="form-scripts.js"></script>\n\n`);

                    $('body [href]').each((i, el) => {
                        const $el = $(el);
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

                    fs.writeFileSync(filePath, $.html());
                }

                if (session.type === 'prelanding') {
                    const prelandScriptPath = path.join(__dirname, 'preland-script.js');
                    const scriptContent = fs.readFileSync(prelandScriptPath, 'utf8');

                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css')
                        ) {
                            $(el).remove();
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.min.js',
                            'lib.js',
                            'plgintlTel',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            './index/track.js'
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
                            src.includes('jquery.js')
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
                            html.includes('window.aio.visit.fields.gl_gtag_id') ||
                            html.includes('gtag(') ||
                            html.includes('gtag("config"') ||
                            html.includes('aioDataLayer')
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
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('scrollTop') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form') ||
                            html.includes('window.aioBus') ||
                            html.includes('transliterate(') ||
                            html.includes('l_settings_fullname') ||
                            html.includes('celebrity_1') ||
                            html.includes('aio.landing') ||
                            html.includes('linkCounter') ||
                            html.includes('link_number') ||
                            html.includes('link_enumerate error') ||
                            html.includes('screen_resize') ||
                            html.includes('addEventListener("resize"')
                        ) {
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
                    });

                    $('noscript').remove();

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
                    // if (key && value) {
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
                
                if (session.type === 'prokla_land') {
                    $('link[rel="stylesheet"]').each((i, el) => {
                        const href = $(el).attr('href') || '';
                        if (
                            href.includes('intlTelInput.min.css') ||
                            href.includes('intlTelInput.css')
                        ) {
                            $(el).remove();
                        }
                    });

                    $('script').each((i, el) => {
                        const $el = $(el);
                        const src = $el.attr('src') || '';
                        const html = $el.html() || '';
                        const asyncAttr = $el.attr('async');

                        const removeFiles = [
                            'backfix.js',
                            'fbevents.js',
                            'auth.js',
                            'utils.js',
                            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js',
                            'vli6872tq8hqh810mp/uqv3y0lxc.js',
                            'intlTelInput.min.js',
                            'lib.js',
                            'plgintlTel',
                            'email-decode.min',
                            'uwt.js',
                            'track.js',
                            'translations.js',
                            '/aio-static/sdk/main.js',
                            './index/track.js'
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
                            src.includes('jquery.js')
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
                            html.includes('GTM-')
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
                            html.includes('history.pushState') ||
                            html.includes('vitBack') ||
                            html.includes('minfobiz') ||
                            html.includes('domonet') ||
                            html.includes('domonetka') ||
                            html.includes('IMask') ||
                            html.includes('x_order_form') ||
                            html.includes("on('submit', 'form'") ||
                            html.includes('order-in-progress__popup') ||
                            html.includes('leadprofit') ||
                            html.includes('initBacklink') ||
                            html.includes('land-form')
                        ) {
                            $el.remove();
                            return;
                        }

                        if (src.includes('form-scripts.js')) {
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
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();

                    $('form').each((i, form) => {
                        const $form = $(form);

                        if ($form.find('input[type="text"]').length === 1 &&
                            $form.find('input').length <= 3 &&
                            !$form.find('input[type="email"], input[type="tel"]').length) {
                            return;
                        }

                        if ($form.find('input[type="text"]').length === 1 || $form.find('textarea').length === 1) {
                            return;
                        }

                        if (!$form.attr('action') || $form.attr('action').trim() === '') {
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
                                'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', 'form-first_name'
                            ];

                            if (firstNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'first_name');
                                name = 'first_name';
                                $input.attr('id', 'first_name');
                            }

                            const lastNameVariants = [
                                'lastName', 'lastname', 'lname', 'surname', 'secondname', 'fio', 'last_name', 'l_name', '1-last_name', 'form-last_name'
                            ];

                            if (lastNameVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'last_name');
                                name = 'last_name';
                                $input.attr('id', 'last_name');
                            }

                            const emailVariants = [
                                '1-email', 'form-email'
                            ];

                            if (emailVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'email');
                                name = 'email';
                                $input.attr('id', 'email');
                            }

                            const phoneVariants = [
                                'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number'
                            ];

                            if (phoneVariants.includes(name.toLowerCase())) {
                                $input.attr('name', 'phone');
                                name = 'phone';
                                $input.attr('id', 'phone');

                                $input.attr('type', 'tel');

                                $input.removeAttr('title');
                                $input.removeAttr('pattern');
                                $input.removeAttr('value');
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

                    const landingHead = require('./landing-head');
                    if ($('head').length) {
                        $('head').prepend(landingHead);
                    } else {
                        html = landingHead + html;
                    }

                    $('body').append(`\n<script src="intlTelInput.min.js"></script>`);
                    $('body').append(`\n<script src="form-scripts.js"></script>\n\n`);

                    $('body [href]').each((i, el) => {
                        const $el = $(el);
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
                    // if (key && value) {
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
        let newFileName;
        if (session.type === 'landing') {
            newFileName = `Land_${rootFolder}${ext}`;
        } else if (session.type === 'prelanding') {
            newFileName = `Preland_${rootFolder}${ext}`;
        } else if (session.type === 'prokla_land') {
            newFileName = `Proklaland_${rootFolder}${ext}`;
        } else {
            newFileName = `Result_${rootFolder}${ext}`;
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
    }
}

/* ------------------------ FUNCTION TO ADD ORDER.PHP AND FORM-SCRIPTS.JS ------------------------ */
function handleOrderAndScripts(session, rootPath) {
    let orderContent = fs.readFileSync(ORDER_TEMPLATE_PATH, 'utf8');
    const p = session.params || {};
    const logsValue = p.logs && !isNaN(parseInt(p.logs)) ? parseInt(p.logs) : 0;

    // Replace template variables
    orderContent = orderContent
        .replace('{{kt}}', p.kt || '')
        .replace('{{metka}}', p.metka || '')
        .replace('{{country}}', p.country || '')
        .replace('{{lang}}', p.lang || '')
        .replace('{{number_code}}', p.number_code || '')
        .replace('{{funnel}}', p.funnel || '')
        .replace('{{source}}', p.source || '')
        .replace('{{logs}}', logsValue);

    // Write order.php
    fs.writeFileSync(path.join(rootPath, 'order.php'), orderContent);

    // Generate country and form-scripts.js
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
console.log('Bot is running...');