const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

module.exports = function guideCommand(bot) {
    bot.command('guide', async (ctx) => {
        try {
            await ctx.reply('📦 Подготавливаю файлы...');

            const tempDir = path.join(__dirname, '..', `guide_${ctx.from.id}_${Date.now()}`);
            fs.mkdirSync(tempDir, { recursive: true });

            const pdfPath = path.join(__dirname, '..', 'data', 'guide.pdf');
            if (fs.existsSync(pdfPath)) {
                fs.copyFileSync(pdfPath, path.join(tempDir, 'guide.pdf'));
            }

            const assetsDir = path.join(__dirname, '..', 'assets');
            if (fs.existsSync(assetsDir)) {
                const assetsDest = path.join(tempDir, 'assets');
                fs.mkdirSync(assetsDest, { recursive: true });
                
                const assetFiles = fs.readdirSync(assetsDir);
                assetFiles.forEach(file => {
                    const src = path.join(assetsDir, file);
                    const dest = path.join(assetsDest, file);
                    fs.copyFileSync(src, dest);
                });
            }

            const orderPath = path.join(__dirname, '..', 'api', 'order_template.php');
            if (fs.existsSync(orderPath)) {
                fs.copyFileSync(orderPath, path.join(tempDir, 'order.php'));
            }

            const { generateFormScriptsContent } = require('../scripts/form-scripts.js');
            const formScriptsContent = generateFormScriptsContent('RU');
            fs.writeFileSync(path.join(tempDir, 'form-scripts.js'), formScriptsContent);

            const zip = new AdmZip();
            zip.addLocalFolder(tempDir);
            
            const zipPath = path.join(__dirname, '..', `Guide_${Date.now()}.zip`);
            zip.writeZip(zipPath);

            await ctx.replyWithDocument(
                { source: zipPath, filename: 'Guide.zip' },
                { 
                    caption: 
                        '✅ Мануал и файлы для работы:\n\n' +
                        '📄 guide.pdf - инструкция\n' +
                        '📁 assets/ - необходимые файлы\n' +
                        '📝 order.php - шаблон order файла\n' +
                        '🔧 form-scripts.js - скрипты для форм'
                }
            );

            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            if (fs.existsSync(zipPath)) {
                fs.unlinkSync(zipPath);
            }

        } catch (err) {
            console.error('Error in /guide command:', err);
            await ctx.reply('❌ Ошибка при подготовке файлов. Попробуйте позже.');
        }
    });
};