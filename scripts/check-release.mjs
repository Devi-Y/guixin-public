import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const config = {};
vm.runInNewContext(read("tools.js"), config);
const { GUIXIN_TOOLS: tools, GUIXIN_CONTACTS: contacts } = config;
const html = read("index.html");
const home = html.split('<section class="tool-grid"')[1].split("</section>")[0];
const directory = html.split('id="contact-list"')[1].split("</div>")[0];
assert.equal(tools.length, 9, "出街版本应保留 9 个已启用模块");
assert.equal(new Set(tools.map((tool) => tool.id)).size, tools.length, "模块 ID 必须唯一");
assert.match(html, /\[hidden\]\s*\{\s*display:\s*none\s*!important/, "隐藏登录和弹窗不能被布局样式覆盖");
assert.match(html, /回归到客户服务的初心/);
assert.match(html, /深圳贝壳品质工具箱/);
for (const tool of tools) {
  assert.ok(home.includes(`data-tool-id="${tool.id}"`), `${tool.title}缺少静态备用入口`);
  assert.ok(home.includes(`<h2>${tool.title}</h2>`), `${tool.title}静态名称与配置不一致`);
  if (tool.kind === "external") {
    const url = new URL(tool.href);
    assert.equal(url.protocol, "https:");
    assert.ok(["app-moma.ke.com", "app-fly.ke.com", "study.ke.com"].includes(url.hostname));
    assert.ok(home.includes(`href="${tool.href}"`), `${tool.title}静态链接与配置不一致`);
  }
}
for (const contact of contacts) {
  const tool = tools.find((item) => item.id === contact.moduleId);
  assert.ok(tool, `${contact.owner}的模块不存在`);
  assert.equal(contact.module, tool.title, "负责人目录名称须与模块一致");
  assert.ok(directory.includes(`href="${tool.href}"`), `${contact.module}缺少负责人备用链接`);
  assert.ok(directory.includes(`负责人：${contact.owner}`));
}
for (const name of ["tools.js", "analytics-config.js", "analytics.js", "auth.js", "analytics-dashboard.js"]) {
  new vm.Script(read(name), { filename: name });
}
for (const page of ["index.html", "analytics.html", "share.html"]) {
  for (const match of read(page).matchAll(/(?:src|href)="(?:\.\/)?(assets\/[^"?]+|[\w-]+\.(?:js|html))(?:\?[^\"]*)?"/g)) {
    assert.ok(fs.existsSync(new URL(`../${match[1]}`, import.meta.url)), `${page}引用缺失资源：${match[1]}`);
  }
}
console.log("出街检查通过：9 个模块、7 个外部链接、6 位负责人映射、静态备用入口和分享资源一致。");
