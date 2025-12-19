// src/utils.js

// 从环境变量读取配置
export function getConfig(env) {
    return {
        siteName: env.SITENAME || "域名到期监控",
        siteIcon: env.ICON || 'https://pan.811520.xyz/icon/domain-check.png',
        bgimgURL: env.BGIMG || 'https://pan.811520.xyz/icon/bg_light.webp',
        githubURL: env.GITHUB_URL || 'https://github.com/yutian81/domain-check',
        blogURL: env.BLOG_URL || 'https://blog.notett.com/post/2025/11/251118-domain-check/',
        blogName: env.BLOG_NAME || 'QingYun Blog',
        password: env.PASSWORD || "123123",
        days: Number(env.DAYS || 30), // 用于前端即将到期判断
        tgid: env.TGID || env.TG_CHAT_ID,
        tgtoken: env.TGTOKEN || env.TG_BOT_TOKEN
    };
}

// 格式化日期为北京时间 YYYY-MM-DD
export function formatDateToBeijing(dateStr) {
    const date = new Date(dateStr);
    const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return beijingTime.toISOString().split('T')[0];
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

// 判断是否为一级域名（返回布尔值）
export function isPrimaryDomain(domain) {
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

// TG通知函数
export async function sendtgMessage(message, tgid, tgtoken) {
    if (!tgid || !tgtoken) return;
    const url = `https://api.telegram.org/bot${tgtoken}/sendMessage`;
    const params = {
        chat_id: tgid,
        text: message,
        parse_mode: "HTML"
    };
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
    } catch (error) {
        console.error('Telegram 消息推送失败:', error);
    }
}
