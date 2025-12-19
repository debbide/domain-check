// server/storage.js - JSON 文件存储模块

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'domains.json');

// 确保数据目录存在
async function ensureDataDir() {
    const dataDir = path.dirname(DATA_FILE);
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

// 从文件读取域名列表
async function getDomainsFromFile() {
    try {
        await ensureDataDir();
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 文件不存在，返回空数组
            return [];
        }
        console.error('读取域名数据失败:', error.message);
        return [];
    }
}

// 保存域名列表到文件
async function setDomainsToFile(domains) {
    try {
        await ensureDataDir();
        await fs.writeFile(DATA_FILE, JSON.stringify(domains, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error('保存域名数据失败:', error.message);
        throw error;
    }
}

module.exports = { getDomainsFromFile, setDomainsToFile };
