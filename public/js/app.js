
const DOMAINS_API = '/api/domains';
const CONFIG_API = '/api/config';
const ITEMS_PER_PAGE = 12; // 每页12个域名信息卡
let allDomains = []; // 存储所有域名数据
let currentFilteredDomains = []; // 存储当前过滤和搜索后的数据
let currentPage = 1; // 默认显示第一页
let currentGroup = '全部'; // 默认激活的分组
let currentSearchTerm = ''; // 搜索框默认为空
let currentStatusFilter = ''; // 概览信息卡默认为空
let globalConfig = { daysThreshold: 30 }; // 默认30天内为将到期
let lastOperatedDomain = null; // 存储最近操作的域名，用于临时置顶

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return [year, month, day].join('-');
}

// 简单的域名格式验证
function isValidDomainFormat(domain) {
    const domainRegex = /^(?!-)(?!.*--)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain.toLowerCase());
}

// 判断是一级域名还是二级域名
function getDomainLevel(domain) {
    const parts = domain.split('.');
    if (parts.length <= 2) return '一级域名';
    return '二级域名';
}
function isPrimaryDomain(domain) {
    return getDomainLevel(domain) === '一级域名';
}

// 自动计算域名到期日期
function calculateExpirationDate() {
    const registrationDateEl = document.getElementById('registrationDate');
    const renewalPeriodEl = document.getElementById('renewalPeriod');
    const renewalUnitEl = document.getElementById('renewalUnit');
    const expirationDateEl = document.getElementById('expirationDate');
    const regDateStr = registrationDateEl.value;
    const period = parseInt(renewalPeriodEl.value);
    const unit = renewalUnitEl.value;

    // 只有注册日期、续费周期数值和单位都有效时才计算
    if (regDateStr && period > 0 && unit) {
        const regDate = new Date(regDateStr);
        let calculatedExpirationDate = new Date(regDateStr);

        if (unit === 'year') {
            calculatedExpirationDate.setFullYear(regDate.getFullYear() + period);
        } else if (unit === 'month') {
            calculatedExpirationDate.setMonth(regDate.getMonth() + period);
        }
        // 格式化日期为 YYYY-MM-DD
        expirationDateEl.value = formatDate(calculatedExpirationDate);
    }
}

// 异步获取全局配置
async function fetchConfig() {
    try {
        const response = await fetch(CONFIG_API);
        if (response.ok) {
            const config = await response.json();
            // 更新全局配置
            globalConfig = {
                ...globalConfig,
                ...config,
                daysThreshold: config.days || globalConfig.daysThreshold // 使用后端定义的提醒天数
            };

            // 应用配置到 UI
            if (config.siteName) {
                document.title = config.siteName;
                const titleEl = document.getElementById('siteTitle');
                if (titleEl) titleEl.innerHTML = `<i class="fas fa-clock"></i> ${config.siteName}`;
            }

            if (config.bgimgURL) {
                document.body.style.backgroundImage = `url('${config.bgimgURL}')`;
            }

            if (config.siteIcon) {
                const favicon = document.getElementById('faviconLink');
                if (favicon) favicon.href = config.siteIcon;
            }

            // 渲染页脚链接
            const footerEl = document.getElementById('footer');
            if (footerEl) {
                let footerHtml = '<p>';
                if (config.blogName && config.blogURL) {
                    footerHtml += `<a href="${config.blogURL}" target="_blank"><i class="fas fa-link"></i> ${config.blogName}</a>`;
                }
                // GitHub 链接已移除
                footerHtml += '</p>';
                footerEl.innerHTML = footerHtml;
            }
        }
    } catch (error) {
        console.error('获取配置信息失败:', error);
    }
}

// --- UI 增强功能 ---

// 切换深色模式
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);

    // 更新图标
    const icon = document.querySelector('#darkModeToggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// 初始化深色模式
function initDarkMode() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        const icon = document.querySelector('#darkModeToggle i');
        if (icon) icon.className = 'fas fa-sun';
    }

    const toggleBtn = document.getElementById('darkModeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleDarkMode);
    }
}

