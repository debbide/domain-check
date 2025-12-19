// server/telegram.js - Telegram 通知模块

const fetch = require('node-fetch');

async function sendTelegramMessage(message, tgid, tgtoken) {
    if (!tgid || !tgtoken) {
        return false;
    }

    const url = `https://api.telegram.org/bot${tgtoken}/sendMessage`;
    const params = {
        chat_id: tgid,
        text: message,
        parse_mode: 'HTML'
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            console.error('Telegram 发送失败:', response.status);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Telegram 消息推送失败:', error.message);
        return false;
    }
}

module.exports = { sendTelegramMessage };
