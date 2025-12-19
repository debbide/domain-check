// server/domains.js - 域名 API 路由处理

const { getDomainsFromFile, setDomainsToFile } = require('./storage');
const { fetchDomainFromAPI } = require('./whois');
const { isPrimaryDomain } = require('./config');

// 处理 POST 请求 (添加/编辑域名)
async function handlePostDomain(req, res) {
    const inputData = req.body;

    // 统一转换为数组处理
    const domainsToProcess = Array.isArray(inputData) ? inputData : [inputData];

    if (domainsToProcess.length === 0) {
        return res.status(400).json({ error: '无效的数据提交。' });
    }

    try {
        const allDomains = await getDomainsFromFile();
        let successCount = 0;
        let failCount = 0;
        let errors = [];

        // 预处理：如果是编辑模式（单条且带 originalDomain），逻辑不同
        const isEditMode = !Array.isArray(inputData) && inputData.originalDomain;

        if (isEditMode) {
            // --- 编辑模式逻辑 (保持原有) ---
            const newDomainData = inputData;
            const domainName = newDomainData.domain;
            const originalDomainName = newDomainData.originalDomain;

            // 检查冲突
            const hasConflict = allDomains.some(d => d.domain === domainName && d.domain !== originalDomainName);
            if (hasConflict) return res.status(409).json({ error: '域名已存在！' });

            // 必填项检查 (略，前端已校验，后端简单校验)
            if (!isPrimaryDomain(domainName) && !newDomainData.expirationDate) {
                return res.status(422).json({ error: '二级域名必须填写到期时间' });
            }

            const updatedDomains = allDomains.map(d =>
                d.domain === originalDomainName ? { ...d, ...newDomainData, originalDomain: undefined } : d
            );
            await setDomainsToFile(updatedDomains);
            return res.json({ success: true, domain: domainName });
        }

        // --- 批量添加模式逻辑 ---
        let currentDomains = [...allDomains];

        for (const domainData of domainsToProcess) {
            if (!domainData.domain) continue;

            const domainName = domainData.domain;
            const isPrimary = isPrimaryDomain(domainName);

            // 查重
            if (currentDomains.some(d => d.domain === domainName)) {
                failCount++;
                errors.push(`${domainName}: 已存在`);
                continue;
            }

            // WHOIS 自动填充 (仅对一级域名且未提供日期)
            if (isPrimary && !domainData.expirationDate) {
                try {
                    const apiData = await fetchDomainFromAPI(domainName);
                    if (apiData) {
                        domainData.registrationDate = apiData.creationDate;
                        domainData.expirationDate = apiData.expiryDate;
                        domainData.system = apiData.registrar;
                        domainData.systemURL = apiData.registrarUrl;
                    }
                } catch (e) {
                    console.error(`WHOIS failed for ${domainName}:`, e);
                }
            }

            // 再次检查必填项 (如果 WHOIS 失败或者不是一级域名)
            if (!domainData.expirationDate) {
                failCount++;
                errors.push(`${domainName}: 缺少到期时间且无法自动获取`);
                continue;
            }

            // 清理数据
            delete domainData.originalDomain;
            currentDomains.push(domainData);
            successCount++;
        }

        if (successCount > 0) {
            await setDomainsToFile(currentDomains);
        }

        return res.json({
            success: true,
            message: `成功添加 ${successCount} 个，失败 ${failCount} 个`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Error in handlePostDomain:', error);
        return res.status(500).json({ error: error.message });
    }
}

// 处理 DELETE 请求 (删除域名)
async function handleDeleteDomain(req, res) {
    const deleteData = req.body;
    let domainsToDelete = [];

    if (Array.isArray(deleteData)) {
        // 直接传递数组的情况 (兼容旧逻辑)
        domainsToDelete = deleteData.filter(d => typeof d === 'string' && d.length > 0);
    } else if (deleteData && Array.isArray(deleteData.domains)) {
        // 前端 batchDelete 发送的是 { domains: [...] }
        domainsToDelete = deleteData.domains.filter(d => typeof d === 'string' && d.length > 0);
    } else if (deleteData && deleteData.domain) {
        // 单个删除的情况
        domainsToDelete = [deleteData.domain];
    } else {
        return res.status(400).json({ error: '无效的删除请求格式。' });
    }

    if (domainsToDelete.length === 0) {
        return res.status(400).json({ error: '未提供有效的域名进行删除。' });
    }

    try {
        const allDomains = await getDomainsFromFile();
        const initialLength = allDomains.length;
        const updatedDomains = allDomains.filter(d => !domainsToDelete.includes(d.domain));
        const deletedCount = initialLength - updatedDomains.length;

        if (deletedCount === 0) {
            return res.status(404).json({ success: false, message: '未找到任何要删除的域名。' });
        }

        await setDomainsToFile(updatedDomains);
        return res.json({ success: true, message: `成功删除 ${deletedCount} 个域名。`, deletedCount });

    } catch (error) {
        console.error('handleDeleteDomain中的错误:', error);
        return res.status(500).json({ error: error.message });
    }
}

// 域名 API 路由处理
async function handleDomainsRequest(req, res) {
    try {
        if (req.method === 'GET') {
            const domains = await getDomainsFromFile();
            return res.json(domains);
        }

        if (req.method === 'POST') {
            return handlePostDomain(req, res);
        }

        if (req.method === 'PUT') {
            const newDomains = req.body;
            if (!Array.isArray(newDomains)) {
                return res.status(400).json({ error: '输入必须是数组' });
            }
            await setDomainsToFile(newDomains);
            return res.json({ success: true, count: newDomains.length });
        }

        if (req.method === 'DELETE') {
            return handleDeleteDomain(req, res);
        }

        return res.status(405).send('Method Not Allowed');

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}

module.exports = { handleDomainsRequest };
