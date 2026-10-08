import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

const modulePath = process.env.GUIXIN_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const base = process.env.GUIXIN_QA_URL || "http://127.0.0.1:4173/";
const output = process.env.GUIXIN_QA_OUTPUT;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const events = [];
let authAvailable = false;
let signedIn = false;
let logoutFailure = false;
let summaryStatus = 200;
const summary = {
  summary: { pageViews: 10, uniqueVisitors: 4, toolClicks: 11, verifiedVisitors: 1 },
  daily: [{ day: new Date().toISOString().slice(0, 10), pageViews: 10 }],
  topTools: [{ toolId: "learning", clicks: 8 }, { toolId: "jury", clicks: 3 }],
  recentVisitors: [{ visitorId: "test-browser", displayName: "测试成员", verified: true, clicks: 3, device: "mobile", lastSeen: new Date().toISOString() }],
  recentEvents: [{ visitorId: "test-browser", eventType: "tool_click", toolId: "learning", device: "desktop", createdAt: new Date().toISOString(), verified: false }],
};
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname === "/api/events") {
    events.push(...route.request().postDataJSON().events);
    return route.fulfill({ json: { ok: true } });
  }
  if (url.pathname === "/api/auth/status") return route.fulfill({ json: { available: authAvailable } });
  if (url.pathname === "/api/me") return route.fulfill({ json: { authenticated: signedIn, displayName: "经纪人测试姓名" } });
  if (url.pathname === "/api/auth/logout") return route.fulfill({ status: logoutFailure ? 503 : 200, json: { ok: !logoutFailure } });
  if (url.pathname === "/api/summary") return route.fulfill({ status: summaryStatus, json: summaryStatus === 200 ? summary : { error: "test" } });
  return route.fulfill({ json: {} });
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const waitFor = async (predicate) => { await page.waitForFunction(predicate); };
const fits = async () => {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `横向溢出：${page.url()}`);
};
try {
  await page.goto(base);
  await page.getByRole("button", { name: "暂不", exact: true }).click();
  assert.equal(events.length, 0, "同意前不得发送统计");
  for (const [width, height] of [[320,640], [390,844], [430,932], [600,800], [768,1024], [1024,768], [1280,720], [1440,900], [1920,1080]]) {
    await page.setViewportSize({ width, height });
    await fits();
    assert.equal(await page.locator(".tool-card").count(), 9);
    assert.equal(await page.locator("#account-control").isVisible(), false, "未配置登录须隐藏");
    assert.equal(await page.locator(".tagline").isVisible(), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById("tool-grid")).gridTemplateColumns.split(" ").length), 3);
    if (output && [390,1440].includes(width)) {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-workspace="contacts"]').click();
  assert.equal(await page.locator("#contact-list a").count(), 6);
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement === document.querySelector("#contact-list a:last-child")), true, "弹窗焦点须循环");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator('[data-workspace="contacts"]').evaluate((element) => element === document.activeElement), true);
  await page.locator('[data-workspace="coins"]').click();
  await fits();
  assert.equal(await page.locator("#coin-guide .earn-item").count(), 4);
  await page.getByRole("button", { name: "关闭贝壳币指南" }).click();

  await page.getByRole("button", { name: "统计设置", exact: true }).click();
  await page.getByRole("button", { name: "同意统计", exact: true }).click();
  await waitFor(() => !document.body.classList.contains("has-dialog"));
  await page.locator('[data-workspace="contacts"]').click();
  await page.locator("#contact-list a").first().evaluate((element) => element.addEventListener("click", (event) => event.preventDefault()));
  await page.locator("#contact-list a").first().click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "统计设置", exact: true }).click();
  await page.getByRole("button", { name: "关闭统计", exact: true }).click();
  const beforeRevoke = events.length;
  await page.locator('[data-workspace="coins"]').click();
  await page.keyboard.press("Escape");
  assert.equal(events.length, beforeRevoke, "撤回后不得再发送记录");
  assert.equal(events.filter((event) => event.event_type === "page_view").length, 1);
  assert.ok(events.some((event) => event.event_type === "tool_click" && event.tool_id === "jury"), "负责人目录点击须记录");
  assert.equal(new Set(events.map((event) => event.visitor_id)).size, 1);

  authAvailable = true;
  signedIn = true;
  await page.goto(base);
  await page.locator("#account-label").filter({ hasText: "经纪人测试姓名" }).waitFor();
  await fits();
  logoutFailure = true;
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await page.locator("#site-notice").filter({ hasText: "退出暂未完成" }).waitFor();
  assert.equal(await page.locator("#account-label").isVisible(), true);
  logoutFailure = false;
  await page.getByRole("button", { name: "退出", exact: true }).click();
  await page.getByRole("link", { name: "企业微信登录" }).waitFor();
  authAvailable = false;
  signedIn = false;
  await page.goto(`${base}?auth_error=auth_failed`);
  await page.locator("#site-notice").filter({ hasText: "登录未完成" }).waitFor();
  assert.ok(!page.url().includes("auth_error"));

  // 外部资源失效时，首页和联系人仍使用静态备用内容。
  await page.route("**/tools.js*", (route) => route.abort());
  await page.goto(base);
  assert.equal(await page.locator(".tool-card").count(), 9);
  await page.locator('[data-workspace="contacts"]').click();
  assert.equal(await page.locator("#contact-list a").count(), 6);
  await page.keyboard.press("Escape");
  await page.unroute("**/tools.js*");
  await page.route("**/api/**", (route) => route.abort());
  await page.goto(base);
  assert.equal(await page.locator("#account-control").isVisible(), false);
  await page.locator('[data-workspace="coins"]').click();
  assert.equal(await page.locator("#coin-guide").isVisible(), true);
  await page.unroute("**/api/**");

  await page.goto(new URL("share.html", base).href);
  await fits();
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { get: () => ({ writeText: async () => { throw new Error("denied"); } }) }));
  await page.getByRole("button", { name: "复制链接" }).click();
  assert.equal(await page.locator("#copy-field").isVisible(), true);
  assert.equal(await page.locator(".actions a[download]").count(), 1);

  await page.goto(new URL("analytics.html", base).href);
  summaryStatus = 401;
  await page.locator("#token-input").fill("qa-token");
  await page.getByRole("button", { name: "查看数据" }).click();
  await page.locator("#login-error").filter({ hasText: "口令不正确" }).waitFor();
  summaryStatus = 503;
  await page.locator("#token-input").fill("qa-token");
  await page.getByRole("button", { name: "查看数据" }).click();
  await page.locator("#login-error").filter({ hasText: "暂时无法连接" }).waitFor();
  assert.equal(await page.locator("#login-state").isVisible(), true);
  summaryStatus = 200;
  await page.getByRole("button", { name: "查看数据" }).click();
  await page.locator(".metric-card").first().waitFor();
  assert.equal(await page.locator(".bar-row").count(), 9, "所有模块应显示在热度图");
  assert.equal(await page.locator("#visitor-list").innerText().then((text) => text.includes("测试成员")), false, "匿名的最后一次访问不得被旧账号姓名覆盖");
  assert.equal(await page.locator(".trend-column").count(), 14, "无访问日期应补零");
  await page.locator("#range-select").selectOption("7");
  await waitFor(() => document.querySelectorAll(".trend-column").length === 7);
  for (const [width,height] of [[320,640],[390,844],[768,1024],[1440,900]]) {
    await page.setViewportSize({width,height}); await fits();
    if (output && width === 1440) {
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({path:`${output}/dashboard-demo.png`,fullPage:true});
    }
  }
  await page.getByRole("button", {name:"退出看板"}).click();
  assert.equal(await page.locator(".metric-card").count(),0);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem("guixin-analytics-admin-token")),null);

  // 隐私浏览器禁用 Storage 属性本身时，仍可同意并保持当页访客编号。
  const noStorage = await context.newPage();
  noStorage.on("pageerror", (error) => errors.push(error.message));
  await noStorage.addInitScript(() => {
    for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(window, key, { get() { throw new DOMException("denied", "SecurityError"); } });
  });
  await noStorage.goto(base);
  await noStorage.getByRole("button", {name:"同意统计",exact:true}).click();
  await noStorage.locator('[data-workspace="coins"]').click();
  const lastEvents = events.slice(-2);
  assert.equal(lastEvents[0].visitor_id,lastEvents[1].visitor_id,"存储禁用时访客编号须稳定");
  assert.deepEqual(errors, [], "不应发生浏览器运行错误");
  if (output) fs.writeFileSync(`${output}/result.json`,JSON.stringify({passed:true,widths:[320,390,430,600,768,1024,1280,1440,1920],events:events.length,errors},null,2));
  console.log("浏览器验收通过：9 种尺寸、弹窗焦点、备用入口、同意/撤回、点击记录、登录失败、断网、分享降级与大屏状态。");
} finally { await browser.close(); }
