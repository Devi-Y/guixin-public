# 归心访问统计服务

这是归心 GitHub Pages 的免费统计后端。未完成企业微信授权时，它只保存匿名访客编号、访问/点击事件、设备类型、来源网站的域名和服务端时间，不保存手机号、IP、完整网址或完整 User-Agent。启用企业微信授权后，服务端会把官方授权得到的成员姓名与不可逆成员编号分开保存，用成员编号把访问事件关联到已授权成员；不保存企业微信 UserId、手机号或邮箱。

## 首次部署

在本目录执行：

```bash
wrangler login
wrangler d1 create guixin-analytics --location apac
```

把命令返回的 `database_id` 填入 `wrangler.toml`，然后执行：

```bash
wrangler d1 execute guixin-analytics --remote --file=./schema.sql
wrangler secret put ADMIN_TOKEN
wrangler deploy
```

`ADMIN_TOKEN` 是统计后台口令，只保存在 Cloudflare Secret，不要写入 Git 或网页。

## 启用企业微信登录

企业微信应用管理员需要先把 Worker 的回调域名设置为可信域名。建议使用自己持有的 HTTPS 域名（例如后续接入 `szbk.pzgj.com`），不要把 GitHub Pages 地址当作回调服务端。然后在 Worker 中配置以下 Secret：

```bash
wrangler secret put WECOM_CORP_ID
wrangler secret put WECOM_AGENT_ID
wrangler secret put WECOM_SECRET
wrangler secret put SESSION_SECRET
```

其中前三项来自企业微信自建应用，`SESSION_SECRET` 使用随机长字符串。配置完成后重新部署 Worker。归心首页会自动显示“企业微信登录”，完成一次授权后，归心自己的访问记录会显示企业微信姓名；外部模块是否还需要各自登录，取决于各模块自身是否支持企业微信单点登录，归心不会替它们改登录机制。

部署完成后，把 Worker 地址填入根目录的 `analytics-config.js`：

```js
endpoint: "https://你的 Worker 地址.workers.dev",
```

统计后台地址：

<https://devi-y.github.io/guixin-public/analytics.html>

## 接口

- `GET /api/health`：检查服务是否在线。
- `GET /api/auth/status`：检查企业微信授权是否已配置，不返回密钥。
- `GET /api/auth/wecom/start`：开始企业微信官方网页授权。
- `GET /api/auth/wecom/callback`：接收一次性授权码并建立短期 HttpOnly 会话。
- `GET /api/me`：返回当前会话的登录状态和显示姓名。
- `POST /api/auth/logout`：清除当前会话。
- `POST /api/events`：公开接收经过校验的匿名事件。
- `GET /api/summary?days=30`：需要 `Authorization: Bearer ADMIN_TOKEN`，返回后台统计。

数据保留 90 天，超过期限自动清理。Cloudflare Workers Free 和 D1 的免费额度适合当前低流量内部入口；达到每日额度后，统计会暂停，归心主页面仍可使用。