// 渲染骨架屏
function renderSkeleton() {
    const listEl = document.getElementById('domainList');
    if (!listEl) return;

    let html = '';
    for (let i = 0; i < 6; i++) {
        html += `
            <div class="domain-card">
                <div class="card-header">
                    <div class="skeleton skeleton-title" style="width: 50%;"></div>
                    <div class="skeleton skeleton-text" style="width: 20%; height: 20px; border-radius: 20px;"></div>
                </div>
                <div class="card-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text"></div>
                </div>
                <div class="card-footer">
                    <div class="skeleton skeleton-text" style="height: 8px;"></div>
                </div>
            </div>
        `;
    }
    listEl.innerHTML = html;
}

// 导出数据: GET /api/domains
async function exportData() {
    try {
        const response = await fetch(DOMAINS_API);
        if (!response.ok) throw new Error('获取数据失败');

        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `domain_list_backup_${date}.json`;

        // 模拟点击下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('域名数据已成功导出为 JSON 文件！');
    } catch (error) {
        console.error('导出数据失败:', error);
        alert('导出数据失败: ' + error.message);
    }
}

// 导入数据: PUT /api/domains
function importData() {
    const fileInput = document.getElementById('importFileInput');
    if (!fileInput) return;
    fileInput.click(); // 触发文件选择框

    // 监听文件选择事件
    fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!confirm(`确定要导入文件 ${file.name} 吗？\n警告: 这将替换所有现有域名数据!`)) {
            fileInput.value = '';
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const jsonContent = e.target.result;
                    const domainsToImport = JSON.parse(jsonContent);
                    if (!Array.isArray(domainsToImport)) { throw new Error('JSON 文件格式错误，须为域名数组'); }

                    // 调用 PUT API 替换所有数据
                    const response = await fetch(DOMAINS_API, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(domainsToImport),
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: '服务器错误' }));
                        throw new Error(errorData.error || response.statusText);
                    }

                    const result = await response.json();
                    alert(`数据导入成功！共导入 ${result.count} 个域名`);
                    await fetchDomains(); // 重新加载数据
                } catch (jsonError) {
                    console.error('导入文件处理失败:', jsonError);
                    alert('导入文件处理失败: ' + jsonError.message);
                } finally {
                    fileInput.value = '';
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error('读取文件失败:', error);
            alert('读取文件失败: ' + error.message);
            fileInput.value = '';
        }
    };
}

// 获取域名状态信息
function getDomainStatus(expirationDateStr) {
    if (!expirationDateStr) {
        return { statusText: '信息缺失', statusColor: '#95a5a6', daysRemaining: 'N/A' };
    }

    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const expirationTime = Date.parse(expirationDateStr);
    if (isNaN(expirationTime)) {
        return { statusText: '日期格式错误', statusColor: '#95a5a6', daysRemaining: 'N/A' };
    }

    const timeDiff = expirationTime - todayUTC;
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    let statusText = '正常';
    let statusColor = '#2ecc71'; // 绿色

    if (daysRemaining <= 0) {
        statusText = '已到期';
        statusColor = '#e74c3c'; // 红色
    } else if (daysRemaining <= globalConfig.daysThreshold) {
        statusText = '将到期';
        statusColor = '#f39c12'; // 黄色
    }

    return { statusText, statusColor, daysRemaining };
}

// 渲染域名信息概览
function renderSummary(domainsList) {
    const summaryEl = document.getElementById('summary');
    if (!summaryEl) return;

    // 使用传入的列表来计算总数
    const total = domainsList.length;
    let normalCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;

    domainsList.forEach(domain => {
        const { statusText } = getDomainStatus(domain.expirationDate);
        if (statusText === '正常') {
            normalCount++;
        } else if (statusText === '将到期') {
            expiringCount++;
        } else if (statusText === '已到期') {
            expiredCount++;
        }
    });

    const usableCount = normalCount + expiringCount; // 状态“正常”和“将到期”的域名都视为“可用”

    // 生成 HTML 并根据 currentStatusFilter 动态添加 active 类
    summaryEl.innerHTML = `
        <div class="summary-card ${currentStatusFilter === '全部' ? 'active' : ''}" style="--color: #186db3;" data-filter="全部">
            <h3><i class="fa fa-list-ol"></i> 全部</h3>
            <p>${total}</p>
        </div>
        <div class="summary-card ${currentStatusFilter === '正常' ? 'active' : ''}" style="--color: #1dab58;" data-filter="正常">
            <h3><i class="fa fa-check"></i> 正常</h3>
            <p>${usableCount}</p>
        </div>
        <div class="summary-card ${currentStatusFilter === '将到期' ? 'active' : ''}" style="--color: #f39c12;" data-filter="将到期">
            <h3><i class="fa fa-exclamation-triangle"></i> 将到期</h3>
            <p>${expiringCount}</p>
        </div>
        <div class="summary-card ${currentStatusFilter === '已到期' ? 'active' : ''}" style="--color: #e74c3c;" data-filter="已到期">
            <h3><i class="fa fa-times"></i> 已到期</h3>
            <p>${expiredCount}</p>
        </div>
    `;

    // 重新绑定点击事件
    summaryEl.querySelectorAll('.summary-card').forEach(card => {
        card.addEventListener('click', handleSummaryClick);
    });
}

