# 归心

面向经纪人的深圳贝壳品质工具箱。公开入口：<https://devi-y.github.io/guixin-public/>

## 维护方式

所有模块名称、桌面端一句话说明、外部链接、模块负责人和课程入口，都集中在 [`tools.js`](./tools.js) 中。当前九宫格已启用 9 个模块；后续调整仍只需修改这一个配置文件。

同事提交新入口时，统一收集这三项即可：模块名称、经纪人何时使用、完整链接。

## 分享

分享二维码页：<https://devi-y.github.io/guixin-public/share.html>

## 访问统计

统计后台：<https://devi-y.github.io/guixin-public/analytics.html>

统计已接入免费的 Cloudflare Workers + D1。经纪人首次访问时可选择是否同意匿名统计；统计内容包括访问次数、匿名访客数、设备类型、来源域名和模块点击，不采集姓名、手机号、IP、完整网址或完整 User-Agent。后台口令只保存在本次浏览器会话中。

## 链接巡检

每周一会自动检查公开页和所有外部入口。也可在项目目录运行 `node scripts/check-links.mjs` 立即复核。
