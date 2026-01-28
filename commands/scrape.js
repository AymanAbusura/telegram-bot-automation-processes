const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { URL } = require('url');

module.exports = function scrapeCommand(bot, deps) {
    const { userSessions } = deps;

    bot.command('scrape', (ctx) => {
        const userId = ctx.from.id;

        userSessions[userId] = {
            type: 'scrape',
            waitingForUrl: true
        };

        return ctx.reply(
            '🌐 <b>Web Scraper</b>\n\n' +
            'Отправьте URL сайта, который хотите скачать.\n\n' +
            '<b>Пример:</b>\n' +
            'https://example.com\n\n' +
            '<i>⚠️ Бот скачает HTML, CSS, JS, изображения и другие ресурсы.</i>',
            { parse_mode: 'HTML' }
        );
    });

    bot.on('text', async (ctx) => {
        const userId = ctx.from.id;
        const session = userSessions[userId];

        if (!session || session.type !== 'scrape' || !session.waitingForUrl) {
            return;
        }

        const urlText = ctx.message.text.trim();

        let targetUrl;
        try {
            targetUrl = new URL(urlText);
            
            if (!['http:', 'https:'].includes(targetUrl.protocol)) {
                return ctx.reply('❌ Поддерживаются только HTTP и HTTPS протоколы.');
            }
        } catch (err) {
            return ctx.reply(
                '❌ Неверный URL.\n\n' +
                'Убедитесь, что URL начинается с http:// или https://\n\n' +
                '<b>Пример:</b> https://example.com',
                { parse_mode: 'HTML' }
            );
        }

        session.waitingForUrl = false;

        const processingMsg = await ctx.reply('⏳ Начинаю скачивание сайта...');

        try {
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
            const zipFileName = `${hostname}.zip`;
            const zipFilePath = path.join(__dirname, zipFileName);

            zip.writeZip(zipFilePath);

            const stats = fs.statSync(zipFilePath);
            const fileSizeMB = stats.size / (1024 * 1024);

            if (fileSizeMB > 50) {
                await ctx.telegram.editMessageText(
                    ctx.chat.id,
                    processingMsg.message_id,
                    null,
                    `❌ Архив слишком большой (${fileSizeMB.toFixed(2)} МБ).\n\n` +
                    `Telegram ограничивает размер файлов до 50 МБ.`
                );
            } else {
                await ctx.replyWithDocument(
                    { source: zipFilePath, filename: zipFileName },
                    {
                        caption:
                            `✅ <b>Сайт успешно скачан!</b>\n\n` +
                            `🌐 URL: <code>${targetUrl.href}</code>\n` +
                            `📦 Размер: ${fileSizeMB.toFixed(2)} МБ`,
                        parse_mode: 'HTML'
                    }
                );

                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            }

            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            if (fs.existsSync(zipFilePath)) {
                fs.unlinkSync(zipFilePath);
            }

            delete userSessions[userId];

        } catch (err) {
            console.error('Scraping error:', err);

            await ctx.telegram.editMessageText(
                ctx.chat.id,
                processingMsg.message_id,
                null,
                `❌ Ошибка при скачивании сайта.\n\n` +
                `Детали: ${err.message}`
            );

            const tempDir = path.join(__dirname, `scrape_${userId}_${Date.now()}`);
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }

            delete userSessions[userId];
        }
    });
};

// ==================== Download website with all resources ====================
async function downloadWebsite(url, outputDir, ctx, processingMsg) {
    const baseUrl = `${url.protocol}//${url.host}`;
    const downloadedUrls = new Set();
    const urlQueue = [url.href];
    const resources = [];

    const mainHtml = await downloadHtml(url.href, outputDir, baseUrl, resources, downloadedUrls);

    if (!mainHtml) {
        throw new Error('Не удалось загрузить главную страницу');
    }

    let processed = 0;
    const total = resources.length;

    for (const resource of resources) {
        if (downloadedUrls.has(resource.url)) continue;

        try {
            await downloadResource(resource.url, outputDir, baseUrl);
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
                } catch (e) {
                }
            }
        } catch (err) {
            console.error(`Failed to download resource: ${resource.url}`, err.message);
        }
    }
}

// ==================== Download HTML page and extract resources ====================
async function downloadHtml(url, outputDir, baseUrl, resources, downloadedUrls) {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);

        $('link[rel="stylesheet"]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
                const resourceUrl = resolveUrl(href, url);
                resources.push({ url: resourceUrl, type: 'css' });
            }
        });

        $('script[src]').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                const resourceUrl = resolveUrl(src, url);
                resources.push({ url: resourceUrl, type: 'js' });
            }
        });

        $('img[src]').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                const resourceUrl = resolveUrl(src, url);
                resources.push({ url: resourceUrl, type: 'img' });
            }
        });

        $('[style*="background"]').each((i, elem) => {
            const style = $(elem).attr('style');
            const matches = style.match(/url\(['"]?([^'"\\)]+)['"]?\)/g);
            if (matches) {
                matches.forEach(match => {
                    const urlMatch = match.match(/url\(['"]?([^'"\\)]+)['"]?\)/);
                    if (urlMatch && urlMatch[1]) {
                        const resourceUrl = resolveUrl(urlMatch[1], url);
                        resources.push({ url: resourceUrl, type: 'img' });
                    }
                });
            }
        });

        const parsedUrl = new URL(url);
        let filename = parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname;
        
        filename = filename.split('/').filter(Boolean).join('_');
        if (!filename) filename = 'index.html';
        if (!filename.endsWith('.html') && !filename.endsWith('.htm')) {
            filename += '.html';
        }

        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, html, 'utf8');

        downloadedUrls.add(url);

        return html;

    } catch (err) {
        console.error(`Failed to download HTML: ${url}`, err.message);
        return null;
    }
}

// ==================== Download a resource (CSS, JS, image, etc.) ====================
async function downloadResource(url, outputDir, baseUrl) {
    try {
        const response = await axios.get(url, {
            timeout: 30000,
            responseType: 'arraybuffer',
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const parsedUrl = new URL(url);
        let filepath = parsedUrl.pathname;

        const pathParts = filepath.split('/').filter(Boolean);
        const filename = pathParts.pop() || 'file';
        
        let currentDir = outputDir;
        for (const part of pathParts) {
            currentDir = path.join(currentDir, part.replace(/[^a-z0-9_\-\.]/gi, '_'));
            if (!fs.existsSync(currentDir)) {
                fs.mkdirSync(currentDir, { recursive: true });
            }
        }

        const fullPath = path.join(currentDir, filename.replace(/[^a-z0-9_\-\.]/gi, '_'));

        fs.writeFileSync(fullPath, response.data);

    } catch (err) {
        console.error(`Failed to download resource: ${url}`, err.message);
    }
}

// ==================== Resolve relative URLs to absolute ====================
function resolveUrl(href, baseUrl) {
    try {
        if (href.startsWith('http://') || href.startsWith('https://')) {
            return href;
        }

        if (href.startsWith('//')) {
            const base = new URL(baseUrl);
            return `${base.protocol}${href}`;
        }

        if (href.startsWith('/')) {
            const base = new URL(baseUrl);
            return `${base.protocol}//${base.host}${href}`;
        }

        const base = new URL(baseUrl);
        const basePath = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
        return `${base.protocol}//${base.host}${basePath}${href}`;

    } catch (err) {
        return href;
    }
}

// ==================== Recursively add directory to ZIP ====================
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