// 处理概览卡片点击事件
function handleSummaryClick(e) {
    const clickedCard = e.currentTarget;
    const filterValue = clickedCard.dataset.filter;

    // 移除所有卡片的 active 状态
    document.querySelectorAll('#summary .summary-card').forEach(card => {
        card.classList.remove('active');
    });

    clickedCard.classList.add('active'); // 为当前点击的卡片添加 active 状态
    currentStatusFilter = filterValue; // 更新状态筛选变量
    currentGroup = '全部'; // 将分组筛选重置为“全部”

    // 移除分组标签的 active 状态
    document.querySelectorAll('#groupTabs .tab-btn').forEach(tab => {
        tab.classList.remove('active');
    });
    // 重新激活 "全部" 标签
    const allTab = document.querySelector('#groupTabs .tab-btn[data-group="全部"]');
    if (allTab) { allTab.classList.add('active'); }

    currentPage = 1; // 重置页码并应用新的筛选
    applyFiltersAndSearch();
}

// 渲染分组标签
function renderGroupTabs() {
    const tabsEl = document.getElementById('groupTabs');
    const existingGroups = ['全部', '一级域名', '二级域名', '未分组'];
    const customGroups = new Set();

    allDomains.forEach(d => {
        const groups = (d.groups || '').split(',').map(g => g.trim()).filter(g => g);
        groups.forEach(g => customGroups.add(g));
    });

    let html = '';
    // 渲染固定标签
    existingGroups.forEach(g => {
        html += `<button class="tab-btn ${currentGroup === g ? 'active' : ''}" data-group="${g}">${g}</button>`;
    });

    // 渲染自定义标签
    customGroups.forEach(g => {
        if (!existingGroups.includes(g)) {
            html += `<button class="tab-btn ${currentGroup === g ? 'active' : ''}" data-group="${g}">${g}</button>`;
        }
    });

    tabsEl.innerHTML = html;
    // 绑定点击事件
    tabsEl.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', handleTabClick);
    });
}

// 处理分组标签点击事件
function handleTabClick(e) {
    const clickedTab = e.target;
    if (!clickedTab.classList.contains('tab-btn')) {
        return;
    }

    // 移除所有标签的 active 类
    const allTabs = document.querySelectorAll('#groupTabs .tab-btn');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // 为当前点击的标签添加 active 类
    clickedTab.classList.add('active');

    // 清除概览卡片的筛选状态
    currentStatusFilter = '';
    const allSummaryCards = document.querySelectorAll('#summary .summary-card');
    allSummaryCards.forEach(card => {
        card.classList.remove('active');
    });

    // 更新全局变量并应用筛选
    currentGroup = clickedTab.dataset.group;
    currentPage = 1;
    applyFiltersAndSearch();
}

// 保存设置
async function saveSettings(e) {
    e.preventDefault();
    const newSettings = {
        password: document.getElementById('set_password').value,
        siteName: document.getElementById('set_siteName').value,
        days: parseInt(document.getElementById('set_days').value) || 30,
        cronSchedule: document.getElementById('set_cronSchedule').value,
        siteIcon: document.getElementById('set_siteIcon').value,
        bgimgURL: document.getElementById('set_bgimgURL').value,
        githubURL: document.getElementById('set_githubURL').value,
        blogName: document.getElementById('set_blogName').value,
        blogURL: document.getElementById('set_blogURL').value,
        tgid: document.getElementById('set_tgid').value,
        tgtoken: document.getElementById('set_tgtoken').value
    };

    try {
        const response = await fetch(SETTINGS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });

        if (response.status === 401) { window.location.href = '/login'; return; }
        if (!response.ok) throw new Error('保存设置失败');

        const result = await response.json();
        alert('设置已保存，部分配置（如网站名称）将在刷新后生效');
        document.getElementById('settingsModal').style.display = 'none';

        // 如果修改了密码，可能需要重新登录，或者只是刷新配置
        await fetchConfig();
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败: ' + error.message);
    }
}

