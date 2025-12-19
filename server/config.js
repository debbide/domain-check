// server/config.js - 配置加载模块

const { getSettings } = require('./settings');

function getConfig() {
    const settings = getSettings();

    // 环境变量作为默认值
    const defaults = {
        port: process.env.PORT || 3000,
        password: process.env.PASSWORD || '123123',
        days: Number(process.env.DAYS || 30),
        siteName: process.env.SITENAME || '域名到期监控',
        siteIcon: process.env.ICON || 'https://pan.811520.xyz/icon/domain-check.png',
        bgimgURL: process.env.BGIMG || 'https://pan.811520.xyz/icon/bg_light.webp',
        githubURL: process.env.GITHUB_URL || 'https://github.com/yutian81/domain-check',
        blogURL: process.env.BLOG_URL || '',
        blogName: process.env.BLOG_NAME || '',
        tgid: process.env.TGID || '',
        tgtoken: process.env.TGTOKEN || '',
        cronSchedule: process.env.CRON_SCHEDULE || '0 9,21 * * *'
    };

    // 合并配置，文件配置优先
    return { ...defaults, ...settings };
}

// 判断是否为一级域名
function isPrimaryDomain(domain) {
    const parts = domain.split('.');
    return parts.length <= 2;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

module.exports = { getConfig, isPrimaryDomain, formatDate };
