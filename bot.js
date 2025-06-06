// Убираем require dotenv, так как токен будет напрямую в коде
// require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Создаем экземпляр бота с токеном
const bot = new TelegramBot('bot token here', { polling: true });

// Хранилище для капчи
const captchaStorage = new Map();

// Функция генерации случайной капчи
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10);
    const num2 = Math.floor(Math.random() * 10);
    return {
        question: `${num1} + ${num2} = ?`,
        answer: (num1 + num2).toString()
    };
}

// Обработка команды /all
bot.onText(/\/all/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
        // Проверяем, является ли чат группой
        const chat = await bot.getChat(chatId);
        if (chat.type === 'private') {
            return bot.sendMessage(chatId, 'Эта команда работает только в группах!');
        }

        // Проверяем, прошел ли пользователь капчу
        if (!captchaStorage.has(userId)) {
            const captcha = generateCaptcha();
            captchaStorage.set(userId, captcha.answer);
            return bot.sendMessage(chatId, `Пожалуйста, решите пример для подтверждения: ${captcha.question}`);
        }

        // Получаем список администраторов
        const admins = await bot.getChatAdministrators(chatId);
        if (admins.length === 0) {
            return bot.sendMessage(chatId, 'В этом чате нет администраторов.');
        }

        // Формируем сообщение с упоминанием всех администраторов
        const adminMentions = admins.map(admin => {
            const username = admin.user.username 
                ? `@${admin.user.username}` 
                : `[${admin.user.first_name}](tg://user?id=${admin.user.id})`;
            return username;
        }).join(' ');

        // Отправляем сообщение
        await bot.sendMessage(chatId, `Внимание администраторы! ${adminMentions}`, {
            parse_mode: 'Markdown'
        });

    } catch (error) {
        console.error('Error:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при выполнении команды.');
    }
});

// Обработка ответов на капчу
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userAnswer = msg.text;

    if (captchaStorage.has(userId)) {
        const correctAnswer = captchaStorage.get(userId);
        if (userAnswer === correctAnswer) {
            captchaStorage.delete(userId);
            bot.sendMessage(chatId, 'Проверка пройдена! Теперь вы можете использовать команду /all');
        } else {
            const newCaptcha = generateCaptcha();
            captchaStorage.set(userId, newCaptcha.answer);
            bot.sendMessage(chatId, `Неверно! Попробуйте еще раз: ${newCaptcha.question}`);
        }
    }
});

console.log('Бот запущен...'); 