// 获取域名列表
async function fetchDomains() {
    try {
        const response = await fetch(DOMAINS_API);
        if (response.status === 401) { window.location.href = '/login'; return; }
        if (!response.ok) throw new Error('获取域名失败');

        const data = await response.json();
        allDomains = data.map(d => ({ ...d }));

        // 排序
        allDomains.sort((a, b) => {
            if (lastOperatedDomain) {
                if (a.domain === lastOperatedDomain) return -1;
                if (b.domain === lastOperatedDomain) return 1;
            }
            const statusA = getDomainStatus(a.expirationDate).statusText;
            const statusB = getDomainStatus(b.expirationDate).statusText;
            const getStatusPriority = (s) => {
                if (s === '已到期') return 1;
                if (s === '将到期') return 2;
                if (s === '正常') return 3;
                return 4;
            };
            const pA = getStatusPriority(statusA);
            const pB = getStatusPriority(statusB);
            if (pA !== pB) return pA - pB;

            if (pA === 3) {
                const isPrimaryA = isPrimaryDomain(a.domain);
                const isPrimaryB = isPrimaryDomain(b.domain);
                if (isPrimaryA && !isPrimaryB) return -1;
                if (!isPrimaryA && isPrimaryB) return 1;
            }
            return (a.system || '').localeCompare(b.system || '');
        });

        lastOperatedDomain = null;
        renderGroupTabs();
        applyFiltersAndSearch();
        renderCharts(); // 渲染图表

        // 重置批量操作状态
        document.getElementById('batchToolbar').classList.remove('visible');
        document.querySelectorAll('.domain-checkbox').forEach(cb => cb.checked = false);

    } catch (error) {
        console.error('获取域名失败:', error);
        alert('无法加载域名数据');
    }
}

// 应用筛选和搜索
function applyFiltersAndSearch() {
    let filtered = allDomains;

    // 分组筛选
    if (currentGroup !== '全部') {
        if (currentGroup === '未分组') {
            filtered = filtered.filter(d => !d.groups || d.groups.trim() === '');
        } else if (currentGroup === '一级域名') {
            filtered = filtered.filter(d => isPrimaryDomain(d.domain));
        } else if (currentGroup === '二级域名') {
            filtered = filtered.filter(d => !isPrimaryDomain(d.domain));
        } else {
            filtered = filtered.filter(d => (d.groups || '').split(',').map(g => g.trim()).includes(currentGroup));
        }
    }

    // 状态筛选
    if (currentStatusFilter) {
        filtered = filtered.filter(d => getDomainStatus(d.expirationDate).statusText === currentStatusFilter);
    }

    // 搜索
    if (currentSearchTerm) {
        const term = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(d =>
            d.domain.toLowerCase().includes(term) ||
            (d.system && d.system.toLowerCase().includes(term)) ||
            (d.groups && d.groups.toLowerCase().includes(term))
        );
    }

    currentFilteredDomains = filtered;
    renderSummary(currentFilteredDomains);
    renderDomainList();
}

