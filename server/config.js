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
        cronSchedule: process.env.CRON_SCHEDULE || '0 9,21 * * *',
        // WebDAV 备份配置
        webdavUrl: process.env.WEBDAV_URL || '',
        webdavUser: process.env.WEBDAV_USER || '',
        webdavPass: process.env.WEBDAV_PASS || '',
        webdavRetention: Number(process.env.WEBDAV_RETENTION || 7),
        webdavAutoBackup: process.env.WEBDAV_AUTO_BACKUP === 'true'
    };

    // 合并配置
    // 对于已保存的设置，即使值是空字符串也应优先使用（表示用户主动清空）
    const config = { ...defaults };
    for (const key in settings) {
        if (settings[key] !== undefined) {
            config[key] = settings[key];
        }
    }

    return config;
}

// 常见的多级公共后缀列表 (按常见程度排序)
const MULTI_LEVEL_SUFFIXES = [
    // 国别二级后缀
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'mil.cn', 'ac.cn',
    'co.uk', 'org.uk', 'me.uk', 'net.uk', 'ltd.uk', 'plc.uk', 'gov.uk', 'ac.uk',
    'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au', 'asn.au', 'id.au',
    'co.jp', 'or.jp', 'ne.jp', 'ac.jp', 'ad.jp', 'ed.jp', 'go.jp', 'gr.jp',
    'co.kr', 'or.kr', 'ne.kr', 're.kr', 'pe.kr', 'go.kr', 'mil.kr', 'ac.kr',
    'com.tw', 'net.tw', 'org.tw', 'edu.tw', 'gov.tw', 'idv.tw', 'game.tw',
    'com.hk', 'net.hk', 'org.hk', 'gov.hk', 'edu.hk', 'idv.hk',
    'com.sg', 'net.sg', 'org.sg', 'edu.sg', 'gov.sg', 'per.sg',
    'co.nz', 'net.nz', 'org.nz', 'edu.nz', 'govt.nz', 'iwi.nz', 'maori.nz',
    'com.br', 'net.br', 'org.br', 'gov.br', 'edu.br', 'mil.br', 'art.br',
    'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in', 'nic.in', 'ac.in', 'edu.in', 'res.in', 'gov.in', 'mil.in',
    'com.mx', 'net.mx', 'org.mx', 'edu.mx', 'gob.mx',
    'co.za', 'net.za', 'org.za', 'edu.za', 'gov.za', 'nom.za', 'web.za',
    'com.my', 'net.my', 'org.my', 'edu.my', 'gov.my', 'mil.my', 'name.my',
    'com.ph', 'net.ph', 'org.ph', 'edu.ph', 'gov.ph', 'mil.ph',
    'co.th', 'in.th', 'ac.th', 'go.th', 'mi.th', 'or.th', 'net.th',
    'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn', 'int.vn', 'ac.vn', 'biz.vn', 'info.vn', 'name.vn', 'pro.vn', 'health.vn',
    'com.ru', 'net.ru', 'org.ru', 'pp.ru',
    'co.id', 'or.id', 'ac.id', 'sch.id', 'go.id', 'mil.id', 'net.id', 'web.id', 'biz.id', 'my.id',
    // 欧洲
    'co.de', 'com.de',
    'co.it',
    'com.fr',
    'co.nl', 'com.nl',
    'co.pl', 'com.pl', 'net.pl', 'org.pl',
    // 其他常见
    'com.ar', 'net.ar', 'org.ar', 'gov.ar', 'mil.ar', 'int.ar',
    'com.tr', 'net.tr', 'org.tr', 'biz.tr', 'info.tr', 'tv.tr', 'gen.tr', 'web.tr', 'tel.tr', 'av.tr', 'dr.tr', 'bbs.tr', 'pol.tr', 'edu.tr', 'k12.tr', 'gov.tr', 'mil.tr', 'bel.tr',
    // 特殊后缀
    'github.io', 'gitlab.io', 'pages.dev', 'workers.dev', 'vercel.app', 'netlify.app', 'herokuapp.com', 'appspot.com',
    'blogspot.com', 'blogspot.jp', 'blogspot.co.uk',
    's3.amazonaws.com', 'cloudfront.net',
    'azurewebsites.net', 'cloudapp.azure.com',
];

// 判断是否为一级域名
function isPrimaryDomain(domain) {
    if (!domain) return false;
    const lowerDomain = domain.toLowerCase();
    const parts = lowerDomain.split('.');

    // 至少需要两部分才能是有效域名
    if (parts.length < 2) return false;

    // 检查是否匹配多级后缀
    for (const suffix of MULTI_LEVEL_SUFFIXES) {
        if (lowerDomain.endsWith('.' + suffix)) {
            const suffixParts = suffix.split('.').length;
            // 一级域名 = 后缀部分数 + 1 (域名本身)
            return parts.length === suffixParts + 1;
        }
    }

    // 默认情况：两部分即为一级域名 (如 example.com)
    return parts.length === 2;
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

module.exports = { getConfig, isPrimaryDomain, formatDate };
