import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import assert from "node:assert/strict";
import worker from "../analytics-worker/worker.js";

// 在真实 schema 与 Worker 上验收数据闭环；测试数据只在内存 SQLite 中存在。
const sql = new DatabaseSync(":memory:");
sql.exec(fs.readFileSync(new URL("../analytics-worker/schema.sql", import.meta.url), "utf8"));
const pending = [];
const DB = {
  prepare(query) {
    return { bind(...values) {
      return {
        first: async () => sql.prepare(query).get(...values) || null,
        all: async () => ({ results: sql.prepare(query).all(...values) }),
        run: async () => sql.prepare(query).run(...values),
      };
    } };
  },
  batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
};
const env = { DB, ADMIN_TOKEN: "test-only-not-a-real-token" };
const ctx = { waitUntil: (promise) => pending.push(promise) };
const call = (request) => worker.fetch(request, env, ctx);
try {
  const unauthorized = await call(new Request("https://local.test/api/summary?days=7"));
  assert.equal(unauthorized.status, 401);
  const invalid = await call(new Request("https://local.test/api/events", {
    method: "POST", body: JSON.stringify({ events: [{ site: "guixin-public", event_type: "fake" }] }),
  }));
  assert.equal(invalid.status, 400);
  const events = [
    { event_id: "e-test-view", site: "guixin-public", visitor_id: "v-test-visitor", session_id: "s-test-session", event_type: "page_view", device: "mobile" },
    { event_id: "e-test-click", site: "guixin-public", visitor_id: "v-test-visitor", session_id: "s-test-session", event_type: "tool_click", tool_id: "learning", device: "mobile" },
  ];
  for (let index = 0; index < 2; index += 1) {
    const response = await call(new Request("https://local.test/api/events", {
      method: "POST", headers: { Origin: "https://devi-y.github.io", "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
    }));
    assert.equal(response.status, 200);
  }
  await Promise.all(pending);
  const response = await call(new Request("https://local.test/api/summary?days=7", {
    headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
  }));
  const data = await response.json();
  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.summary.pageViews, 1, "同一事件重试不能重复计数");
  assert.equal(data.summary.uniqueVisitors, 1);
  assert.equal(data.summary.toolClicks, 1);
  assert.equal(data.summary.verifiedVisitors, 0, "匿名访问不能伪造真实身份");
  assert.equal(data.topTools[0].toolId, "learning");
  assert.equal(data.recentVisitors[0].clicks, 1);
  assert.equal(data.recentEvents.length, 2);
  const deniedOrigin = await call(new Request("https://local.test/api/health", { headers: { Origin: "https://other.example" } }));
  assert.equal(deniedOrigin.status, 403);
  console.log("数据闭环通过：访问、点击、汇总、去重、访客及管理口令保护；未写入线上数据库。");
} finally { sql.close(); }
