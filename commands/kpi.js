const { google } = require('googleapis');
const path = require('path');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Месяц';

const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, '../google-credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

/* ==================== Get current month in Russian ==================== */
function getCurrentMonth() {
    const monthIndex = new Date().getMonth();
    return MONTHS[monthIndex];
}

/* ==================== Get current day of month ==================== */
function getCurrentDay() {
    return new Date().getDate();
}

/* ==================== Convert day number to column letter (1=B, 2=C, etc.) ==================== */
function dayToColumn(day) {
    const columnIndex = day + 1;
    let column = '';
    let num = columnIndex;
    
    while (num > 0) {
        const remainder = (num - 1) % 26;
        column = String.fromCharCode(65 + remainder) + column;
        num = Math.floor((num - 1) / 26);
    }
    
    return column;
}

/* ==================== Get current month name from sheet ==================== */
async function getCurrentMonthFromSheet() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A1`,
        });
        
        return response.data.values?.[0]?.[0] || getCurrentMonth();
    } catch (error) {
        console.error('Error getting current month from sheet:', error);
        return getCurrentMonth();
    }
}
/* ==================== Get value for a specific day ==================== */
async function getDayValue(day) {
    try {
        const column = dayToColumn(day);
        const range = `${SHEET_NAME}!${column}5`;
        
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: range,
        });
        
        const value = response.data.values?.[0]?.[0];
        return value === '-' || value === '' || value === undefined ? 0 : (parseInt(value) || 0);
    } catch (error) {
        console.error('Error getting day value:', error);
        return 0;
    }
}

/* ==================== Update value for a specific day ==================== */
async function updateDayValue(day, newValue) {
    try {
        const column = dayToColumn(day);
        const range = `${SHEET_NAME}!${column}5`;
        
        await sheets.spreadsheets.values.update({
            spreadsheetId: SHEET_ID,
            range: range,
            valueInputOption: 'RAW',
            resource: {
                values: [[newValue === 0 ? '-' : newValue]]
            }
        });
        
        return { success: true };
    } catch (error) {
        console.error('Error updating day value:', error);
        return { error: 'Ошибка при обновлении данных' };
    }
}

/* ==================== Get month statistics ==================== */
async function getMonthStats() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!B5:AF5`,
        });
        
        const values = response.data.values?.[0] || [];
        let total = 0;
        let daysWorked = 0;
        
        values.forEach(val => {
            if (val && val !== '-' && val !== '') {
                const num = parseInt(val);
                if (!isNaN(num)) {
                    total += num;
                    daysWorked++;
                }
            }
        });
        
        return {
            total,
            daysWorked,
            average: daysWorked > 0 ? (total / daysWorked).toFixed(1) : 0
        };
    } catch (error) {
        console.error('Error getting month stats:', error);
        return { total: 0, daysWorked: 0, average: 0 };
    }
}

/* ==================== Get total from summary sheet ==================== */
async function getTotalStats() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: 'Итого за все годы!A5:F5',
        });
        
        const values = response.data.values?.[0] || [];
        
        return {
            period: 'Итого за 2022-2026',
            setup: parseInt(values[1]) || 0
        };
    } catch (error) {
        console.error('Error getting total stats:', error);
        return null;
    }
}

/* ==================== Get week view (last 7 days) ==================== */
async function getWeekView() {
    try {
        const today = getCurrentDay();
        const days = [];
        
        for (let i = Math.max(1, today - 6); i <= today; i++) {
            const value = await getDayValue(i);
            days.push({ day: i, value });
        }
        
        return days;
    } catch (error) {
        console.error('Error getting week view:', error);
        return [];
    }
}

/* ==================== Store helper functions globally for access from text handler ==================== */
global.kpiHelpers = {
    getDayValue,
    updateDayValue
};