// 渲染域名列表
function renderDomainList() {
    const listEl = document.getElementById('domainList');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (currentFilteredDomains.length === 0) {
        listEl.innerHTML = '<div class="no-data">没有找到匹配的域名</div>';
        return;
    }

    // 分页
    const totalPages = Math.ceil(currentFilteredDomains.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageDomains = currentFilteredDomains.slice(start, end);

    pageDomains.forEach(domain => {
        listEl.appendChild(createDomainCard(domain));
    });

    renderPagination(totalPages);
}

// 创建域名卡片
function createDomainCard(info) {
    const { statusText, statusColor, daysRemaining } = getDomainStatus(info.expirationDate);
    const regDate = new Date(info.registrationDate);
    const expDate = new Date(info.expirationDate);
    const today = new Date();

    let progress = 0;
    if (info.registrationDate && info.expirationDate) {
        const total = expDate - regDate;
        const elapsed = today - regDate;
        progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
    }

    // 仪表盘计算
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    const card = document.createElement('div');
    card.className = 'domain-card';
    card.innerHTML = `
        <div class="card-header">
            <input type="checkbox" class="domain-checkbox" data-domain="${info.domain}">
            <div class="card-domain">
                <div class="domain-name">
                    <a href="http://${info.domain}" target="_blank">${info.domain}</a>
                    ${info.systemURL ? `<a href="${info.systemURL}" target="_blank" class="registrar-link"><i class="fas fa-external-link-alt"></i></a>` : ''}
                </div>
                <div class="domain-registrar">${info.system || '未知注册商'}</div>
            </div>
            
            <!-- 仪表盘 -->
            <div class="gauge-container">
                <svg class="gauge-svg" viewBox="0 0 60 60">
                    <circle class="gauge-bg" cx="30" cy="30" r="${radius}"></circle>
                    <circle class="gauge-fill" cx="30" cy="30" r="${radius}" 
                        style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset}; stroke: ${statusColor}">
                    </circle>
                </svg>
                <div class="gauge-text">${Math.round(progress)}%</div>
            </div>
        </div>
        
        <div class="card-info">
            <div class="info-item">
                <span class="label">注册时间</span>
                <span class="value">${info.registrationDate || '-'}</span>
            </div>
            <div class="info-item">
                <span class="label">到期时间</span>
                <span class="value">${info.expirationDate || '-'}</span>
            </div>
            <div class="info-item">
                <span class="label">剩余天数</span>
                <span class="value" style="color: ${statusColor}; font-weight: bold;">${daysRemaining} 天</span>
            </div>
        </div>
        
        <div class="card-footer">
            <div class="domain-status" style="background-color: ${statusColor}; margin-right: auto;">${statusText}</div>
            <button class="btn-icon edit-btn" title="编辑"><i class="fas fa-edit"></i></button>
            <button class="btn-icon delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>
        </div>
    `;

    // 绑定事件
    card.querySelector('.edit-btn').addEventListener('click', () => openDomainForm(info));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteDomain(info.domain));
    card.querySelector('.domain-checkbox').addEventListener('change', toggleBatchToolbar);

    return card;
}

// 渲染分页
function renderPagination(totalPages) {
    const paginationEl = document.getElementById('pagination');
    if (!paginationEl) return;

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})">上一页</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span>...</span>`;
        }
    }

    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})">下一页</button>`;
    }

    paginationEl.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderDomainList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 打开表单
function openDomainForm(domainData = null) {
    const modal = document.getElementById('domainFormModal');
    const form = document.getElementById('domainForm');
    const title = modal.querySelector('h2');

    form.reset();

    if (domainData) {
        title.textContent = '编辑域名';
        document.getElementById('editOriginalDomain').value = domainData.domain;
        document.getElementById('domain').value = domainData.domain;
        document.getElementById('domain').readOnly = true; // 编辑时不可修改域名
        document.getElementById('registrationDate').value = domainData.registrationDate || '';
        document.getElementById('expirationDate').value = domainData.expirationDate || '';
        document.getElementById('system').value = domainData.system || '';
        document.getElementById('systemURL').value = domainData.systemURL || '';
        document.getElementById('registerAccount').value = domainData.registerAccount || '';
        document.getElementById('groups').value = domainData.groups || '';
        document.getElementById('renewalPeriod').value = domainData.renewalPeriod || '';
        document.getElementById('renewalUnit').value = domainData.renewalUnit || 'year';
    } else {
        title.textContent = '添加域名';
        document.getElementById('editOriginalDomain').value = '';
        document.getElementById('domain').readOnly = false;
        // 设置默认日期
        document.getElementById('registrationDate').value = formatDate(new Date());
    }

    modal.style.display = 'block';
}

function openSettingsModal() {
    document.getElementById('set_password').value = ''; // 密码不回显
    document.getElementById('set_siteName').value = document.title;
    document.getElementById('set_days').value = globalConfig.daysThreshold || 30;
    document.getElementById('set_cronSchedule').value = globalConfig.cronSchedule || '';
    document.getElementById('set_siteIcon').value = globalConfig.siteIcon || '';
    document.getElementById('set_bgimgURL').value = globalConfig.bgimgURL || '';
    document.getElementById('set_githubURL').value = globalConfig.githubURL || '';
    document.getElementById('set_blogName').value = globalConfig.blogName || '';
    document.getElementById('set_blogURL').value = globalConfig.blogURL || '';
    document.getElementById('set_tgid').value = globalConfig.tgid || '';
    document.getElementById('set_tgtoken').value = globalConfig.tgtoken || '';

    document.getElementById('settingsModal').style.display = 'block';
}

