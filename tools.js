/*
 * 归心模块入口统一配置
 *
 * 新增或修改模块时，只需要改这一处：
 * - title：模块名称
 * - description：桌面端的一句话说明（手机端不展示）
 * - href：同事提供的外部链接
 * - kind：external 为外部链接；workspace 为归心内置工作台
 *
 * 九宫格始终保留 9 个位置。启用新模块时，将一个 placeholder 替换为模块配置即可。
 */
(function registerGuixinTools(root) {
  const tools = [
    {
      id: "complaint",
      kind: "workspace",
      workspace: "complaint",
      style: "complaint chat is-primary",
      icon: "message-square",
      title: "客户投诉",
      description: "整理客诉事实并生成回复",
      action: "立即开始",
    },
    {
      id: "jury",
      kind: "external",
      href: "https://moma.ke.com/chat/45a870b8-adf5-4c9c-ae84-4404c1a03ced",
      style: "jury person",
      icon: "user-round",
      title: "陪审团",
      description: "处理争议与分歧",
      action: "打开链接",
    },
    {
      id: "governance",
      kind: "external",
      href: "https://app-moma.ke.com/cmy",
      style: "governance bank",
      icon: "landmark",
      title: "共治理事会",
      description: "协同区域问题",
      action: "打开链接",
    },
    {
      id: "supervision",
      kind: "external",
      href: "https://app-moma.ke.com/0508ed9e-ecf3-40d3-b34c-b2fa697170e0",
      style: "supervision eye",
      icon: "eye",
      title: "监察一码通",
      description: "提交监察问题",
      action: "打开链接",
    },
    {
      id: "performance",
      kind: "workspace",
      workspace: "performance",
      style: "performance scale",
      icon: "scale",
      title: "业绩争议",
      description: "核对规则和证据，准备沟通",
      action: "立即开始",
    },
    { id: "reserved-1", kind: "placeholder" },
    { id: "reserved-2", kind: "placeholder" },
    { id: "reserved-3", kind: "placeholder" },
    { id: "reserved-4", kind: "placeholder" },
  ];

  root.GUIXIN_TOOLS = tools;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = tools;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
