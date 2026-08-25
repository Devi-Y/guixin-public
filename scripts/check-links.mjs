import tools from "../tools.js";

const publicUrl = "https://devi-y.github.io/guixin-public/";
const timeoutMs = 15000;
const runningInGitHubActions = process.env.GITHUB_ACTIONS === "true";

const externalTools = tools.filter((tool) => tool.kind === "external");
const browserOnlyTools = externalTools.filter((tool) => tool.healthCheck === "browser");

const targets = [
  { name: "归心公开页", url: publicUrl },
  ...externalTools
    .filter((tool) => !(runningInGitHubActions && tool.healthCheck === "browser"))
    .map((tool) => ({ name: tool.title, url: tool.href })),
];

async function request(url, method) {
  const response = await fetch(url, {
    method,
    redirect: "follow",
    headers: { "user-agent": "Guixin-Link-Health/1.0" },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if ((response.status === 405 || response.status === 501) && method === "HEAD") {
    return request(url, "GET");
  }

  return response;
}

async function inspect(target) {
  try {
    const response = await request(target.url, "HEAD");
    const healthy = response.status >= 200 && response.status < 400;
    return { ...target, healthy, status: response.status, finalUrl: response.url };
  } catch (error) {
    return { ...target, healthy: false, status: "请求失败", error: error.message };
  }
}

const results = await Promise.all(targets.map(inspect));
for (const result of results) {
  const detail = result.finalUrl || result.error;
  console.log(`${result.healthy ? "✓" : "✗"} ${result.name}: ${result.status} ${detail}`);
}

if (runningInGitHubActions) {
  for (const tool of browserOnlyTools) {
    console.log(`↪ ${tool.title}: 需经纪人浏览器验证，云端巡检跳过`);
  }
}

const failed = results.filter((result) => !result.healthy);
if (failed.length) {
  console.error(`\n${failed.length} 个入口需要复核。`);
  process.exitCode = 1;
} else {
  if (runningInGitHubActions && browserOnlyTools.length) {
    console.log("\n云端可检入口均可访问；内部入口需在经纪人浏览器中复核。");
  } else {
    console.log("\n全部入口当前可访问。");
  }
}
