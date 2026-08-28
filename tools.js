/*
 * 归心模块入口统一配置
 *
 * 新增或修改模块时，只需要改这一处：
 * - title：模块名称
 * - description：桌面端的一句话说明（手机端不展示）
 * - href：同事提供的外部链接
 * - kind：external 为外部链接；workspace 为归心内置工作台
 * - iconText：没有现成图标时，在图标位展示的单字
 * - healthCheck：browser 表示该内部链接只在经纪人浏览器中验证
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
      href: "https://app-moma.ke.com/45a870b8-adf5-4c9c-ae84-4404c1a03ced#/",
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
      id: "credit-penalty",
      kind: "external",
      href: "https://app-fly.ke.com/410011d7-21d1-4c6d-a51c-d61d6e438d11",
      healthCheck: "browser",
      style: "credit badge-alert",
      icon: "badge-alert",
      title: "信用分处罚",
      description: "查询近一年处罚记录",
      action: "打开查询",
    },
    {
      id: "coin-guide",
      kind: "workspace",
      workspace: "coins",
      style: "coins earn",
      icon: "coins",
      title: "赚币指南",
      description: "查看当期赚币路径",
      action: "查看指南",
    },
    {
      id: "contacts",
      kind: "workspace",
      workspace: "contacts",
      style: "contacts directory",
      iconText: "联",
      title: "模块联系人",
      description: "查看模块负责人",
      action: "查看名单",
    },
    {
      id: "learning",
      kind: "workspace",
      workspace: "learning",
      style: "learning course",
      iconText: "学",
      title: "课程学习",
      description: "统一进入品质课程",
      action: "课程中心",
    },
    { id: "reserved-4", kind: "placeholder" },
  ];

  const contacts = [
    { module: "监察一码通", owner: "陈婉瑜", moduleId: "supervision" },
    { module: "陪审团", owner: "李昊轩", moduleId: "jury" },
    { module: "区域共治理事会", owner: "陈梦怡", moduleId: "governance" },
    { module: "近一年信用分处罚查询", owner: "李昊轩", moduleId: "credit-penalty" },
    { module: "链家客诉看板", owner: "陈瑜", status: "待正式入口" },
  ];

  // 课程链接确认后统一添加到这里，页面会自动生成课程入口。
  const courses = [];

  root.GUIXIN_TOOLS = tools;
  root.GUIXIN_CONTACTS = contacts;
  root.GUIXIN_COURSES = courses;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = tools;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
