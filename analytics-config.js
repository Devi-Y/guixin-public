/*
 * 归心访问统计配置
 *
 * endpoint 留空时，页面不发送任何统计数据；部署 analytics-worker 后，
 * 只需要把它改成 Worker 的公开地址，例如：
 * https://guixin-analytics.guixin-analytics.workers.dev
 */
(function registerGuixinAnalyticsConfig(root) {
  root.GUIXIN_ANALYTICS_CONFIG = Object.freeze({
    endpoint: "https://guixin-analytics.guixin-analytics.workers.dev",
    site: "guixin-public",
    consentVersion: "2026-09-07",
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
