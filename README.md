# 归心

面向经纪人的深圳贝壳品质工具箱。公开入口：<https://devi-y.github.io/guixin-public/>

## 维护方式

所有模块名称、桌面端一句话说明、外部链接、模块负责人和课程入口，都集中在 [`tools.js`](./tools.js) 中。新增模块时，替换一个 `placeholder` 配置即可；页面会继续保留九宫格。

同事提交新入口时，统一收集这三项即可：模块名称、经纪人何时使用、完整链接。

## 分享

分享二维码页：<https://devi-y.github.io/guixin-public/share.html>

## 链接巡检

每周一会自动检查公开页和所有外部入口。也可在项目目录运行 `node scripts/check-links.mjs` 立即复核。
