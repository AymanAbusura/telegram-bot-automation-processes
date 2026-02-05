require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cheerio = require('cheerio');
const FormData = require('form-data');
const axios = require('axios');
const sharp = require('sharp');
const { URL } = require('url');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const app = express();

const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSessions = {};

const ORDER_TEMPLATE_PATH = './api/order_template.php';
const { generateFormScriptsContent } = require('./scripts/form-scripts.js');
const { generateFormHTML } = require('./scripts/form.js');
const getButtonHtml = require('./scripts/buttonTemplate.js');
const { FORM_TRANSLATIONS } = require('./scripts/form.js');
const funnelNames = require('./data/funnelNames.json');
const messages = require('./data/messages.json');
const loadCommands = require('./commands/index.js');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || "your_deepl_api_key_here";
const DEEPL_API_URL = 'https://api-free.deepl.com/v2'; // For PRO use: https://api.deepl.com/v2

// ==================== TELEGRAM COMMAND MENU ====================
bot.telegram.setMyCommands([
    { command: 'land', description: 'Ленденги' },
    { command: 'preland', description: 'Прилендинги' },
    { command: 'prokla_land', description: 'Проклолендинги' },
    { command: 'land_form', description: 'Добавить форму и настроить ленд' },
    { command: 'land_to_preland', description: 'Заменить форму на кнопку' },
    { command: 'edit_order', description: 'Изменить фйал ордер' },
    { command: 'order_antispam', description: 'Конвертировать старый order.php в новый антиспам order.php' },
    { command: 'phone', description: 'Коды телефонов стран' },
    { command: 'scripts', description: 'Скрипты для лендов [доментки и скрипты]' },
    { command: 'translate', description: 'Перевести HTML файл' },
    { command: 'compress', description: 'Сжать изображение' },
    { command: 'scrape', description: 'Скачать сайт' },
    { command: 'webtools', description: 'Полезные сайты' },
    { command: 'guide', description: 'Мануал по самостоятельной настройке лендинга' },
    { command: 'rules', description: 'Правила и требования для отправки архивов и ТЗ' },
    { command: 'bot_info', description: 'Информация о боте' }
]);

// ==================== CALL COMMANDS ====================
loadCommands(bot, {
    userSessions,
    messages
});

// ==================== START MENU CALLBACK HANDLER ====================
bot.action(/^cmd_(.+)$/, async (ctx) => {
    const command = ctx.match[1];
    
    try {
        await ctx.answerCbQuery();
        
        const commandContext = Object.create(ctx);
        commandContext.message = {
            message_id: ctx.callbackQuery.message.message_id,
            from: ctx.from,
            chat: ctx.chat,
            date: Math.floor(Date.now() / 1000),
            text: `/${command}`
        };
        
        const handlers = bot.context;
        
        switch(command) {
            case 'land':
            case 'preland':
            case 'prokla_land':
            case 'land_form':
            case 'land_to_preland':
            case 'edit_order':
            case 'order_antispam':
            case 'phone':
            case 'scripts':
            case 'translate':
            case 'compress':
            case 'scrape':
            case 'webtools':
            case 'guide':
            case 'rules':
            case 'bot_info':
                await bot.handleUpdate({
                    update_id: Date.now(),
                    message: {
                        message_id: Date.now(),
                        from: ctx.from,
                        chat: ctx.chat,
                        date: Math.floor(Date.now() / 1000),
                        text: `/${command}`,
                        entities: [{ type: 'bot_command', offset: 0, length: command.length + 1 }]
                    }
                });
                break;
            default:
                await ctx.reply('❌ Неизвестная команда.');
        }
        
    } catch (err) {
        console.error('Start menu callback error:', err);
        await ctx.reply('❌ Произошла ошибка. Попробуйте еще раз.');
    }
});

