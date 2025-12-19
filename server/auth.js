// server/auth.js - 认证模块

const { getConfig } = require('./config');

// 生成登录页面 HTML
function generateLoginPage(showError = false) {
    const config = getConfig();
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - ${config.siteName}</title>
    <link rel="icon" href="${config.siteIcon}" type="image/png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
    <style>
        body, html {
            height: 100%;
            margin: 0;
            padding: 10px;
            font-family: "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
            background-image: url('${config.bgimgURL}');
            background-size: cover;
            background-position: center;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .login-container {
            background-color: rgba(255, 255, 255, 0.3);
            padding: 25px 25px 10px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            width: 400px;
            text-align: center;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }
        .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            background-image: url('${config.siteIcon}');
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
        }
        h1 {
            color: #186db3;
            margin: 0 0 20px 0;
            font-size: 1.8rem;
        }
        .input-group {
            margin-bottom: 20px;
            text-align: left;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #333;
        }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            background-color: rgba(255, 255, 255, 0.35);
            border: 1px solid #ddd;
            border-radius: 8px;
            box-sizing: border-box;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="password"]:focus {
            border-color: #186db3;
            outline: none;
            box-shadow: 0 0 0 2px rgba(37, 115, 179, 0.2);
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #186db3;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #1c5a8a;
        }
        .error {
            color: #e74c3c;
            margin-top: 15px;
            padding: 10px;
            background-color: rgba(231, 76, 60, 0.1);
            border-radius: 4px;
            display: ${showError ? 'block' : 'none'};
        }
        .footer {
            color: #333333;
            font-size: 0.8rem;
            width: 100%;
            text-align: center;
            padding: 16px 0;
            margin-top: 10px;
        }
        .footer p {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin: 0;
        }
        .footer a {
            color: #333333;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        .footer a:hover {
            color: #186db3;
        }
        @media (max-width: 768px) {
            .login-container {
                width: 90%;
            }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>${config.siteName}</h1>
        <form id="loginForm" action="/login" method="POST">
            <div class="input-group">
                <label for="password">访问密码</label>
                <input type="password" id="password" name="password" required autocomplete="current-password">
            </div>
            <button type="submit">登录系统</button>
            <div id="errorMessage" class="error">密码错误，请重试</div>
        </form>
        <div class="footer">
            <p>
                <span>Copyright © ${currentYear} Yutian81</span><span>|</span>
                <a href="${config.githubURL}" target="_blank">
                    <i class="fab fa-github"></i> Github</a>${config.blogURL ? `<span>|</span>
                <a href="${config.blogURL}" target="_blank">
                    <i class="fas fa-blog"></i> ${config.blogName || 'Blog'}</a>` : ''}
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

// 认证中间件
function authenticate(req, res, next) {
    const config = getConfig();

    // 不需要密码时直接通过
    if (!config.password) {
        return next();
    }

    // 豁免路径
    const exemptPaths = ['/api/config', '/login', '/cron'];
    const isExempt = exemptPaths.some(path => req.path === path || req.path.startsWith('/api/whois/'));

    if (isExempt) {
        return next();
    }

    // 检查 Cookie
    const authToken = req.cookies?.auth;
    if (authToken === config.password) {
        return next();
    }

    // 未认证
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: '未登录' });
    }

    // 页面请求重定向到登录页
    return res.redirect('/login');
}

// 处理登录请求
function handleLogin(req, res) {
    const config = getConfig();

    if (req.method === 'GET') {
        return res.send(generateLoginPage(false));
    }

    if (req.method === 'POST') {
        const password = req.body?.password;

        if (password === config.password) {
            // 登录成功，设置 Cookie
            const expires = new Date();
            expires.setDate(expires.getDate() + 7);

            res.cookie('auth', password, {
                expires: expires,
                httpOnly: true,
                path: '/',
                sameSite: 'lax'
            });

            return res.redirect('/');
        } else {
            // 密码错误
            return res.send(generateLoginPage(true));
        }
    }

    return res.status(405).send('Method Not Allowed');
}

module.exports = { authenticate, handleLogin, generateLoginPage };
