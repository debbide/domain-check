# 域名到期监控系统 (Docker 版)

> **声明：本项目修改自用，请支持原作者 [yutian81/domain-check](https://github.com/yutian81/domain-check)**

基于 Node.js + Express 构建的域名到期监控系统，支持 Docker 部署。提供可视化仪表盘、自动 WHOIS 查询、Telegram 通知等功能。

## 功能特性

- ✅ **域名管理**：支持批量添加、编辑、删除域名
- 🔍 **WHOIS 自动查询**：自动获取注册和到期信息
- 📊 **可视化仪表盘**：
    - 状态分布图 (正常/即将到期/已到期)
    - 注册商分布图
    - 域名到期进度仪表盘
- 🔐 **安全保护**：密码访问控制
- 💾 **数据持久化**：JSON 文件存储，支持 Docker 卷挂载
- 📱 **Telegram 通知**：定时推送域名到期提醒
- 🎨 **现代化 UI**：
    - 响应式设计 (移动端适配)
    - 深色模式支持
    - 骨架屏加载动画

## Docker 部署

### 1. 创建 docker-compose.yml

创建一个 `docker-compose.yml` 文件，内容如下：

```yaml
version: '3.8'

services:
  domain-check:
    image: ghcr.io/debbide/domain-check:latest
    container_name: domain-check
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - PASSWORD=123123              # 访问密码
      - DAYS=30                      # 到期提醒阈值(天)
      - SITENAME=域名到期监控        # 网站标题
      - TGID=                        # Telegram 机器人 ID
      - TGTOKEN=                     # Telegram Token
      - CRON_SCHEDULE=0 9,21 * * *   # 定时任务表达式 (每天9点和21点)
```

### 2. 启动服务

```bash
docker-compose up -d
```

访问 `http://localhost:3000` 即可使用。默认密码为 `123123`。

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `PASSWORD` | 访问密码 | `123123` |
| `DAYS` | 到期提醒阈值(天) | `30` |
| `SITENAME` | 网站标题 | `域名到期监控` |
| `TGID` | Telegram Chat ID | 空 |
| `TGTOKEN` | Telegram Bot Token | 空 |
| `CRON_SCHEDULE` | 定时检查时间 (Cron表达式) | `0 9,21 * * *` |

## 许可证

MIT License
