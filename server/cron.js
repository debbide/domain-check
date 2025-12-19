// server/cron.js - 定时任务模块

const cron = require('node-cron');
const { getConfig } = require('./config');
const { getDomainsFromFile } = require('./storage');
const { sendTelegramMessage } = require('./telegram');

// 检查即将到期的域名
async function checkDomainsScheduled() {
    const config = getConfig();
    const allDomains = await getDomainsFromFile();
    const expiringDomains = [];

    if (allDomains.length === 0) {
        console.log('[Cron] KV中没有域名数据，跳过定时检查');
        return expiringDomains;
    }

    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

    for (const domainInfo of allDomains) {
        const maxDaysForAlert = config.days;
        const expirationUTC = Date.parse(domainInfo.expirationDate);

        if (isNaN(expirationUTC)) {
            console.warn(`[Cron] 跳过无效日期 (${domainInfo.domain}): ${domainInfo.expirationDate}`);
            continue;
        }

        const timeDiff = expirationUTC - todayUTC;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        // 只对即将到期 (1 < 剩余天数 <= maxDaysForAlert) 的域名发送通知
        if (daysRemaining > 0 && daysRemaining <= maxDaysForAlert) {
            const message = `
<b>🚨 域名到期提醒 🚨</b>
====================
🌐 域名: <code>${domainInfo.domain}</code>
♻️ 将在 <b>${daysRemaining}天</b> 后过期！
📅 过期日期: ${domainInfo.expirationDate}
🔗 注册商: <a href="${domainInfo.systemURL}">${domainInfo.system}</a>
👤 注册账号: <code>${domainInfo.registerAccount || 'N/A'}</code>
--------------------------`;

            await sendTelegramMessage(message, config.tgid, config.tgtoken);
            console.log(`[Cron] 已发送 ${domainInfo.domain} 的到期通知`);

            expiringDomains.push({
                domain: domainInfo.domain,
                expirationDate: domainInfo.expirationDate,
                daysRemaining: daysRemaining,
                system: domainInfo.system,
                systemURL: domainInfo.systemURL,
                registerAccount: domainInfo.registerAccount || 'N/A',
                groups: domainInfo.groups || 'N/A'
            });
        }
    }

    return expiringDomains;
}

// 初始化定时任务
function initCronJob() {
    const config = getConfig();
    const schedule = config.cronSchedule;

    if (!cron.validate(schedule)) {
        console.error(`[Cron] 无效的 Cron 表达式: ${schedule}`);
        return;
    }

    cron.schedule(schedule, async () => {
        console.log(`[Cron] 执行定时任务: ${new Date().toISOString()}`);
        try {
            const expiringDomains = await checkDomainsScheduled();
            console.log(`[Cron] 检查完成，${expiringDomains.length} 个域名即将到期`);

            // 自动 WebDAV 备份
            const refreshedConfig = getConfig();
            if (refreshedConfig.webdavAutoBackup && refreshedConfig.webdavUrl) {
                try {
                    const { backupToWebDAV } = require('./webdav');
                    const result = await backupToWebDAV();
                    console.log(`[Cron] 自动备份成功: ${result.fileName}`);
                } catch (backupError) {
                    console.error('[Cron] 自动备份失败:', backupError.message);
                }
            }
        } catch (error) {
            console.error('[Cron] 定时任务执行失败:', error);
        }
    }, {
        timezone: 'Asia/Shanghai'
    });

    console.log(`[Cron] 定时任务已启动，Cron 表达式: ${schedule}`);
}

module.exports = { checkDomainsScheduled, initCronJob };