function updateFormRequiredStatus(value) {
    // 简单逻辑：如果有输入，则认为是有效的
}

async function deleteDomain(domain) {
    if (!confirm(`确定要删除域名 ${domain} 吗？`)) return;
    try {
        const response = await fetch(DOMAINS_API, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domain })
        });
        if (!response.ok) throw new Error('删除失败');
        await fetchDomains();
    } catch (error) {
        console.error(error);
        alert('删除失败');
    }
}

// 提交域名表单 (支持批量)
async function submitDomainForm(e) {
    e.preventDefault();
    const modal = document.getElementById('domainFormModal');
    const domainValue = document.getElementById('domain').value.trim();

    // 分割域名 (支持逗号、空格、换行)
    const domains = domainValue.split(/[\s,]+/).filter(d => d.trim());

    if (domains.length === 0) {
        alert('请输入至少一个域名');
        return;
    }

    // 验证所有域名格式
    const invalidDomains = domains.filter(d => !isValidDomainFormat(d));
    if (invalidDomains.length > 0) {
        alert(`以下域名格式不正确:\n${invalidDomains.join('\n')}`);
        return;
    }

    const commonData = {
        registrationDate: document.getElementById('registrationDate').value || null,
        expirationDate: document.getElementById('expirationDate').value || null,
        system: document.getElementById('system').value || null,
        systemURL: document.getElementById('systemURL').value || null,
        registerAccount: document.getElementById('registerAccount').value || null,
        groups: document.getElementById('groups').value || null,
        renewalPeriod: document.getElementById('renewalPeriod').value ? parseInt(document.getElementById('renewalPeriod').value) : null,
        renewalUnit: document.getElementById('renewalUnit').value || null,
    };

    // 构造请求数据
    let requestData;
    const isEditMode = document.getElementById('editOriginalDomain').value !== '';

    if (isEditMode) {
        // 编辑模式 (只支持单条)
        if (domains.length > 1) { alert('编辑模式下只能修改一个域名'); return; }
        requestData = {
            ...commonData,
            domain: domains[0],
            originalDomain: document.getElementById('editOriginalDomain').value
        };
    } else {
        // 添加模式 (支持批量)
        requestData = domains.map(d => ({
            ...commonData,
            domain: d
        }));
    }

    try {
        const response = await fetch(DOMAINS_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || '保存失败');
        }

        modal.style.display = 'none';

        if (result.message) {
            alert(result.message);
            if (result.errors) {
                console.warn('部分域名添加失败:', result.errors);
                alert('部分域名添加失败:\n' + result.errors.join('\n'));
            }
        } else {
            alert('保存成功！');
        }

        await fetchDomains();
    } catch (error) {
        console.error('保存域名失败:', error);
        alert('保存域名失败: ' + error.message);
    }
}

// 渲染图表
function renderCharts() {
    const ctxStatus = document.getElementById('statusChart');
    const ctxRegistrar = document.getElementById('registrarChart');

    if (!ctxStatus || !ctxRegistrar) return;

    // 销毁旧图表
    if (window.statusChartInstance) window.statusChartInstance.destroy();
    if (window.registrarChartInstance) window.registrarChartInstance.destroy();

    // 状态分布数据
    let normalCount = 0, expiringCount = 0, expiredCount = 0;
    allDomains.forEach(d => {
        const { statusText } = getDomainStatus(d.expirationDate);
        if (statusText === '正常') normalCount++;
        else if (statusText === '将到期') expiringCount++;
        else if (statusText === '已到期') expiredCount++;
    });

    // 注册商分布数据
    const registrarCounts = {};
    allDomains.forEach(d => {
        const registrar = d.system || '未知';
        registrarCounts[registrar] = (registrarCounts[registrar] || 0) + 1;
    });

    // 排序并取前5
    const sortedRegistrars = Object.entries(registrarCounts).sort((a, b) => b[1] - a[1]);
    const topRegistrars = sortedRegistrars.slice(0, 5);
    const otherCount = sortedRegistrars.slice(5).reduce((sum, item) => sum + item[1], 0);

    const registrarLabels = topRegistrars.map(item => item[0]);
    const registrarData = topRegistrars.map(item => item[1]);
    if (otherCount > 0) {
        registrarLabels.push('其他');
        registrarData.push(otherCount);
    }

    // 渲染状态图表 (Doughnut)
    window.statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['正常', '将到期', '已到期'],
            datasets: [{
                data: [normalCount, expiringCount, expiredCount],
                backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: document.body.classList.contains('dark-mode') ? '#fff' : '#666' } },
                title: { display: true, text: '域名状态分布', color: document.body.classList.contains('dark-mode') ? '#fff' : '#333' }
            }
        }
    });

    // 渲染注册商图表 (Pie)
    window.registrarChartInstance = new Chart(ctxRegistrar, {
        type: 'pie',
        data: {
            labels: registrarLabels,
            datasets: [{
                data: registrarData,
                backgroundColor: [
                    '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#95a5a6'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: document.body.classList.contains('dark-mode') ? '#fff' : '#666' } },
                title: { display: true, text: '注册商分布', color: document.body.classList.contains('dark-mode') ? '#fff' : '#333' }
            }
        }
    });
}