module.exports = function kpiCommand(bot, deps) {
    const { userSessions } = deps;

    /* ==================== Main kpi command ==================== */
    bot.command('kpi', async (ctx) => {
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📊 Просмотр', callback_data: 'kpi_view' },
                    { text: '✏️ Редактировать', callback_data: 'kpi_edit' }
                ]
            ]
        };

        await ctx.reply(
            '📈 *KPI Управление*\n\n' +
            'Выберите действие:',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );
    });

    /* ==================== View KPI callback ==================== */
    bot.action('kpi_view', async (ctx) => {
        await ctx.answerCbQuery();

        try {
            const currentMonth = await getCurrentMonthFromSheet();
            const today = getCurrentDay();
            const todayValue = await getDayValue(today);
            const monthStats = await getMonthStats();
            const totalStats = await getTotalStats();
            const weekDays = await getWeekView();

            let message = `📊 *KPI Статистика*\n\n`;
            message += `📅 *${currentMonth}*\n`;
            message += `━━━━━━━━━━━━━━━\n`;
            message += `📍 Сегодня (${today} число): *${todayValue === 0 ? '-' : todayValue}*\n\n`;
            
            message += `📈 *Последние 7 дней:*\n`;
            weekDays.forEach(({ day, value }) => {
                const marker = day === today ? '▸' : ' ';
                const displayDay = day.toString().padStart(2, '0');
                const displayValue = value === 0 ? '-' : value;
                message += `${marker} ${displayDay}/${currentMonth.slice(0, 3)}: ${displayValue}\n`;
            });
            
            message += `\n━━━━━━━━━━━━━━━\n`;
            message += `📊 *Статистика месяца:*\n`;
            message += `📦 Всего настроек: ${monthStats.total}\n`;

            if (totalStats) {
                message += `\n━━━━━━━━━━━━━━━\n`;
                message += `🏆 *${totalStats.period}*\n`;
                message += `📊 Итого настроек: ${totalStats.setup}\n`;
            }

            await ctx.editMessageText(message, {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🔙 Назад', callback_data: 'kpi_back' }]
                    ]
                }
            });
        } catch (error) {
            console.error('KPI View Error:', error);
            await ctx.reply('❌ Ошибка при получении данных');
        }
    });

    /* ==================== Edit KPI callback - SIMPLIFIED ==================== */
    bot.action('kpi_edit', async (ctx) => {
        await ctx.answerCbQuery();

        try {
            const currentMonth = await getCurrentMonthFromSheet();
            const today = getCurrentDay();
            const currentValue = await getDayValue(today);

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '✏️ Свое значение', callback_data: 'kpi_custom' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'kpi_back' }
                    ]
                ]
            };

            await ctx.editMessageText(
                `✏️ *Редактирование KPI*\n\n` +
                `📅 ${currentMonth}, ${today} число\n` +
                `⚙️ Текущее значение: *${currentValue === 0 ? 'Не заполнено' : currentValue}*\n\n` +
                `Введите новое значение:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        } catch (error) {
            console.error('KPI Edit Error:', error);
            await ctx.reply('❌ Ошибка при загрузке данных');
        }
    });

    /* ==================== Set specific value (0-10) - Keep these for add mode ==================== */
    for (let i = 0; i <= 10; i++) {
        bot.action(`kpi_set_${i}`, async (ctx) => {
            await ctx.answerCbQuery('⏳ Обновление...');

            try {
                const today = getCurrentDay();
                const oldValue = await getDayValue(today);
                const result = await updateDayValue(today, i);

                if (result.error) {
                    return ctx.reply(`❌ ${result.error}`);
                }

                const currentMonth = await getCurrentMonthFromSheet();

                await ctx.editMessageText(
                    `✅ *Данные обновлены!*\n\n` +
                    `📅 ${currentMonth}, ${today} число\n` +
                    `⚙️ Настройка: ${oldValue === 0 ? '-' : oldValue} → *${i === 0 ? 'Выходной' : i}*`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📊 Статистика', callback_data: 'kpi_view' }],
                                [{ text: '🔙 К редактированию', callback_data: 'kpi_edit' }],
                                [{ text: '🏠 Главное меню', callback_data: 'kpi_back' }]
                            ]
                        }
                    }
                );
            } catch (error) {
                console.error('KPI Set Error:', error);
                await ctx.reply('❌ Ошибка при обновлении данных');
            }
        });
    }

    /* ==================== ADD MODE (increment current value) ==================== */
    bot.action('kpi_add_mode', async (ctx) => {
        await ctx.answerCbQuery();

        try {
            const today = getCurrentDay();
            const currentValue = await getDayValue(today);

            const keyboard = {
                inline_keyboard: [
                    [
                        { text: '➕1', callback_data: 'kpi_add_1' },
                        { text: '➕2', callback_data: 'kpi_add_2' },
                        { text: '➕3', callback_data: 'kpi_add_3' }
                    ],
                    [
                        { text: '➕5', callback_data: 'kpi_add_5' },
                        { text: '➕10', callback_data: 'kpi_add_10' }
                    ],
                    [
                        { text: '🔙 Назад', callback_data: 'kpi_edit' }
                    ]
                ]
            };

            await ctx.editMessageText(
                `➕ *Добавить к текущему значению*\n\n` +
                `📊 Текущее: ${currentValue === 0 ? '-' : currentValue}\n\n` +
                `Выберите сколько добавить:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );
        } catch (error) {
            console.error('KPI Add Mode Error:', error);
            await ctx.reply('❌ Ошибка');
        }
    });

    /* ==================== ADD SPECIFIC AMOUNTS ==================== */
    const addAmounts = [1, 2, 3, 5, 10];
    addAmounts.forEach(amount => {
        bot.action(`kpi_add_${amount}`, async (ctx) => {
            await ctx.answerCbQuery('⏳ Обновление...');

            try {
                const today = getCurrentDay();
                const oldValue = await getDayValue(today);
                const newValue = oldValue + amount;
                const result = await updateDayValue(today, newValue);

                if (result.error) {
                    return ctx.reply(`❌ ${result.error}`);
                }

                const currentMonth = await getCurrentMonthFromSheet();

                await ctx.editMessageText(
                    `✅ *Данные обновлены!*\n\n` +
                    `📅 ${currentMonth}, ${today} число\n` +
                    `⚙️ Настройка: ${oldValue === 0 ? '-' : oldValue} → *${newValue}* (+${amount})`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: '📊 Статистика', callback_data: 'kpi_view' }],
                                [{ text: '🔙 К редактированию', callback_data: 'kpi_edit' }],
                                [{ text: '🏠 Главное меню', callback_data: 'kpi_back' }]
                            ]
                        }
                    }
                );
            } catch (error) {
                console.error('KPI Add Error:', error);
                await ctx.reply('❌ Ошибка при обновлении данных');
            }
        });
    });
    
    /* ==================== CUSTOM VALUE INPUT ==================== */
    bot.action('kpi_custom', async (ctx) => {
        await ctx.answerCbQuery();
        const userId = ctx.from.id;

        const sentMessage = await ctx.editMessageText(
            '✏️ *Свое значение*\n\n' +
            'Отправьте число (0-999):\n\n' +
            'Примеры:\n' +
            '`15` - установить 15\n' +
            '`0` - выходной\n\n',
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '🔙 Отмена', callback_data: 'kpi_back' }
                        ]
                    ]
                }
            }
        );

        userSessions[userId] = {
            type: 'kpi_custom_input',
            waitingForInput: true,
            cancelMessageId: sentMessage.message_id
        };
    });

    /* ==================== BACK BUTTON ==================== */
    bot.action('kpi_back', async (ctx) => {
        await ctx.answerCbQuery();

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '📊 Просмотр', callback_data: 'kpi_view' },
                    { text: '✏️ Редактировать', callback_data: 'kpi_edit' }
                ]
            ]
        };

        await ctx.editMessageText(
            '📈 *KPI Управление*\n\n' +
            'Выберите действие:',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );
    });
};