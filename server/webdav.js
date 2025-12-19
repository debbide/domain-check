// server/webdav.js - WebDAV 备份模块

const { getConfig } = require('./config');
const { getDomainsFromFile, setDomainsToFile } = require('./storage');

// 备份文件夹名称
const BACKUP_FOLDER = 'domain-check-backups';

/**
 * 确保备份目录存在
 */
async function ensureBackupFolder(baseUrl, auth) {
    const folderUrl = baseUrl.endsWith('/') ? `${baseUrl}${BACKUP_FOLDER}/` : `${baseUrl}/${BACKUP_FOLDER}/`;

    try {
        // 先检查目录是否存在
        const checkResponse = await fetch(folderUrl, {
            method: 'PROPFIND',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Depth': '0'
            }
        });

        if (checkResponse.ok || checkResponse.status === 207) {
            return folderUrl; // 目录已存在
        }

        // 目录不存在，创建它
        const mkcolResponse = await fetch(folderUrl, {
            method: 'MKCOL',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (mkcolResponse.ok || mkcolResponse.status === 201) {
            console.log(`[WebDAV] 已创建备份目录: ${BACKUP_FOLDER}`);
        }

        return folderUrl;
    } catch (error) {
        console.error('[WebDAV] 创建备份目录失败:', error.message);
        // 如果创建失败，回退到使用原始目录
        return baseUrl;
    }
}

/**
 * 备份数据到 WebDAV
 */
async function backupToWebDAV() {
    const config = getConfig();
    const { webdavUrl, webdavUser, webdavPass } = config;

    if (!webdavUrl || !webdavUser || !webdavPass) {
        throw new Error('WebDAV 配置不完整');
    }

    try {
        // 获取所有域名数据
        const domains = await getDomainsFromFile();
        const auth = Buffer.from(`${webdavUser}:${webdavPass}`).toString('base64');

        // 确保备份目录存在
        const backupFolderUrl = await ensureBackupFolder(webdavUrl, auth);

        // 构建备份数据
        const backupData = {
            version: '1.0',
            backupTime: new Date().toISOString(),
            domains: domains,
            config: {
                siteName: config.siteName,
                days: config.days,
                siteIcon: config.siteIcon,
                bgimgURL: config.bgimgURL,
                githubURL: config.githubURL,
                blogURL: config.blogURL,
                blogName: config.blogName,
                cronSchedule: config.cronSchedule
            }
        };

        // 生成备份文件名 (按日期)
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const fileName = `domain-check-backup-${dateStr}.json`;

        // 构建完整的 WebDAV URL (使用备份文件夹)
        const uploadUrl = backupFolderUrl.endsWith('/') ? `${backupFolderUrl}${fileName}` : `${backupFolderUrl}/${fileName}`;

        // 使用 PUT 方法上传到 WebDAV
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(backupData, null, 2)
        });

        if (!response.ok && response.status !== 201 && response.status !== 204) {
            throw new Error(`WebDAV 上传失败: ${response.status} ${response.statusText}`);
        }

        console.log(`[WebDAV] 备份成功: ${BACKUP_FOLDER}/${fileName}`);

        // 清理旧备份 (保留最近7天)
        await cleanupOldBackups();

        return { success: true, fileName: `${BACKUP_FOLDER}/${fileName}` };
    } catch (error) {
        console.error('[WebDAV] 备份失败:', error.message);
        throw error;
    }
}

/**
 * 从 WebDAV 恢复数据
 */