// 批量操作相关
function toggleBatchToolbar() {
    const toolbar = document.getElementById('batchToolbar');
    const selectedCount = document.querySelectorAll('.domain-checkbox:checked').length;
    const countSpan = document.getElementById('selectedCount');

    if (selectedCount > 0) {
        toolbar.classList.add('visible');
        countSpan.textContent = selectedCount;
    } else {
        toolbar.classList.remove('visible');
    }
}

async function batchDelete() {
    const selectedCheckboxes = document.querySelectorAll('.domain-checkbox:checked');
    const domainsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.domain);

    if (domainsToDelete.length === 0) return;

    if (!confirm(`确定要删除选中的 ${domainsToDelete.length} 个域名吗？`)) return;

    try {
        const response = await fetch(DOMAINS_API, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domains: domainsToDelete })
        });

        if (!response.ok) throw new Error('批量删除失败');

        const result = await response.json();
        alert(result.message || '删除成功');
        await fetchDomains();
    } catch (error) {
        console.error('批量删除失败:', error);
        alert('批量删除失败: ' + error.message);
    }
}

// --- 事件监听和初始化 ---
window.addEventListener('load', async () => {
    initDarkMode(); // 初始化深色模式
    renderSkeleton(); // 显示骨架屏

    await fetchConfig(); // 获取配置
    await fetchDomains(); // 获取域名数据

    // 绑定批量操作事件
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.domain-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(cb => cb.checked = !allChecked);
            toggleBatchToolbar();
        });
    }

    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (batchDeleteBtn) {
        batchDeleteBtn.addEventListener('click', batchDelete);
    }

    // 绑定按钮（添加、导出、导入、设置）
    document.getElementById('addDomainBtn').addEventListener('click', () => openDomainForm());
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', importData);
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);

    // 绑定模态框表单关闭和提交事件
    const modal = document.getElementById('domainFormModal');
    modal.querySelector('.close-btn').addEventListener('click', () => modal.style.display = 'none');

    const settingsModal = document.getElementById('settingsModal');
    settingsModal.querySelector('.close-btn').addEventListener('click', () => settingsModal.style.display = 'none');

    window.addEventListener('click', (event) => {
        if (event.target === modal) { modal.style.display = 'none'; }
        if (event.target === settingsModal) { settingsModal.style.display = 'none'; }
    });

    document.getElementById('domainForm').addEventListener('submit', submitDomainForm);
    document.getElementById('settingsForm').addEventListener('submit', saveSettings);

    // 绑定搜索事件 (输入停止 300ms 后进行搜索)
    let searchTimeout;
    document.getElementById('searchBox').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchTerm = e.target.value.trim();
            currentPage = 1;
            applyFiltersAndSearch();
        }, 3000);
    });

    // 绑定分组标签点击事件
    document.getElementById('groupTabs').addEventListener('click', handleTabClick);

    // 绑定注册日期和续费周期变动事件，触发到期日期计算
    const registrationDateEl = document.getElementById('registrationDate');
    const renewalPeriodEl = document.getElementById('renewalPeriod');
    const renewalUnitEl = document.getElementById('renewalUnit');
    const domainEl = document.getElementById('domain');
    const calculationElements = [registrationDateEl, renewalPeriodEl, renewalUnitEl];
    calculationElements.forEach(el => {
        el.addEventListener('change', calculateExpirationDate);
        el.addEventListener('input', calculateExpirationDate);
    });

    // 监听域名输入，动态切换必填状态和提示
    domainEl.addEventListener('input', (e) => {
        updateFormRequiredStatus(e.target.value);
    });
});