// ==================== FUNCTION TO DELETE FILES ====================
function deleteLandingFiles(rootPath) {
    const filesToDelete = [
        'index1.html', 'offer_index.html', 'videoPreview.webp', 'preview.webp', 
        'full_preview.webp', '_preview.png', '_preview.jpg', '_preview.png', 
        '_.html', '_-1.html', 'ywbackfix.js', 'flags@2x.png', 'flags.png',
        'intlTelInput.css', 'intlTelInput.min.js', 'utils.js', 'fbevents.js',
        'flags.webp', 'flags@2x.webp', 'web-vitals.js', 'surveys.js', 'dead-clicks-autocapture.js',
        'posthog-recorder.js', 'config.js', 'tr.txt', 'tracker.js', 'array.js'
    ];
    filesToDelete.forEach(fileName => {
        const fileToDelete = path.join(rootPath, fileName);
        if (fs.existsSync(fileToDelete)) {
            fs.unlinkSync(fileToDelete);
        }
    });

    const indexFolderNames = ['index', 'offer_index'];
    const filesToDeleteInIndex = [
        'order.php', 'form-scripts.js', 'action.php', 'jquery.min.js', 'index.html', '_.html',
        '_-1.html', 'index.php', 'flags.png', 'flags@2x.png', 'flags.webp', 'flags@2x.webp',
        'i18n.min.js', 'intlTelInput.css', 'intlTelInput.min.css', 'intlTelInput.min.js',
        'intlTelInput.js', 'utils.js', 'utils.min.js', 'main3.js',
        'tel.js', 'tm.js', 'track.js', 'backfix.js', 'fbevents.js', 'form_short.js', 'auth.js',
        'jquery-3.7.1.min.js', 'functions.js', 'jquery-migration-3.7.1.min.js',
        'lib.js', 'plgintlTel.js', 'validation.js', 'validate.js', 'email-decode.min.js',
        'uwt.js', 'translations.js', 'bundle.umd.min.js', 'loader.js', 'form.js',
        'validator.js', 'axios.min.js', 'app.js', 'jquery.maskedinput.min.js', 'polyfill.min.js',
        'handlers.js', 'con0.js', 'intlTelInputWithUtils.min.js', 'index-aGoeQGI3.js', 'ywbackfix.js', 'tracker.js'
    ];
    const leadTxtRegex = /^lead_.*\.txt$/;

    indexFolderNames.forEach(folderName => {
        const folderPath = path.join(rootPath, folderName);

        if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
            return;
        }

        const files = fs.readdirSync(folderPath);

        files.forEach(file => {
            const shouldDelete =
                filesToDeleteInIndex.includes(file) ||
                leadTxtRegex.test(file);

            if (shouldDelete) {
                const filePath = path.join(folderPath, file);
                if (fs.statSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
        });
    });

    const offerIndexPath = path.join(rootPath, 'offer_index');
    const indexPath = path.join(rootPath, 'index');

    if (
        fs.existsSync(indexPath) && fs.statSync(indexPath).isDirectory() &&
        fs.existsSync(offerIndexPath) && fs.statSync(offerIndexPath).isDirectory()
    ) {
        fs.rmSync(offerIndexPath, { recursive: true, force: true });
    }
}

// ==================== FUNCTION TO DELETE SCRIPTS ====================
function cleanScripts($) {
    $('script').each((i, el) => {
        const $el = $(el);
        const src = $el.attr('src') || '';
        const html = $el.html() || '';
        
        if (html.includes('.main-chat')) return;
        if (html.includes('#chatbox')) return;
        if (html.includes('updateTimer') && html.includes('countdown(')) return;
        
        const isDateScript =
            html.includes('getDate') ||
            html.includes('getMonth') ||
            html.includes('getFullYear') ||
            html.includes('dtime_nums(') ||  
            html.includes('dtime_time(') ||
            html.includes('timer');
        if (isDateScript) return;

        const isScrollAndLinkFixScript = (
            html.includes('link.href = link.href.replace(\'https:///\',') &&
            html.includes('maxScroll') &&
            html.includes('window.addEventListener("scroll"')
        );
        if (isScrollAndLinkFixScript) {
            $el.remove();
            return;
        }

        const patternsToRemove = [
            'history.pushState', 'vitBack', 'minfobiz', 'domonet', 'domonetka',
            'IMask', 'x_order_form', "on('submit', 'form'", 'on("submit", \'form\'',
            'on("submit", "form"', 'order-in-progress__popup', 'leadprofit',
            'initBacklink', 'land-form', '_signup_form', 'querySelectorAll("a")',
            'scrollIntoView', 'submit-btn', '.Hear-from-You-Form', 'patternSubid',
            'cleanedPad', '.subid', '.pad', 'uwt.js', 'window.aioBus',
            '.iti--allow-dropdown.iti--separate-dial-code', "'first_name', 'last_name'",
            '"first_name", "last_name"', 'getCookie(', 'setCookie(', 'showDuplicatePopup',
            'disableSubmit', 'rf-form__loader', 'input[type="email"]', 'input[name="email"]',
            'input[name="phone"]', 'user_phone_recent', 'user_phone_in_progress',
            'user_email_recent', 'getTemplate(', 'duplicate-email-popup', 'closePopup()',
            '$("body").on("submit"', "$('body').on('submit'", '$( "body" ).on( "submit"',
            "$( 'body' ).on( 'submit'", '$(document).on("submit"', "$(document).on('submit'",
            "$('a').click(function", '$("a").click(function', '[name=name]', '[name=phone]',
            "'[name=phone]'", '"[name=phone]"', 'Order is not accepted', 'You was ordering',
            'recently_confirmed', 'in_progress', 'duplicate_order_phone', 'order_in_progress',
            'order_recently_confirmed', '.offset().top', '.animate({scrollTop:',
            'input[type=submit]', 'href*="?"', 'new ValidateForm', 'cdn.taboola.com', 'tfa.js',
            'track.js', 'tracker.js', 'tracking.js', '__mrfCompass',
        ];

        if (patternsToRemove.some(pattern => html.includes(pattern))) {
            $el.remove();
            return;
        }

        if (
            src.includes('connect.facebook.net') ||
            src.includes('facebook.net/signals') ||
            html.includes('fbq(')
        ) {
            $el.remove();
            return;
        }

        if (
            html.includes('querySelectorAll(\'a[href*="?') ||
            html.includes('url.searchParams.set') ||
            html.includes('data-link-number') ||
            html.includes('linkCounter')
        ) {
            $el.remove();
            return;
        }

        const removeFiles = [
            'backfix.js', 'fbevents.js', 'auth.js', 'utils.js', 'utils.min.js',
            'jquery-3.7.1.min.js', 'bean-script.js', 'messages_es.min.js',
            'messages_fr.min.js', 'functions.js', 'intl-tel-input/17.0.8/js/utils.min.js',
            'ivl867tq2h8q/h18mp0quv3y0kzh57o.js', 'vli6872tq8hqh810mp/uqv3y0lxc.js',
            'intlTelInput.js', 'intlTelInput.min.js', 'jquery-migration-3.7.1.min.js',
            'lib.js', 'plgintlTel', 'validation.js', 'validate.js', 'email-decode.min',
            'uwt.js', 'track.js', 'translations.js', '/aio-static/sdk/main.js',
            '/aio-static/sdk/', '/_cdn/production/landing-cdn/', 'time-scripts/main.js',
            'bundle.umd.min.js', './index/track.js', 'loader.js', 'i18n.min.js',
            'form.js', 'validator.js', 'axios.min.js', 'app.js', 'jquery.maskedinput.min.js',
            'polyfill.min.js', 'handlers.js', 'con0.js', 'form_short.js', 'tm.js',
            'main3.js', 'tracking.js', 'tracker.js', './index/tracker.js', 'tel.js', './index/tel.js',
            'web-vitals.js', 'surveys.js', 'dead-clicks-autocapture.js', 'posthog-recorder.js', 'config.js'
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

        if (src.includes('minfobiz.online') || src.includes('form-scripts.js')) {
            $el.remove();
            return;
        }

        if (!src && (
            html.includes('offlink') ||
            /let\s+\w+\s*=\s*["'][?&][a-f0-9]{32}/.test(html) || 
            (html.includes('let') && html.includes('=') && html.includes('?') && html.includes('&'))
        )) {
            $el.remove();
            return;
        }


        if (/\.on\(\s*["']submit["']\s*,\s*['"]form['"]/.test(html) ||
            /(\$|jQuery)\(\s*["']a["']\s*\)\.click\s*\(/.test(html) ||
            /"\s*a,\s*button\s*"\)\.click\s*\(\s*function\s*\(e\)\s*\{\s*e\.preventDefault\(\)/.test(html) ||
            /let\s+screenResize\s*=\s*'';\s*if\s*\(screenResize !== 'yes'\)/.test(html)
        ) {
            $el.remove();
            return;
        }

        const removeInlinePatterns = ['ipapi.co', '_d', '_chk', 'vid'];
        if (!src && removeInlinePatterns.some(pattern => html.includes(pattern))) {
            $el.remove();
            return;
        }

        if ((html.includes('querySelectorAll(".form")') && html.includes('iti__selected-dial-code')) ||
            (html.includes('window.aioBus') && html.includes('aio.landing')) ||
            (!src && html.includes('googletag.cmd.push'))
        ) {
            $el.remove();
            return;
        }

        if (!src && html.trim() === '' && ($el.attr('async') || $el.attr('charset'))) {
            $el.remove();
            return;
        }

        if ($el.attr('data-cf-beacon') || html.includes('window.F1TFunnelsSdkConfig')) {
            $el.remove();
            return;
        }

        if (
            $el.attr('data-scrapbook-elem') ||
            html.includes('data-scrapbook-') ||
            html.includes('scrapbook-slot-index') ||
            (html.includes('shadowRoot') && html.includes('attachShadow'))
        ) {
            $el.remove();
            return;
        }
    });
}

// ==================== REPLACE FUNNEL NAMES ====================
function replaceFunnelNames(html, session) {
    const p = session.params || {};
    
    if (!p.funnel) {
        return html;
    }

    const sortedNames = [...funnelNames].sort((a, b) => b.length - a.length);
    
    const pattern = new RegExp(
        sortedNames
            .map(name => `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
            .join('|'),
        'gi'
    );

    return html.replace(pattern, p.funnel);
}

// ==================== PHOTO HANDLER ====================
bot.on('photo', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];
    
    if (!session || session.type !== 'compress' || !session.waitingForImage) {
        return;
    }
    
    try {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const fileId = photo.file_id;
        const file = await ctx.telegram.getFile(fileId);
        const fileSize = file.file_size;
        
        const url = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(url.href);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        if (!session.images) {
            session.images = [];
        }
        
        session.images.push({
            buffer: buffer,
            size: fileSize,
            format: 'jpg',
            fileName: `photo_${Date.now()}.jpg`,
            type: 'photo'
        });
        
    } catch (err) {
        console.error('Error processing photo:', err);
        await ctx.reply('❌ Ошибка при получении фото. Попробуйте еще раз.');
    }
});

// ==================== STICKER HANDLER ====================
bot.on('sticker', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];
    
    if (!session || session.type !== 'compress' || !session.waitingForImage) {
        return;
    }
    
    try {
        const sticker = ctx.message.sticker;
        const fileId = sticker.file_id;
        
        const file = await ctx.telegram.getFile(fileId);
        const fileSize = file.file_size;
        
        const url = await ctx.telegram.getFileLink(fileId);
        const response = await fetch(url.href);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        if (!session.images) {
            session.images = [];
        }
        
        session.images.push({
            buffer: buffer,
            size: fileSize,
            format: 'webp',
            fileName: `sticker_${Date.now()}.webp`,
            width: sticker.width,
            height: sticker.height,
            type: 'sticker'
        });
        
    } catch (err) {
        console.error('Error processing sticker:', err);
        await ctx.reply('❌ Ошибка при получении WebP стикера. Попробуйте еще раз.');
    }
});

// ==================== DOCUMENT HANDLING ====================
bot.on('document', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];

    // ============ COMPRESS HANDLER ============
    if (session && session.type === 'compress' && session.waitingForImage) {
        const fileName = ctx.message.document.file_name;
        const fileExt = path.extname(fileName).toLowerCase();
        
        const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tiff', '.tif'];
        
        if (!supportedFormats.includes(fileExt)) {
            return ctx.reply(
                '❌ Неподдерживаемый формат изображения.\n\n' +
                'Поддерживаемые форматы: JPG, PNG, WebP, AVIF, TIFF'
            );
        }
        
        try {
            const fileId = ctx.message.document.file_id;
            const fileSize = ctx.message.document.file_size;
            
            const url = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(url.href);
            const buffer = Buffer.from(await response.arrayBuffer());
            
            let format = fileExt.replace('.', '');
            if (format === 'jpeg') format = 'jpg';
            if (format === 'tif') format = 'tiff';
            
            session.images.push({
                buffer: buffer,
                size: fileSize,
                format: format,
                fileName: fileName,
                type: 'document'
            });
            
            await ctx.reply(
                `✅ Файл получен (${session.images.length})\n` +
                `📄 Имя: ${fileName}\n` +
                `📊 Размер: ${(fileSize / (1024 * 1024)).toFixed(2)} МБ\n` +
                `🎨 Формат: ${format.toUpperCase()}\n\n` +
                `Отправьте еще изображения или нажмите "🚀 Запустить обработку"`
            );
            
        } catch (err) {
            console.error('Error processing image document:', err);
            await ctx.reply('❌ Ошибка при получении изображения. Попробуйте еще раз.');
        }
        
        return;
    }

    // ============ EDIT ORDER HANDLER ============
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

            return ctx.reply(
                "✅ Файл получен. Какие параметры вы хотите изменить?\n" +
                "Вы можете менять: $box, $land_id, $partner_name\n" +
                "Пример:\n" + 
                "$box=91\n" + 
                "или\n" + 
                "$box=91, $land_id=123, $partner_name=PartnerName\n"
            );

        } catch (err) {
            console.error(err);
            return ctx.reply('❌ Ошибка при получении файла.');
        }
    }

    // ============ ORDER ANTISPAM HANDLER ============
    if (session && session.type === 'order_antispam' && session.waitFile) {
        const fileName = ctx.message.document.file_name;
        if (!fileName.endsWith('.php')) return ctx.reply('Отправьте файл с расширением .php');

        try {
            const fileId = ctx.message.document.file_id;
            const url = await ctx.telegram.getFileLink(fileId);
            const response = await fetch(url.href);
            const buffer = Buffer.from(await response.arrayBuffer());
            const code = buffer.toString('utf8');

            const { parseOldOrder, generateNewOrder } = require('./commands/order_antispam.js');

            const parsed = parseOldOrder(code);

            if (!parsed.kt || !parsed.metka) {
                delete userSessions[userId];
                return ctx.reply(
                    '❌ Не удалось распознать файл.\n\n' +
                    'Убедитесь что это старый order.php с переменными типа <code>$kt</code>, <code>$metka</code> и т.д.',
                    { parse_mode: 'HTML' }
                );
            }

            const newCode = generateNewOrder(parsed);

            let summary =
                `✅ Конвертация завершена!\n\n` +
                `📋 Перенесённые значения:\n` +
                `• kt = <code>${parsed.kt}</code>\n` +
                `• metka = <code>${parsed.metka}</code>\n` +
                `• country = <code>${parsed.country || '—'}</code>\n` +
                `• lang = <code>${parsed.lang || '—'}</code>\n` +
                `• number_code = <code>${parsed.number_code || '—'}</code>\n` +
                `• funnel = <code>${parsed.funnel || '—'}</code>\n` +
                `• source = <code>${parsed.source || '—'}</code>\n`;

            if (parsed.box)          summary += `• box = <code>${parsed.box}</code>\n`;
            if (parsed.land_id)      summary += `• land_id = <code>${parsed.land_id}</code>\n`;
            if (parsed.partner_name) summary += `• partner = <code>${parsed.partner_name}</code>\n`;

            summary +=
                `\n🔒 Антиспам включён:\n` +
                `• phone_checker → <code>1</code>\n` +
                `• email_checker → <code>1</code>\n` +
                `• ip_checker    → <code>1</code>`;

            const tmpPath = path.join(__dirname, `order_antispam_${userId}.php`);
            fs.writeFileSync(tmpPath, newCode, 'utf8');

            await ctx.replyWithDocument(
                { source: tmpPath, filename: 'order.php' },
                { caption: summary, parse_mode: 'HTML' }
            );

            fs.unlinkSync(tmpPath);
            delete userSessions[userId];

        } catch (err) {
            console.error('order_antispam error:', err);
            delete userSessions[userId];
            return ctx.reply('❌ Ошибка при обработке файла.');
        }

        return;
    }

    // ============ TRANSLATE HANDLER ============
    if (session && session.type === 'translate' && !session.waitLang) {
        const fileName = ctx.message.document.file_name;
        
        if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
            return ctx.reply('❌ Отправьте HTML файл (.html или .htm)');
        }

        try {
            await ctx.reply('⏳ Начинаю перевод файла...');

            const fileId = ctx.message.document.file_id;
            const url = await ctx.telegram.getFileLink(fileId);
            const buffer = Buffer.from(await (await fetch(url.href)).arrayBuffer());

            const tempFilePath = path.join(__dirname, `temp_translate_${userId}_${Date.now()}.html`);
            fs.writeFileSync(tempFilePath, buffer);

            const form = new FormData();
            form.append('file', fs.createReadStream(tempFilePath), fileName);
            form.append('target_lang', session.targetLang);
            form.append('formality', 'prefer_more');
            form.append('preserve_formatting', '1');

            const uploadResp = await axios.post(`${DEEPL_API_URL}/document`, form, {
                headers: {
                    ...form.getHeaders(),
                    Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                },
            });

            const { document_id, document_key } = uploadResp.data;

            let status = 'queued';
            let attempts = 0;
            const maxAttempts = 60;

            while (status !== 'done' && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 1500));

                const statusResp = await axios.get(`${DEEPL_API_URL}/document/${document_id}`, {
                    params: { document_key },
                    headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}` },
                });

                status = statusResp.data.status;
                attempts++;

                if (status === 'error') throw new Error('Ошибка перевода на стороне DeepL');
                if (attempts % 10 === 0) await ctx.reply(`⏳ Перевод в процессе... (${Math.floor(attempts * 1.5)}s)`);
            }

            if (status !== 'done') throw new Error('Превышено время ожидания перевода');

            const translatedResp = await axios.get(`${DEEPL_API_URL}/document/${document_id}/result`, {
                params: { document_key },
                headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}` },
                responseType: 'arraybuffer',
            });

            const translatedFilePath = path.join(__dirname, `translated_${session.targetLang}_${fileName}`);
            fs.writeFileSync(translatedFilePath, translatedResp.data);

            await ctx.replyWithDocument(
                { source: translatedFilePath, filename: `translated_${session.targetLang}_${fileName}` },
                { caption: `✅ Перевод завершен!\n🌍 Язык: ${session.targetLang}` }
            );

            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (fs.existsSync(translatedFilePath)) fs.unlinkSync(translatedFilePath);

            delete userSessions[userId];

        } catch (err) {
            console.error('Translation error:', err);
            let errorMessage = '❌ Ошибка при переводе файла.';
            if (err.response?.status === 403) errorMessage = '❌ Ошибка API ключа DeepL. Проверьте настройки.';
            else if (err.response?.status === 456) errorMessage = '❌ Превышена квота переводов DeepL API.';
            else if (err.message) errorMessage += `\n\nДетали: ${err.message}`;
            ctx.reply(errorMessage);

            fs.readdirSync(__dirname)
              .filter(f => f.startsWith(`temp_translate_${userId}`) || f.startsWith(`translated_${session.targetLang}`))
              .forEach(f => { try { fs.unlinkSync(path.join(__dirname, f)) } catch {} });
        }

        return;
    }

    if (['landing', 'prelanding', 'prokla_land', 'land_to_preland', 'land_form'].includes(session?.type)) {

        if (session.type === 'landing' && !session.params) {
            return ctx.reply('⚠️ Параметры не заданы. Используйте команду /land с параметрами.');
        }

        if (session.type === 'prelanding' && !session.prelandParam) {
            return ctx.reply('⚠️ Prelanding параметр не задан. Используйте команду /preland с параметром.');
        }

        if ((session.type === 'prokla_land' || session.type === 'land_to_preland' || session.type === 'land_form')
            && !session.params && !session.prelandParam && !session.marker) {
            return ctx.reply(`⚠️ Параметры не заданы для ${session.type}. Используйте соответствующую команду.`);
        }

        try {
            const fileId = ctx.message.document.file_id;
            const fileName = ctx.message.document.file_name;

            if (!fileName.toLowerCase().endsWith('.zip')) {
                return ctx.reply('⚠️ Пожалуйста, отправьте ZIP архив');
            }

            if (!session.archives) session.archives = [];
            session.archives.push({ fileId, fileName });

        } catch (err) {
            console.error(`Ошибка при сохранении архива для ${session.type}:`, err);
            ctx.reply('❌ Ошибка при сохранении архива.');
        }

        return;
    }

    return ctx.reply('⚠️ Неизвестный тип сессии. Сначала выберите команду /land, /preland, /prokla_land, /land_form или /land_to_preland');
});

// ==================== TEXT HANDLER ====================
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const session = userSessions[userId];
    if (!session) return;

    const text = ctx.message.text.trim();
    if (text.startsWith('/')) return;

    try {
        switch (session.type) {
            /* ==================== SCRAPE ==================== */
            case 'scrape': {
                if (!session.waitingForUrl) return;

                let targetUrl;
                try {
                    targetUrl = new URL(text);
                    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
                        return ctx.reply('❌ Поддерживаются только HTTP и HTTPS.');
                    }
                } catch {
                    return ctx.reply(
                        '❌ Неверный URL.\n\nПример:\nhttps://example.com'
                    );
                }

                session.waitingForUrl = false;

                const processingMsg = await ctx.reply('⏳ Начинаю скачивание сайта...');

                const tempDir = path.join(__dirname, `scrape_${userId}_${Date.now()}`);
                fs.mkdirSync(tempDir, { recursive: true });

                await downloadWebsite(targetUrl, tempDir, ctx, processingMsg);

                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    '📦 Создаю ZIP архив...'
                );

                const zip = new AdmZip();
                addDirectoryToZip(zip, tempDir, '');

                const hostname = targetUrl.hostname.replace(/[^a-z0-9]/gi, '_');
                const zipPath = path.join(__dirname, `${hostname}.zip`);
                zip.writeZip(zipPath);

                const sizeMB = fs.statSync(zipPath).size / (1024 * 1024);

                if (sizeMB > 50) {
                    await ctx.reply(`❌ Архив слишком большой (${sizeMB.toFixed(2)} МБ)`);
                } else {
                    await ctx.replyWithDocument({
                        source: zipPath,
                        filename: `${hostname}.zip`
                    });
                }

                fs.rmSync(tempDir, { recursive: true, force: true });
                fs.unlinkSync(zipPath);
                delete userSessions[userId];
                return;
            }

            /* ==================== EDIT ORDER ==================== */
            case 'edit_order': {
                if (session.waitFile) return;

                const changes = {};
                text.split(',').forEach(pair => {
                    const [key, value] = pair.split('=').map(s => s.trim());
                    if (key && value !== undefined) {
                        changes[key] = value.replace(/^['"]|['"]$/g, '');
                    }
                });

                if (!Object.keys(changes).length) {
                    return ctx.reply('❌ Формат неверный. Пример: $box=91');
                }

                const updatedCode = applyChangesToOrderPhp(session.code, changes);
                session.code = updatedCode;

                const tmpPath = path.join(__dirname, `order_${userId}.php`);
                fs.writeFileSync(tmpPath, updatedCode, 'utf8');

                await ctx.replyWithDocument({
                    source: tmpPath,
                    filename: 'order.php'
                });

                fs.unlinkSync(tmpPath);
                delete userSessions[userId];
                return;
            }

            /* ==================== FALLBACK ==================== */
            default:
                return;
        }

    } catch (err) {
        console.error('TEXT ROUTER ERROR:', err);
        ctx.reply('❌ Произошла ошибка при обработке сообщения.');
        delete userSessions[userId];
    }
});

// ==================== CALLBACK QUERY HANDLER ====================
bot.on('callback_query', async (ctx) => {
    const userId = ctx.from?.id;
    const data = ctx.callbackQuery.data;
    
    try {
        const data = ctx.callbackQuery.data;

        await ctx.answerCbQuery().catch(err => {
            console.log('Error answering callback query:', err.message);
        });

        // ==================== CANCEL COMPRESS ====================
        if (data === 'cancel_compress') {
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            } catch {}
            
            delete userSessions[userId];
            return ctx.reply('❌ Сжатие изображения отменено.');
        }
        
        // ==================== START COMPRESS BATCH ====================
        if (data === 'start_compress_batch') {
            const session = userSessions[userId];
            
            if (!session || session.type !== 'compress') {
                return ctx.reply('⚠️ Сессия истекла. Начните заново с команды /compress');
            }
            
            if (!session.images || session.images.length === 0) {
                return ctx.reply('❌ Сначала отправьте хотя бы одно изображение.');
            }
            
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
                
                const totalSize = session.images.reduce((sum, img) => sum + img.size, 0);
                const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                
                await ctx.reply(
                    `📊 Получено изображений: ${session.images.length}\n` +
                    `📦 Общий размер: ${totalSizeMB} МБ\n\n` +
                    `Выберите качество сжатия для всех изображений:`,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: '🟢 Высокое (90%)', callback_data: 'compress_batch_quality_90' },
                                    { text: '🟡 Среднее (75%)', callback_data: 'compress_batch_quality_75' }
                                ],
                                [
                                    { text: '🟠 Низкое (60%)', callback_data: 'compress_batch_quality_60' },
                                    { text: '🔴 Очень низкое (40%)', callback_data: 'compress_batch_quality_40' }
                                ],
                                [
                                    { text: '❌ Отмена', callback_data: 'cancel_compress' }
                                ]
                            ]
                        }
                    }
                );
            } catch (err) {
                console.error('Error in start_compress_batch:', err);
                await ctx.reply('❌ Ошибка. Попробуйте еще раз.');
                delete userSessions[userId];
            }
            
            return;
        }
        
        // ==================== COMPRESS BATCH QUALITY SELECTION ====================
        if (data.startsWith('compress_batch_quality_')) {
            const quality = parseInt(data.replace('compress_batch_quality_', ''));
            const session = userSessions[userId];
            
            if (!session || session.type !== 'compress' || !session.images || session.images.length === 0) {
                return ctx.reply('⚠️ Сессия истекла. Начните заново с команды /compress');
            }
            
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
                await ctx.reply(`⏳ Начинаю сжатие ${session.images.length} изображений с качеством ${quality}%...`);
                
                let successCount = 0;
                let errorCount = 0;
                
                for (let i = 0; i < session.images.length; i++) {
                    const image = session.images[i];
                    
                    try {
                        let sharpInstance = sharp(image.buffer);
                        const metadata = await sharpInstance.metadata();
                        
                        let compressedBuffer;
                        const format = image.format;
                        
                        if (format === 'jpg' || format === 'jpeg') {
                            compressedBuffer = await sharpInstance
                                .jpeg({ quality: quality, mozjpeg: true })
                                .toBuffer();
                        } else if (format === 'png') {
                            compressedBuffer = await sharpInstance
                                .png({ 
                                    quality: quality,
                                    compressionLevel: 9,
                                    adaptiveFiltering: true
                                })
                                .toBuffer();
                        } else if (format === 'webp') {
                            compressedBuffer = await sharpInstance
                                .webp({ 
                                    quality: quality,
                                    effort: 6,
                                    lossless: false
                                })
                                .toBuffer();
                        } else if (format === 'avif') {
                            compressedBuffer = await sharpInstance
                                .avif({ 
                                    quality: quality,
                                    effort: 5
                                })
                                .toBuffer();
                        } else if (format === 'tiff') {
                            compressedBuffer = await sharpInstance
                                .tiff({ 
                                    quality: quality,
                                    compression: 'jpeg'
                                })
                                .toBuffer();
                        } else {
                            compressedBuffer = await sharpInstance
                                .jpeg({ quality: quality, mozjpeg: true })
                                .toBuffer();
                        }
                        
                        const compressedSize = compressedBuffer.length;
                        const reduction = ((1 - compressedSize / image.size) * 100).toFixed(1);
                        
                        const baseName = path.basename(image.fileName, path.extname(image.fileName));
                        const newFileName = `${baseName}.${format}`;
                        const tempFilePath = path.join(__dirname, `temp_compress_${userId}_${i}_${Date.now()}.${format}`);
                        
                        fs.writeFileSync(tempFilePath, compressedBuffer);
                        
                        await ctx.replyWithDocument(
                            { source: tempFilePath, filename: newFileName },
                            {
                                caption: 
                                    `✅ ${i + 1}/${session.images.length}: ${image.fileName}\n` +
                                    `📊 ${(image.size / (1024 * 1024)).toFixed(2)} МБ → ${(compressedSize / (1024 * 1024)).toFixed(2)} МБ\n` +
                                    `💾 Уменьшение: ${reduction}%\n` +
                                    `📐 ${metadata.width}x${metadata.height}`
                            }
                        );
                        
                        if (fs.existsSync(tempFilePath)) {
                            fs.unlinkSync(tempFilePath);
                        }
                        
                        successCount++;
                        
                    } catch (err) {
                        errorCount++;
                        console.error(`Error compressing image ${i + 1}:`, err);
                        await ctx.reply(`❌ Ошибка при сжатии: ${image.fileName}`);
                    }
                }
                
                await ctx.reply(
                    `🎉 Обработка завершена!\n\n` +
                    `✅ Успешно: ${successCount}\n` +
                    `❌ Ошибок: ${errorCount}\n` +
                    `📊 Всего: ${session.images.length}`
                );
                
                delete userSessions[userId];
                
            } catch (err) {
                console.error('Error in batch compression:', err);
                await ctx.reply('❌ Ошибка при пакетном сжатии. Попробуйте еще раз.');
                delete userSessions[userId];
            }
            
            return;
        }
        
        // ==================== COMPRESS PHOTO CONTINUE (Legacy - removed) ====================
        if (data.startsWith('compress_quality_')) {
            const quality = parseInt(data.replace('compress_quality_', ''));
            const session = userSessions[userId];
            
            if (!session || session.type !== 'compress' || !session.originalBuffer) {
                return ctx.reply('⚠️ Сессия истекла. Начните заново с команды /compress');
            }
            
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
                await ctx.reply(`⏳ Сжимаю изображение с качеством ${quality}%...`);
                
                const format = session.originalFormat || 'jpg';
                
                console.log(`Compressing image: format=${format}, quality=${quality}, size=${session.originalSize}`);
                
                let sharpInstance = sharp(session.originalBuffer);
                
                const metadata = await sharpInstance.metadata();
                
                console.log(`Image metadata:`, {
                    format: metadata.format,
                    width: metadata.width,
                    height: metadata.height,
                    space: metadata.space,
                    channels: metadata.channels,
                    hasAlpha: metadata.hasAlpha
                });
                
                let compressedBuffer;
                
                if (format === 'jpg' || format === 'jpeg') {
                    compressedBuffer = await sharpInstance
                        .jpeg({ quality: quality, mozjpeg: true })
                        .toBuffer();
                } else if (format === 'png') {
                    compressedBuffer = await sharpInstance
                        .png({ 
                            quality: quality,
                            compressionLevel: 9,
                            adaptiveFiltering: true
                        })
                        .toBuffer();
                } else if (format === 'webp') {
                    compressedBuffer = await sharpInstance
                        .webp({ 
                            quality: quality,
                            effort: 6,
                            lossless: false
                        })
                        .toBuffer();
                } else if (format === 'avif') {
                    compressedBuffer = await sharpInstance
                        .avif({ 
                            quality: quality,
                            effort: 5
                        })
                        .toBuffer();
                } else if (format === 'tiff') {
                    compressedBuffer = await sharpInstance
                        .tiff({ 
                            quality: quality,
                            compression: 'jpeg'
                        })
                        .toBuffer();
                } else {
                    compressedBuffer = await sharpInstance
                        .jpeg({ quality: quality, mozjpeg: true })
                        .toBuffer();
                }
                
                console.log(`Compression complete: originalSize=${session.originalSize}, compressedSize=${compressedBuffer.length}`);
                
                const compressedSize = compressedBuffer.length;
                const originalSizeMB = (session.originalSize / (1024 * 1024)).toFixed(2);
                const compressedSizeMB = (compressedSize / (1024 * 1024)).toFixed(2);
                const reduction = ((1 - compressedSize / session.originalSize) * 100).toFixed(1);
                
                const timestamp = Date.now();
                const originalName = session.originalFileName || 'image';
                const baseName = path.basename(originalName, path.extname(originalName));
                const newFileName = `${baseName}_compressed_${quality}.${format}`;
                const tempFilePath = path.join(__dirname, `temp_compress_${userId}_${timestamp}.${format}`);
                
                fs.writeFileSync(tempFilePath, compressedBuffer);
                
                await ctx.replyWithDocument(
                    { source: tempFilePath, filename: newFileName },
                    {
                        caption: 
                            `✅ Сжатие завершено!\n\n` +
                            `📊 Оригинал: ${originalSizeMB} МБ\n` +
                            `📉 Сжатый: ${compressedSizeMB} МБ\n` +
                            `💾 Уменьшение: ${reduction}%\n` +
                            `🎨 Качество: ${quality}%\n` +
                            `📐 Разрешение: ${metadata.width}x${metadata.height}`
                    }
                );
                
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
                
                delete userSessions[userId];
                
            } catch (err) {
                console.error('Error compressing image:', err);
                console.error('Error details:', {
                    message: err.message,
                    stack: err.stack,
                    format: session.originalFormat,
                    quality: quality
                });
                
                let errorMsg = '❌ Ошибка при сжатии изображения.';
                
                if (err.message && err.message.includes('webp')) {
                    errorMsg += '\n\n⚠️ Проблема с форматом WebP. Попробуйте:\n' +
                               '1. Конвертировать в PNG или JPG\n' +
                               '2. Или отправить другой WebP файл';
                } else if (err.message) {
                    errorMsg += `\n\nДетали: ${err.message}`;
                }
                
                await ctx.reply(errorMsg);
                delete userSessions[userId];
            }
            
            return;
        }

        // ==================== EDIT ORDER ====================
        if (data === 'process_edit') {
            try {
                await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
            } catch {}

            const session = userSessions[userId];
            if (!session || session.type !== 'edit_order') {
                return ctx.reply('⚠️ Сессия редактирования не найдена.');
            }

            if (!session.versions || session.versions.length === 0) {
                return ctx.reply('❌ Нет изменений для сохранения.');
            }

            try {
                const latestCode = session.versions[session.versions.length - 1];
                const tmpFilePath = path.join(__dirname, `edited_order_${userId}.php`);

                fs.writeFileSync(tmpFilePath, latestCode, 'utf8');

                await ctx.replyWithDocument(
                    { source: tmpFilePath, filename: 'order.php' },
                    { caption: '✅ Редактирование завершено.' }
                );

                if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
                delete userSessions[userId];

            } catch (err) {
                console.error(err);
                ctx.reply('❌ Ошибка при финализации файла.');
            }

            return;
        }

        // ==================== SCRIPTS CALLBACKS ====================
        if (data === 'cobeklo_simple') {
            const cobekloSimple = `<?php if ($_GET["cobeklo"] != "777") { echo '<script> window.location.replace("https://www.google.com/"); document.location.href="https://www.google.com/" </script>'; exit; } ?>`;

            return ctx.reply(
                `📌 Cobeklo (без Fuckoff):\n\`\`\`\n${cobekloSimple}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }
        
        if (data === 'cobeklo_rawclick') {
            const cobekloRawClick =
`<?php if (!isset($rawClick)){ echo 'Fuck off!'; exit(); } ?>
<?php if ($_GET["cobeklo"] != "777") { echo '<script> window.location.replace("https://www.google.com/"); document.location.href="https://www.google.com/" </script>'; exit; } ?>
<?php setcookie("FBpixel", $_GET["fbpixel"], time()+60*60*24); ?>`;

            return ctx.reply(
                `📌 Cobeklo (с Fuckoff):\n\`\`\`\n${cobekloRawClick}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }

        if (data === 'luckyfeed') {
            const luckyFeedHead =
                `<script src="//static.bestgonews.com/m1sh81qh8/ivl867tq2h8q/h18mp0quv3y0kzh57o.js"></script>`;
            const luckyFeedBody =
                `<script>window.initBacklink("https://webechoesoftoday.com/product?stream_uuid=113a3774-a4c9-44d2-bcab-08719d22814b&subid2=METKA")</script>`;

            return ctx.reply(
                `📌 Код для LuckyFeed:\n\n` +
                `🟦 Вставьте перед </head>:\n\`\`\`\n${luckyFeedHead}\n\`\`\`\n\n` +
                `🟩 Вставьте перед </body>:\n\`\`\`\n${luckyFeedBody}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }

        if (data === 'newsprofit') {
            const newsProfitFull =
                `<script src="https://mixer-events.com/back.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
    window.vitBack("https://mixer-events.com/new?utm_campaign=53978&utm_source=[SID]&sid7=METKA&utm_medium=4840", true);
});
</script>`;

            return ctx.reply(
                `📌 Код для newsProfit (OneProfit):\n\n🟩 Вставьте перед </body>:\n\`\`\`\n${newsProfitFull}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }
        
        if (data === 'date') {
            return ctx.reply(
                `📌 <b>Код для Date_Script</b>\n\n` +
                `🟦 <b>Вставьте перед &lt;/head&gt;:</b>\n` +
                `<pre><code>&lt;script&gt;
var appendNull=function(t){return t&lt;10?0+t.toString():t};
function dtime_nums(t){
    d=new Date,
    p=new Date(d.getTime()+864e5*(t+1)),
    monthb="01,02,03,04,05,06,07,08,09,10,11,12".split(","),
    document.write(
        appendNull(p.getDate())+"."+monthb[p.getMonth()]+"."+p.getFullYear()
    )
}
&lt;/script&gt;</code></pre>\n\n` +
        `📍 <b>Используйте в нужном месте на странице:</b>\n` +
        `<pre><code>&lt;script&gt;dtime_nums(-1)&lt;/script&gt;</code></pre>`,
                { parse_mode: "HTML" }
            );
        }

        if (data === 'timer') {
            const timerScriptBody = `<script type="text/javascript">
start_timer();
var time = 600;
var intr;

function start_timer() {
    intr = setInterval(tick, 1000);
}

function tick() {
    time = time - 1;
    var mins = Math.floor(time / 60);
    var secs = time - mins * 60;

    if (mins == 0 && secs == 0) {
        clearInterval(intr);
    }

    secs = secs >= 10 ? secs : "0" + secs;
    $("#min").html("0" + mins);
    $("#sec").html(secs);
}
</script>`;

            const timerHtml = `<div id="min" class="countdown__item minute">10</div><span>:</span><div id="sec" class="countdown__item second">00</div>`;

            return ctx.reply(
                `📌 Код для таймера:\n\n` +
                `🟦 Вставьте перед </body>:\n` +
                `\`\`\`html\n${timerScriptBody}\n\`\`\`\n\n` +
                `📍 Используйте в нужном месте на странице:\n` +
                `\`\`\`html\n${timerHtml}\n\`\`\``,
                { parse_mode: "Markdown" }
            );
        }
        // ==================== LANDING / PRELAND / PROKLA / FORM CALLBACKS ====================
        const session = userSessions[userId];
        if (!session) return ctx.reply('⚠️ Сначала выберите команду /land, /preland, /prokla_land или /land_form');

        const allowedCallbacks = {
            process_land_archives: 'landing',
            process_preland_archives: 'prelanding',
            process_prokla_land_archives: 'prokla_land',
            process_land_form_archives: 'land_form',
            process_land_to_preland_archives: 'land_to_preland'
        };

        const expectedType = allowedCallbacks[data];
        if (!expectedType || session.type !== expectedType) {
            return ctx.reply('⚠️ Эта кнопка не соответствует вашей текущей сессии.');
        }

        if (!session.archives || session.archives.length === 0) {
            return ctx.reply('❌ Сначала отправьте хотя бы один ZIP архив, затем нажмите кнопку.');
        }

        if (session.processingMultiple) {
            return ctx.reply('⏳ Обработка уже запущена.');
        }

        session.processingMultiple = true;

        try {
            await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        } catch {}

        await ctx.reply(`⏳ Начинаю обработку ${session.archives.length} архива(ов)...`);

        const processedFiles = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < session.archives.length; i++) {
            const archive = session.archives[i];

            try {
                const resultFile = await processArchive(archive, session, userId, ctx);

                if (!resultFile || resultFile.skipped) {
                    await ctx.reply(`⚠️ Маркер "${session.marker || session.prelandParam?.key}" не найден в файле ${archive.fileName}. Файл не обработан.`);
                    errorCount++;
                    continue;
                }

                processedFiles.push(resultFile);

                let retries = 3;
                let sent = false;
                
                while (retries > 0 && !sent) {
                    try {
                        await ctx.replyWithDocument(
                            { source: resultFile.path, filename: resultFile.name },
                            { 
                                request_timeout: 120000
                            }
                        );
                        sent = true;
                        successCount++;
                    } catch (sendErr) {
                        retries--;
                        if (retries > 0) {
                            console.log(`Retry sending ${resultFile.name}, attempts left: ${retries}`);
                            await sleep(2000);
                        } else {
                            throw sendErr;
                        }
                    }
                }

            } catch (err) {
                errorCount++;
                console.error(`Ошибка обработки ${archive.fileName}:`, err);
                if (err?.response?.description?.includes('file is too big')) {
                    await ctx.reply(`⚠️ Архив ${archive.fileName} должен быть меньше 20 МБ`);
                } else if (err?.message?.includes('timed out') || err?.message?.includes('Promise timed out')) {
                    await ctx.reply(`❌ Тайм-аут при обработке ${archive.fileName}. Проверьте интернет-соединение.`);
                } else {
                    await ctx.reply(`❌ Ошибка при обработке ${archive.fileName}: ${err.message}`);
                }
            }
        }

        processedFiles.forEach(file => {
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (cleanupErr) {
                console.error(`Failed to delete ${file.path}:`, cleanupErr);
            }
        });

        try {
            const tempFiles = fs.readdirSync(__dirname).filter(file => 
                file.startsWith(`temp_${userId}_`) || 
                file.startsWith(`Land_`) ||
                file.startsWith(`Preland_`) ||
                file.startsWith(`Proklaland_`) ||
                file.startsWith(`LandForm_`) ||
                file.startsWith(`LandToPreland_`)
            );
            
            tempFiles.forEach(file => {
                const filePath = path.join(__dirname, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (stats.isDirectory()) {
                        fs.rmSync(filePath, { recursive: true, force: true });
                        console.log(`Deleted temp directory: ${filePath}`);
                    } else {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted temp file: ${filePath}`);
                    }
                } catch (err) {
                    console.error(`Failed to clean up ${filePath}:`, err);
                }
            });
        } catch (listErr) {
            console.error('Failed to list temp files:', listErr);
        }

        if (successCount > 0) {
            await ctx.reply(`✅ Готово! Обработано ${processedFiles.length} из ${session.archives.length} архивов.`);
        } else {
            await ctx.reply(`❌ Обработка не выполнена. Все ${session.archives.length} архивов завершились с ошибкой.`);
        }

        delete userSessions[userId];

    } catch (error) {
        console.error('Callback query error:', error);
        
        if (userId) {
            try {
                const tempPattern = new RegExp(`temp_${userId}_`);
                const resultPattern = /^(Land_|Preland_|Proklaland_|LandForm_|LandToPreland_)/;
                
                fs.readdirSync(__dirname).forEach(file => {
                    if (tempPattern.test(file) || resultPattern.test(file)) {
                        const filePath = path.join(__dirname, file);
                        try {
                            const stats = fs.statSync(filePath);
                            if (stats.isDirectory()) {
                                fs.rmSync(filePath, { recursive: true, force: true });
                            } else {
                                fs.unlinkSync(filePath);
                            }
                            console.log(`Cleanup after error: ${filePath}`);
                        } catch {}
                    }
                });
            } catch (cleanupErr) {
                console.error('Error during cleanup:', cleanupErr);
            }
        }
        
        try {
            await ctx.reply('❌ Произошла ошибка при обработке. Временные файлы очищены.');
        } catch (replyErr) {
            console.error('Failed to send error message:', replyErr);
        }
        
        if (userId && userSessions[userId]) {
            userSessions[userId].processingMultiple = false;
        }
    }
});

bot.catch(async (err, ctx) => {
    console.error('Global bot error:', err);
    
    const isTimeout = err.message?.includes('timeout') || 
                      err.code === 'ETIMEDOUT' ||
                      err.name === 'TimeoutError';
    
    const userId = ctx?.from?.id;
    
    if (userId) {
        try {
            const tempPattern = new RegExp(`temp_${userId}_`);
            const resultPattern = /^(Land_|Preland_|Proklaland_|LandForm_|LandToPreland_)/;
            
            fs.readdirSync(__dirname).forEach(file => {
                if (tempPattern.test(file) || resultPattern.test(file)) {
                    const filePath = path.join(__dirname, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (stats.isDirectory()) {
                            fs.rmSync(filePath, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(filePath);
                        }
                    } catch {}
                }
            });
        } catch {}
    }
    
    if (!isTimeout) {
        try {
            ctx.reply('❌ Произошла техническая ошибка. Пожалуйста, попробуйте снова.').catch(() => {});
        } catch {}
    }
});

// ==================== ARCHIVE PROCESSING FUNCTION ====================
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

        ['order.php', 'form-scripts.js', 'offer_index.html', 'form_script2081.js'].forEach(f => {
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
                    if (doctypeIndex !== -1) {
                        html = html.substring(doctypeIndex);
                    } else {
                        const htmlIndex = html.search(/<html\b[^>]*>/i);
                        if (htmlIndex !== -1) {
                            html = html.substring(htmlIndex);
                        }
                    }

                    html = replaceFunnelNames(html, session);
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
                        let styleContent = $(el).html() || '';
                        
                        if (styleContent.includes('.rf-form__loader')) {
                            styleContent = styleContent.replace(/\.rf-form__loader\s*::before\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\.rf-form__loader\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/@keyframes\s+rf-spin\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\s*\}\s*/g, '');
                            
                            const cleanedContent = styleContent.trim();
                            
                            if (!cleanedContent || cleanedContent.length === 0) {
                                $(el).remove();
                            } else {
                                $(el).html(styleContent);
                            }
                        }
                    });

                    $('style').each(function() {
                        const styleContent = $(this).html();
                        if (styleContent.includes('input.failed-input') || styleContent.includes('.input_error')) {
                            $(this).remove();
                        }
                    });

                    $('style').each(function () {
                        const css = $(this).html();
                        if (css && css.includes('.custom__country-label')) {
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

                    cleanScripts($);

                    $('[data-scrapbook-shadowdom]').remove();
                    $('[data-scrapbook-elem]').remove();
                    $('*').each(function() {
                        const tagName = this.tagName?.toLowerCase();
                        if (tagName && tagName.includes('-')) {
                            const $el = $(this);
                            if ($el.attr('data-scrapbook-shadowdom') || 
                                $el.attr('data-scrapbook-elem') ||
                                $el.html()?.includes('data-scrapbook-')) {
                                $el.remove();
                            }
                        }
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();
                    $('body .rf-form__loader1.js-rf-loader1').remove();
                    
                    $('body #loading').remove();
                    $('body .custom-form__mask').remove();

                    const userLang = (session.params?.lang || 'EN').toUpperCase();
                    const T = FORM_TRANSLATIONS[userLang] || FORM_TRANSLATIONS['EN'];
                    
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
                        $form.find('.intgrtn-input-message-error').remove();

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

                        $form.find('.iti-aio').each(function () {
                            const $itiAio = $(this);
                            const $phoneInput = $itiAio.find('input[type="tel"], input[name="phone"], input[id*="phone"]');
                            
                            if ($phoneInput.length) {
                                $phoneInput.insertBefore($itiAio);
                            }
                            $itiAio.remove();
                        });

                        $form.find('.phone__input').each(function () {
                            const $wrapper = $(this);
                            const $phoneInput = $wrapper.find('input[name="phone"], input[id="phone"], input[id="phone_raw"], input[type="tel"], input[data-intl-tel-input-id]');

                            if ($phoneInput.length) {
                                $phoneInput.insertBefore($wrapper);
                            }
                            $wrapper.remove();
                        });

                        $form.find('.custom__country-dropdown').each(function () {
                            const $dropdown = $(this);
                            const $input = $dropdown.find('input[name="phone"], input[id="phone"], input[id="phone_raw"], input[type="tel"], input[data-intl-tel-input-id]');

                            if ($input.length) {
                                $input.insertBefore($dropdown);
                            }

                            $dropdown.remove();
                        });

                        $form.find('.aio-sdk-input-container').each(function () {
                            const $container = $(this);

                            const $input = $container.find(
                                'input[name="phone"], input[type="tel"], input[data-intl-tel-input-id]'
                            );

                            if ($input.length) {
                                $container.empty();
                                $container.append($input);
                            }
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

                        $form.find('input[type="hidden"]').not('[name="querys"]').remove();

                        const sub1 = `<input type="hidden" name="sub1" value="{subid}">`;
                        const ip   = `<input type="hidden" name="ip" value="{ip}">`;
                        const pc   = `<input type="hidden" name="pc" value="<?=$_GET['scroll'];?>">`;
                        const loaderDiv = `<div class="rf-form__loader js-rf-loader" style="display: none;"></div>`;

                        $form.prepend(`\n\n${sub1}\n${ip}\n${pc}\n\n${loaderDiv}`);

                        $form.find('input:not([type="hidden"])').each((j, input) => {
                            const $input = $(input);

                            let name = $input.attr('name') || '';
                            let id = $input.attr('id') || '';

                            if (name.toLowerCase() === 'fio') {
                                const allVisibleInputs = $form.find('input:not([type="hidden"])');
                                const currentIndex = allVisibleInputs.index($input);
                                
                                if (currentIndex === 0) {
                                    $input.attr('name', 'first_name');
                                    name = 'first_name';
                                    $input.attr('id', 'first_name');
                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                } else {
                                    $input.attr('name', 'last_name');
                                    name = 'last_name';
                                    $input.attr('id', 'last_name');
                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                }
                            } else {

                                const firstNameVariants = [
                                    'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', '2-first_name', 'form-first_name', 'name', 'drfname'
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
                                    'lastName', 'lastname', 'lname', 'surname', 'secondname', 'last_name', 'l_name', '1-last_name', '2-last_name', 'form-last_name', 'last', 'drlname'
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
                                    '1-email', '2-email', 'form-email', 'email', 'solrka', 'sendingmail', 'dremail'
                                ];

                                if (emailVariants.includes(name.toLowerCase())) {
                                    $input.attr('name', 'email');
                                    name = 'email';

                                    $input.attr('id', 'email');
                                    $input.attr('type', 'email');

                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                }

                                const phoneVariants = [
                                    'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number', 'phone1', 'search2', 'phone-num', '1-phone', '2-phone'
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
                            }

                            if ($input.attr('type') !== 'submit' && $input.attr('type') !== 'checkbox' && !$input.attr('data-validation-status')) {
                                $input.attr('data-validation-status', 'inactive');
                            }

                            $input.nextAll('.input_error').remove();

                            let errorText = '';
                            switch ($input.attr('name')) {
                                case 'first_name':
                                    errorText = T.err_first;
                                    break;
                                case 'last_name':
                                    errorText = T.err_last;
                                    break;
                                case 'email':
                                    errorText = T.err_email;
                                    break;
                                case 'phone':
                                    errorText = T.err_phone;
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

                    $('input[type="hidden"]').each(function() {
                        if ($(this).closest('form').length === 0) {
                            $(this).remove();
                        }
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

                    deleteLandingFiles(rootPath);

                    const ASSETS_DIR = path.join(__dirname, 'assets');
                    if (fs.existsSync(ASSETS_DIR)) {
                        const assetFiles = fs.readdirSync(ASSETS_DIR);
                        assetFiles.forEach(file => {
                            const src = path.join(ASSETS_DIR, file);
                            const dest = path.join(rootPath, file);
                            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                        });
                    }

                    const landingHead = require('./scripts/landing-head.js');
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
                        const onclickVal = $(this).attr('onclick');

                        if (!onclickVal || !onclickVal.includes('func()')) {
                            $(this).removeAttr('onclick');
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
                        let styleContent = $(el).html() || '';
                        
                        if (styleContent.includes('.rf-form__loader')) {
                            styleContent = styleContent.replace(/\.rf-form__loader\s*::before\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\.rf-form__loader\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/@keyframes\s+rf-spin\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\s*\}\s*/g, '');
                            
                            const cleanedContent = styleContent.trim();
                            
                            if (!cleanedContent || cleanedContent.length === 0) {
                                $(el).remove();
                            } else {
                                $(el).html(styleContent);
                            }
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

                    cleanScripts($);

                    $('[data-scrapbook-shadowdom]').remove();
                    $('[data-scrapbook-elem]').remove();
                    $('*').each(function() {
                        const tagName = this.tagName?.toLowerCase();
                        if (tagName && tagName.includes('-')) {
                            const $el = $(this);
                            if ($el.attr('data-scrapbook-shadowdom') || 
                                $el.attr('data-scrapbook-elem') ||
                                $el.html()?.includes('data-scrapbook-')) {
                                $el.remove();
                            }
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
                        const onclickVal = $(this).attr('onclick');

                        if (!onclickVal || !onclickVal.includes('func()')) {
                            $(this).removeAttr('onclick');
                        }
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

                    deleteLandingFiles(rootPath);

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
                        let styleContent = $(el).html() || '';
                        
                        if (styleContent.includes('.rf-form__loader')) {
                            styleContent = styleContent.replace(/\.rf-form__loader\s*::before\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\.rf-form__loader\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/@keyframes\s+rf-spin\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\s*\}\s*/g, '');
                            
                            const cleanedContent = styleContent.trim();
                            
                            if (!cleanedContent || cleanedContent.length === 0) {
                                $(el).remove();
                            } else {
                                $(el).html(styleContent);
                            }
                        }
                    });

                    $('style').each(function() {
                        const styleContent = $(this).html();
                        if (styleContent.includes('input.failed-input') || styleContent.includes('.input_error')) {
                            $(this).remove();
                        }
                    });

                    $('style').each(function () {
                        const css = $(this).html();
                        if (css && css.includes('.custom__country-label')) {
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

                    cleanScripts($);
                    
                    $('[data-scrapbook-shadowdom]').remove();
                    $('[data-scrapbook-elem]').remove();
                    $('*').each(function() {
                        const tagName = this.tagName?.toLowerCase();
                        if (tagName && tagName.includes('-')) {
                            const $el = $(this);
                            if ($el.attr('data-scrapbook-shadowdom') || 
                                $el.attr('data-scrapbook-elem') ||
                                $el.html()?.includes('data-scrapbook-')) {
                                $el.remove();
                            }
                        }
                    });

                    $('noscript').remove();

                    $('body .rf-form__loader.js-rf-loader').remove();
                    $('body .rf-form__loader1.js-rf-loader1').remove();

                    const userLang = (session.params?.lang || 'EN').toUpperCase();
                    const T = FORM_TRANSLATIONS[userLang] || FORM_TRANSLATIONS['EN'];

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
                        $form.find('.intgrtn-input-message-error').remove();

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

                        $form.find('.iti-aio').each(function () {
                            const $itiAio = $(this);
                            const $phoneInput = $itiAio.find('input[type="tel"], input[name="phone"], input[id*="phone"]');
                            
                            if ($phoneInput.length) {
                                $phoneInput.insertBefore($itiAio);
                            }
                            $itiAio.remove();
                        });

                        $form.find('.phone__input').each(function () {
                            const $wrapper = $(this);
                            const $phoneInput = $wrapper.find('input[name="phone"], input[id="phone"], input[id="phone_raw"], input[type="tel"], input[data-intl-tel-input-id]');

                            if ($phoneInput.length) {
                                $phoneInput.insertBefore($wrapper);
                            }
                            $wrapper.remove();
                        });

                        $form.find('.custom__country-dropdown').each(function () {
                            const $dropdown = $(this);
                            const $input = $dropdown.find('input[name="phone"], input[id="phone"], input[id="phone_raw"], input[type="tel"], input[data-intl-tel-input-id]');

                            if ($input.length) {
                                $input.insertBefore($dropdown);
                            }

                            $dropdown.remove();
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

                            if (name.toLowerCase() === 'fio') {
                                const allVisibleInputs = $form.find('input:not([type="hidden"])');
                                const currentIndex = allVisibleInputs.index($input);
                                
                                if (currentIndex === 0) {
                                    $input.attr('name', 'first_name');
                                    name = 'first_name';
                                    $input.attr('id', 'first_name');
                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                } else {
                                    $input.attr('name', 'last_name');
                                    name = 'last_name';
                                    $input.attr('id', 'last_name');
                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                }
                            } else {

                                const firstNameVariants = [
                                    'firstName', 'firstname', 'fname', 'first_name', 'first', 'f_name', '1-first_name', '2-first_name', 'form-first_name', 'name', 'drfname'
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
                                    'lastName', 'lastname', 'lname', 'surname', 'secondname', 'last_name', 'l_name', '1-last_name', '2-last_name', 'form-last_name', 'last', 'drlname'
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
                                    '1-email', '2-email', 'form-email', 'email', 'solrka', 'sendingmail', 'dremail'
                                ];

                                if (emailVariants.includes(name.toLowerCase())) {
                                    $input.attr('name', 'email');
                                    name = 'email';

                                    $input.attr('id', 'email');
                                    $input.attr('type', 'email');

                                    $input.removeAttr('pattern');
                                    $input.removeAttr('value');
                                    $input.removeAttr('title');
                                    $input.removeAttr('data-input');
                                    $input.removeAttr('data-valid');
                                }

                                const phoneVariants = [
                                    'phone_visible', 'dphone', 'phone_raw', 'phonevisible', 'phone', 'mobile', 'telek', 'phone_number', 'fullphone', 'form-phone_number', 'phone1', 'search2', 'phone-num', '1-phone', '2-phone'
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
                            }

                            if ($input.attr('type') !== 'submit' && $input.attr('type') !== 'checkbox' && !$input.attr('data-validation-status')) {
                                $input.attr('data-validation-status', 'inactive');
                            }

                            $input.nextAll('.input_error').remove();

                            let errorText = '';
                            switch ($input.attr('name')) {
                                case 'first_name':
                                    errorText = T.err_first;
                                    break;
                                case 'last_name':
                                    errorText = T.err_last;
                                    break;
                                case 'email':
                                    errorText = T.err_email;
                                    break;
                                case 'phone':
                                    errorText = T.err_phone;
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

                    $('input[type="hidden"]').each(function() {
                        if ($(this).closest('form').length === 0) {
                            $(this).remove();
                        }
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

                    deleteLandingFiles(rootPath);

                    const ASSETS_DIR = path.join(__dirname, 'assets');
                    if (fs.existsSync(ASSETS_DIR)) {
                        const assetFiles = fs.readdirSync(ASSETS_DIR);
                        assetFiles.forEach(file => {
                            const src = path.join(ASSETS_DIR, file);
                            const dest = path.join(rootPath, file);
                            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                        });
                    }

                    const landingHead = require('./scripts/landing-head.js');
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
                        const onclickVal = $(this).attr('onclick');

                        if (!onclickVal || !onclickVal.includes('func()')) {
                            $(this).removeAttr('onclick');
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

                /* ------------------------ LAND TO PRELAND ------------------------ */
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
                        let styleContent = $(el).html() || '';
                        
                        if (styleContent.includes('.rf-form__loader')) {
                            styleContent = styleContent.replace(/\.rf-form__loader\s*::before\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\.rf-form__loader\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/@keyframes\s+rf-spin\s*\{[\s\S]*?\}/g, '');
                            
                            styleContent = styleContent.replace(/\s*\}\s*/g, '');
                            
                            const cleanedContent = styleContent.trim();
                            
                            if (!cleanedContent || cleanedContent.length === 0) {
                                $(el).remove();
                            } else {
                                $(el).html(styleContent);
                            }
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

                    cleanScripts($);

                    $('[data-scrapbook-shadowdom]').remove();
                    $('[data-scrapbook-elem]').remove();
                    $('*').each(function() {
                        const tagName = this.tagName?.toLowerCase();
                        if (tagName && tagName.includes('-')) {
                            const $el = $(this);
                            if ($el.attr('data-scrapbook-shadowdom') || 
                                $el.attr('data-scrapbook-elem') ||
                                $el.html()?.includes('data-scrapbook-')) {
                                $el.remove();
                            }
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
                        const onclickVal = $(this).attr('onclick');

                        if (!onclickVal || !onclickVal.includes('func()')) {
                            $(this).removeAttr('onclick');
                        }
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

                    deleteLandingFiles(rootPath);

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
                        if (doctypeIndex !== -1) {
                            html = html.substring(doctypeIndex);
                        } else {
                            const htmlIndex = html.search(/<html\b[^>]*>/i);
                            if (htmlIndex !== -1) {
                                html = html.substring(htmlIndex);
                            }
                        }

                        html = replaceFunnelNames(html, session);

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

                            cleanScripts($);

                            $('[data-scrapbook-shadowdom]').remove();
                            $('[data-scrapbook-elem]').remove();
                            $('*').each(function() {
                                const tagName = this.tagName?.toLowerCase();
                                if (tagName && tagName.includes('-')) {
                                    const $el = $(this);
                                    if ($el.attr('data-scrapbook-shadowdom') || 
                                        $el.attr('data-scrapbook-elem') ||
                                        $el.html()?.includes('data-scrapbook-')) {
                                        $el.remove();
                                    }
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

                            deleteLandingFiles(rootPath);

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

                            const landingHead = require('./scripts/landing-head.js');
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

// ==================== FUNCTION TO ADD ORDER.PHP AND FORM-SCRIPTS.JS ====================
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

// ==================== FUNCTION TO APPLY CHANGES FOR EDIT ORDER COMMAND ====================
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

// ==================== MAIN DOWNLOAD ====================
async function downloadWebsite(url, outputDir, ctx, processingMsg) {
    const downloadedUrls = new Set();
    const resources = [];

    const mainHtml = await downloadHtml(url.href, outputDir, resources, downloadedUrls);
    if (!mainHtml) throw new Error('Не удалось загрузить главную страницу');

    let processed = 0;
    const total = resources.length;

    for (const resource of resources) {
        if (downloadedUrls.has(resource.url)) continue;

        try {
            if (resource.type === 'css') {
                await downloadCssAndExtractResources(resource.url, outputDir, resources, downloadedUrls);
            } else {
                await downloadResource(resource.url, outputDir);
            }
            downloadedUrls.add(resource.url);
            processed++;

            if (processed % 10 === 0 || processed === total) {
                try {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        processingMsg.message_id,
                        null,
                        `⏳ Скачивание ресурсов... (${processed}/${total})`
                    );
                } catch {}
            }
        } catch (err) {
            console.error(`Failed to download resource: ${resource.url}`, err.message);
        }
    }
}

// ==================== DOWNLOAD HTML ====================
async function downloadHtml(url, outputDir, resources, downloadedUrls) {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // CSS
        $('link[rel="stylesheet"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) resources.push({ url: resolveUrl(href, url), type: 'css' });
        });

        // JS
        $('script[src]').each((i, el) => {
            const src = $(el).attr('src');
            if (src) resources.push({ url: resolveUrl(src, url), type: 'js' });
        });

        // IMG
        $('img[src]').each((i, el) => {
            const src = $(el).attr('src');
            if (src) resources.push({ url: resolveUrl(src, url), type: 'img' });
        });

        // inline style backgrounds
        $('[style*="background"]').each((i, el) => {
            const style = $(el).attr('style');
            const matches = style.match(/url\(['"]?([^'")]+)['"]?\)/g);
            if (matches) {
                matches.forEach(m => {
                    const match = m.match(/url\(['"]?([^'")]+)['"]?\)/);
                    if (match && match[1]) resources.push({ url: resolveUrl(match[1], url), type: 'img' });
                });
            }
        });

        // favicon
        $('link[rel~="icon"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) resources.push({ url: resolveUrl(href, url), type: 'img' });
        });

        // Save HTML
        const parsedUrl = new URL(url);
        let filename = parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname;
        filename = filename.split('/').filter(Boolean).join('_');
        if (!filename) filename = 'index.html';
        if (!filename.endsWith('.html') && !filename.endsWith('.htm')) filename += '.html';

        const filepath = path.join(outputDir, filename);
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
        fs.writeFileSync(filepath, html, 'utf8');

        downloadedUrls.add(url);
        return html;

    } catch (err) {
        console.error(`Failed to download HTML: ${url}`, err.message);
        return null;
    }
}

// ==================== DOWNLOAD RESOURCE ====================
async function downloadResource(url, outputDir) {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            responseType: 'arraybuffer',
            maxRedirects: 5,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        const filename = parts.pop() || 'file';

        let dir = outputDir;
        for (const part of parts) {
            dir = path.join(dir, part.replace(/[^a-z0-9_\-\.]/gi, '_'));
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(path.join(dir, filename.replace(/[^a-z0-9_\-\.]/gi, '_')), response.data);

    } catch (err) {
        console.error(`Failed to download resource: ${url}`, err.message);
    }
}

// ==================== PARSE CSS ====================
async function downloadCssAndExtractResources(cssUrl, outputDir, resources, downloadedUrls) {
    try {
        const response = await axios.get(cssUrl, {
            responseType: 'text',
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const cssContent = response.data;

        await saveResource(cssUrl, cssContent, outputDir);

        const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
        let match;
        while ((match = urlRegex.exec(cssContent)) !== null) {
            const assetUrl = match[1];
            if (assetUrl.startsWith('data:')) continue;
            const resolved = resolveUrl(assetUrl, cssUrl);
            if (!downloadedUrls.has(resolved)) resources.push({ url: resolved, type: 'asset' });
        }

    } catch (err) {
        console.error(`Failed to process CSS: ${cssUrl}`, err.message);
    }
}

// ==================== SAVE RESOURCE ====================
async function saveResource(url, data, outputDir) {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const filename = parts.pop() || 'file';

    let dir = outputDir;
    for (const part of parts) {
        dir = path.join(dir, part);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(path.join(dir, filename), data);
}

// ==================== RESOLVE URL ====================
function resolveUrl(href, baseUrl) {
    try {
        if (href.startsWith('http://') || href.startsWith('https://')) return href;

        if (href.startsWith('//')) {
            const base = new URL(baseUrl);
            return `${base.protocol}${href}`;
        }

        if (href.startsWith('/')) {
            const base = new URL(baseUrl);
            return `${base.protocol}//${base.host}${href}`;
        }

        const base = new URL(baseUrl);
        return new URL(href, base).href;

    } catch (err) {
        return href;
    }
}

// ==================== ZIP ====================
function addDirectoryToZip(zip, dirPath, zipPath) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const fileZipPath = path.join(zipPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            addDirectoryToZip(zip, filePath, fileZipPath);
        } else {
            zip.addLocalFile(filePath, zipPath);
        }
    });
}

bot.launch();

const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));