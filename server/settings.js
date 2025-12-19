const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 获取所有设置
function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('读取设置文件失败:', error);
    }
    return {};
}

// 保存设置
function saveSettings(newSettings) {
    try {
        const currentSettings = getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updatedSettings, null, 2), 'utf8');
        return updatedSettings;
    } catch (error) {
        console.error('保存设置文件失败:', error);
        throw error;
    }
}

module.exports = { getSettings, saveSettings };
