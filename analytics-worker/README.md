# 归心访问统计服务

这是归心 GitHub Pages 的免费统计后端。它只保存匿名访客编号、访问/点击事件、设备类型、来源网站的域名和服务端时间，不保存姓名、手机号、IP、完整网址或完整 User-Agent。

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

部署完成后，把 Worker 地址填入根目录的 `analytics-config.js`：

```js
endpoint: "https://你的 Worker 地址.workers.dev",
```

统计后台地址：

<https://devi-y.github.io/guixin-public/analytics.html>

## 接口

- `GET /api/health`：检查服务是否在线。
- `POST /api/events`：公开接收经过校验的匿名事件。
- `GET /api/summary?days=30`：需要 `Authorization: Bearer ADMIN_TOKEN`，返回后台统计。

数据保留 90 天，超过期限自动清理。Cloudflare Workers Free 和 D1 的免费额度适合当前低流量内部入口；达到每日额度后，统计会暂停，归心主页面仍可使用。
