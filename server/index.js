// server/index.js - Express 主入口

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { getConfig } = require('./config');
const { authenticate, handleLogin } = require('./auth');
const { handleDomainsRequest } = require('./domains');
const { handleWhoisRequest } = require('./whois');
const { checkDomainsScheduled, initCronJob } = require('./cron');

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 静态文件
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

// 登录路由 (不需要认证)
app.get('/login', handleLogin);
app.post('/login', handleLogin);

// 配置 API (不需要认证)
app.get('/api/config', (req, res) => {
    const config = getConfig();
    const clientConfig = {
        siteName: config.siteName,
        siteIcon: config.siteIcon,
        bgimgURL: config.bgimgURL,
        githubURL: config.githubURL,
        blogURL: config.blogURL,
        blogName: config.blogName,
        days: config.days
    };
    res.set('Cache-Control', 'public, max-age=86400');
    res.json(clientConfig);
});

// WHOIS API (不需要认证)
app.get('/api/whois/:domain', handleWhoisRequest);

// 手动触发 Cron (不需要认证)
app.all('/cron', async (req, res) => {
    try {
        const expiringDomains = await checkDomainsScheduled();
        res.json({
            success: true,
            message: expiringDomains.length > 0
                ? `${expiringDomains.length} 个域名即将到期`
                : '没有即将到期的域名',
            expiringCount: expiringDomains.length,
            domains: expiringDomains
        });
    } catch (error) {
        console.error('手动触发 cron 失败:', error);
        res.status(500).json({
            success: false,
            error: 'cron 任务执行失败',
            details: error.message
        });
    }
});

// 认证中间件 (后续路由需要认证)
app.use(authenticate);

const { saveSettings } = require('./settings');

// 设置 API (需要认证)
app.get('/api/settings', (req, res) => {
    const config = getConfig();
    // 返回所有配置用于编辑
    res.json(config);
});

app.post('/api/settings', (req, res) => {
    try {
        const newSettings = req.body;
        // 过滤只允许修改的字段
        const allowedKeys = [
            'password', 'days', 'siteName', 'siteIcon', 'bgimgURL',
            'githubURL', 'blogURL', 'blogName', 'tgid', 'tgtoken', 'cronSchedule'
        ];

        const filteredSettings = {};
        allowedKeys.forEach(key => {
            if (newSettings[key] !== undefined) {
                filteredSettings[key] = newSettings[key];
            }
        });

        // 特殊处理 days 为数字
        if (filteredSettings.days) {
            filteredSettings.days = Number(filteredSettings.days);
        }

        saveSettings(filteredSettings);

        // 如果修改了 Cron 表达式，重启定时任务
        if (filteredSettings.cronSchedule) {
            initCronJob();
        }

        res.json({ success: true, message: '设置已保存' });
    } catch (error) {
        console.error('保存设置失败:', error);
        res.status(500).json({ error: '保存设置失败' });
    }
});

// 域名 API (需要认证)
app.all('/api/domains', handleDomainsRequest);

// 主页 (需要认证)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'main.html'));
});

// 404 处理
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// 启动服务器
const config = getConfig();
const PORT = config.port;

app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  域名到期监控系统 - Docker 版本`);
    console.log(`========================================`);
    console.log(`  服务地址: http://localhost:${PORT}`);
    console.log(`  访问密码: ${config.password ? '已设置' : '未设置'}`);
    console.log(`  到期提醒: ${config.days} 天`);
    console.log(`  Telegram: ${config.tgid ? '已配置' : '未配置'}`);
    console.log(`========================================`);

    // 初始化定时任务
    initCronJob();
});
