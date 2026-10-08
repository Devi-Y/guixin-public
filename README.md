# 归心

面向经纪人的深圳贝壳品质工具箱。公开入口：<https://devi-y.github.io/guixin-public/>

## 维护方式

所有模块名称、桌面端一句话说明、外部链接、模块负责人和课程入口，都集中在 [`tools.js`](./tools.js) 中。当前九宫格已启用 9 个模块；后续新模块按每行 3 个位置自动扩展。维护配置时，也要更新 `index.html` 中相应的静态备用入口与负责人目录，随后运行出街检查。

同事提交新入口时，统一收集这三项即可：模块名称、经纪人何时使用、完整链接。

## 分享

分享二维码页：<https://devi-y.github.io/guixin-public/share.html>

首页下方可进入分享页、复制公开链接或保存二维码。在微信内可长按二维码识别或保存。对外分享固定入口，无需附带版本参数。

## 访问统计

统计后台：<https://devi-y.github.io/guixin-public/analytics.html>

统计已接入免费的 Cloudflare Workers + D1。经纪人首次访问时可选择是否同意统计，也可随时从首页“统计设置”关闭；关闭后停止发送新的记录。未完成企业微信授权时，统计只记录随机访客编号、设备类型、来源域名和模块点击，不采集手机号、IP、完整网址或完整 User-Agent。企业微信授权启用后，只有明确完成官方授权的成员才会在后台显示企业微信姓名，其他访问仍保持匿名；官方 UserId 只在服务端短暂使用，并以不可逆的服务端编号关联事件。后台口令只保存在本次浏览器会话中。

访问大屏显示访问次数、独立访客、模块点击、身份关联、趋势、9 个模块热度与最近动态；打开时每分钟刷新，退出后清空页面数据。独立访客按浏览器随机编号去重，不等于实名人数；日期按现有后端 UTC 自然日汇总，活动时间显示北京时间。

身份登录采用企业微信官方 Web 登录：企业微信内走 OAuth 免跳转，普通电脑浏览器走官方扫码/登录页；不模拟贝壳登录、不读取密码，也不改动同事提供的模块链接。要启用授权，需要管理员在企业微信应用中配置可信域名，并将 `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_SECRET` 和 `SESSION_SECRET` 配置到 Worker Secret；这些值不要写入 Git 或聊天记录。贝壳账号登录只有在贝壳提供并批准官方 OAuth 接口后才可以接入。

## 链接巡检

每周一会自动检查公开页和所有外部入口。也可在项目目录运行 `node scripts/check-links.mjs` 立即复核。

## 出街验收

```bash
node scripts/check-release.mjs
node scripts/check-analytics.mjs
node scripts/check-links.mjs
```

浏览器验收使用已安装的 Playwright 和 Chrome：启动 `python3 -m http.server 4173 --bind 127.0.0.1` 后运行 `node scripts/check-browser.mjs`。可通过 `GUIXIN_PLAYWRIGHT_MODULE` 指向已有 Playwright 的 `index.mjs`；可通过 `GUIXIN_QA_URL` 检查指定静态入口。测试会模拟统计与登录接口，不写入线上访客数据。验收包括 320–1920px 九种尺寸、统计同意/撤回、负责人目录点击、弹窗键盘操作、存储禁用、断网及后台错误状态。

当前已交付可公开分享的统一入口。企业微信实名登录仍需官方应用参数和可信域名配置；7 个外部入口由原平台账号及可见范围控制，地址可达不代表已登录后的业务权限已获验证。微信自带的外链确认页由微信控制。
