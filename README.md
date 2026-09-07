# 归心

面向经纪人的深圳贝壳品质工具箱。公开入口：<https://devi-y.github.io/guixin-public/>

## 维护方式

所有模块名称、桌面端一句话说明、外部链接、模块负责人和课程入口，都集中在 [`tools.js`](./tools.js) 中。当前九宫格已启用 9 个模块；后续调整仍只需修改这一个配置文件。

同事提交新入口时，统一收集这三项即可：模块名称、经纪人何时使用、完整链接。

## 分享

分享二维码页：<https://devi-y.github.io/guixin-public/share.html>

## 访问统计

统计后台：<https://devi-y.github.io/guixin-public/analytics.html>

统计已接入免费的 Cloudflare Workers + D1。经纪人首次访问时可选择是否同意匿名统计；未完成企业微信授权时，统计只记录匿名访客编号、设备类型、来源域名和模块点击，不采集手机号、IP、完整网址或完整 User-Agent。企业微信授权启用后，只有明确完成官方授权的成员才会在后台显示企业微信姓名，其他访问仍保持匿名；官方 UserId 只在服务端短暂使用，并以不可逆的服务端编号关联事件。后台口令只保存在本次浏览器会话中。

身份登录采用企业微信官方 OAuth2 网页授权，不模拟贝壳登录、不读取密码，也不改动同事提供的模块链接。要启用授权，需要管理员在企业微信应用中配置可信域名，并将 `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_SECRET` 和 `SESSION_SECRET` 配置到 Worker Secret；这些值不要写入 Git 或聊天记录。贝壳账号登录只有在贝壳提供并批准官方 OAuth 接口后才可以接入。

## 链接巡检

每周一会自动检查公开页和所有外部入口。也可在项目目录运行 `node scripts/check-links.mjs` 立即复核。