async function restoreFromWebDAV(fileName) {
    const config = getConfig();
    const { webdavUrl, webdavUser, webdavPass } = config;

    if (!webdavUrl || !webdavUser || !webdavPass) {
        throw new Error('WebDAV 配置不完整');
    }

    try {
        const auth = Buffer.from(`${webdavUser}:${webdavPass}`).toString('base64');

        // 使用备份文件夹路径
        const backupFolderUrl = webdavUrl.endsWith('/') ? `${webdavUrl}${BACKUP_FOLDER}/` : `${webdavUrl}/${BACKUP_FOLDER}/`;
        const downloadUrl = `${backupFolderUrl}${fileName}`;

        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            throw new Error(`下载备份失败: ${response.status}`);
        }

        const backupData = await response.json();

        // 验证备份数据格式
        if (!backupData.domains || !Array.isArray(backupData.domains)) {
            throw new Error('备份文件格式无效');
        }

        // 恢复域名数据
        await setDomainsToFile(backupData.domains);

        console.log(`[WebDAV] 恢复成功: ${fileName}, ${backupData.domains.length} 个域名`);

        return {
            success: true,
            fileName,
            domainsCount: backupData.domains.length,
            backupTime: backupData.backupTime
        };
    } catch (error) {
        console.error('[WebDAV] 恢复失败:', error.message);
        throw error;
    }
}

/**
 * 获取 WebDAV 上的备份文件列表
 */
async function listWebDAVBackups() {
    const config = getConfig();
    const { webdavUrl, webdavUser, webdavPass } = config;

    if (!webdavUrl || !webdavUser || !webdavPass) {
        return [];
    }

    try {
        const auth = Buffer.from(`${webdavUser}:${webdavPass}`).toString('base64');

        // 使用备份文件夹路径
        const backupFolderUrl = webdavUrl.endsWith('/') ? `${webdavUrl}${BACKUP_FOLDER}/` : `${webdavUrl}/${BACKUP_FOLDER}/`;

        // 使用 PROPFIND 获取文件列表
        const response = await fetch(backupFolderUrl, {
            method: 'PROPFIND',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Depth': '1',
                'Content-Type': 'application/xml'
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
                <D:propfind xmlns:D="DAV:">
                    <D:prop>
                        <D:displayname/>
                        <D:getcontentlength/>
                        <D:getlastmodified/>
                    </D:prop>
                </D:propfind>`
        });

        if (!response.ok) {
            console.error('[WebDAV] PROPFIND 失败:', response.status);
            return [];
        }

        const xml = await response.text();

        // 简单解析 XML 提取文件名 (匹配 domain-check-backup-*.json)
        const fileMatches = xml.match(/domain-check-backup-[\d-]+\.json/g) || [];
        const uniqueFiles = [...new Set(fileMatches)];

        return uniqueFiles.sort().reverse(); // 按日期倒序
    } catch (error) {
        console.error('[WebDAV] 获取文件列表失败:', error.message);
        return [];
    }
}

/**
 * 清理超过保留天数的旧备份
 */
async function cleanupOldBackups() {
    const config = getConfig();
    const { webdavUrl, webdavUser, webdavPass } = config;
    const retentionDays = config.webdavRetention || 7;

    if (!webdavUrl || !webdavUser || !webdavPass) {
        return;
    }

    try {
        const backups = await listWebDAVBackups();
        const auth = Buffer.from(`${webdavUser}:${webdavPass}`).toString('base64');

        // 计算保留截止日期
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`;

        for (const fileName of backups) {
            // 从文件名提取日期
            const match = fileName.match(/domain-check-backup-([\d-]+)\.json/);
            if (match && match[1] < cutoffStr) {
                // 使用备份文件夹路径
                const backupFolderUrl = webdavUrl.endsWith('/') ? `${webdavUrl}${BACKUP_FOLDER}/` : `${webdavUrl}/${BACKUP_FOLDER}/`;
                const deleteUrl = `${backupFolderUrl}${fileName}`;

                await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Basic ${auth}` }
                });

                console.log(`[WebDAV] 已删除过期备份: ${fileName}`);
            }
        }
    } catch (error) {
        console.error('[WebDAV] 清理旧备份失败:', error.message);
    }
}

/**
 * 测试 WebDAV 连接
 */
async function testWebDAVConnection(url, user, pass) {
    try {
        const auth = Buffer.from(`${user}:${pass}`).toString('base64');

        const response = await fetch(url, {
            method: 'PROPFIND',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Depth': '0'
            }
        });

        return response.ok || response.status === 207;
    } catch (error) {
        console.error('[WebDAV] 连接测试失败:', error.message);
        return false;
    }
}

module.exports = {
    backupToWebDAV,
    restoreFromWebDAV,
    listWebDAVBackups,
    testWebDAVConnection
};
