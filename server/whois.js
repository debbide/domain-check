// server/whois.js - WHOIS 查询模块

const { exec } = require('child_process');
const { isPrimaryDomain } = require('./config');

// WHOIS 查询 (使用系统 whois 命令)
function fetchWhoisData(domain) {
    return new Promise((resolve, reject) => {
        // 简单的输入清理，防止命令注入
        if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
            return reject(new Error('无效的域名格式'));
        }

        exec(`whois ${domain}`, { timeout: 10000 }, (error, stdout, stderr) => {
            if (error) {
                // 某些 whois 客户端在未找到时也会返回错误码，需要区分
                if (stderr && stderr.includes('No match')) {
                    return resolve(stdout || stderr);
                }
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// 解析 WHOIS 数据
function extractWhoisData(text) {
    const domainNameMatch = text.match(/Domain Name:\s*([^\n\r]+)/i);
    const domainName = domainNameMatch ? domainNameMatch[1].trim().toLowerCase() : null;

    // 尝试匹配多种日期格式
    const creationDateMatch = text.match(/(?:Creation Date|Created on|Registration Time):\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const updatedDateMatch = text.match(/(?:Updated Date|Last Updated):\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const expiryDateMatch = text.match(/(?:Registry Expiry Date|Expiry Date|Expiration Time|Paid-Till):\s*([^\n\r]+)/i)?.[1]?.trim() || null;

    const registrarMatch = text.match(/Registrar:\s*([^\n\r]+)/i)?.[1]?.trim() || null;
    const registrarUrlMatch = text.match(/Registrar URL:\s*([^\n\r]+)/i)?.[1]?.trim() || null;

    // 提取 Name Servers
    const nameServers = text.match(/Name Server:\s*([^\n\r]+)/gi) || [];
    const formattedNameServers = [...new Set(nameServers.map(ns =>
        ns.replace(/Name Server:\s*/i, '').trim().toLowerCase()
    ))];

    return {
        domain: domainName,
        creationDate: creationDateMatch,
        updatedDate: updatedDateMatch,
        expiryDate: expiryDateMatch,
        registrar: registrarMatch,
        registrarUrl: registrarUrlMatch,
        nameServers: formattedNameServers
    };
}

// 获取域名 WHOIS 信息
async function fetchDomainFromAPI(domain) {
    try {
        const rawData = await fetchWhoisData(domain);
        return extractWhoisData(rawData);
    } catch (error) {
        console.error(`WHOIS 查询失败 (${domain}):`, error.message);
        return null;
    }
}

// WHOIS API 路由处理
async function handleWhoisRequest(req, res) {
    const domain = req.params.domain;

    if (!domain) {
        return res.status(400).json({ error: '路径格式应为 /api/whois/<域名>' });
    }

    // 仅允许查询一级域名
    if (!isPrimaryDomain(domain)) {
        return res.status(400).json({ error: '仅支持查询一级域名。' });
    }

    try {
        const whoisData = await fetchDomainFromAPI(domain);

        if (whoisData && (whoisData.creationDate || whoisData.expiryDate)) {
            res.set('Cache-Control', 'public, max-age=86400');
            return res.json({ success: true, data: whoisData });
        } else {
            return res.status(404).json({ error: '无法查询到该域名的 WHOIS 信息或信息不完整。' });
        }
    } catch (error) {
        console.error('WHOIS API 错误:', error);
        return res.status(502).json({ error: 'WHOIS 查询服务出错。', details: error.message });
    }
}

module.exports = { fetchDomainFromAPI, handleWhoisRequest };
