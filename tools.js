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
      id: "jury",
      kind: "external",
      href: "https://app-moma.ke.com/45a870b8-adf5-4c9c-ae84-4404c1a03ced#/",
      style: "jury person",
      icon: "user-round",
      title: "争议陪审",
      description: "处理门店争议与分歧",
      action: "处理争议",
    },
    {
      id: "governance",
      kind: "external",
      href: "https://app-moma.ke.com/cmy",
      style: "governance bank",
      icon: "landmark",
      title: "区域共治",
      description: "协同解决区域问题",
      action: "进入共治",
    },
    {
      id: "supervision",
      kind: "external",
      href: "https://app-moma.ke.com/0508ed9e-ecf3-40d3-b34c-b2fa697170e0",
      style: "supervision eye",
      icon: "eye",
      title: "监察反馈",
      description: "提交监察相关问题",
      action: "提交反馈",
    },
    {
      id: "credit-penalty",
      kind: "external",
      href: "https://app-fly.ke.com/410011d7-21d1-4c6d-a51c-d61d6e438d11",
      healthCheck: "browser",
      style: "credit badge-alert",
      icon: "badge-alert",
      title: "信用处罚查询",
      description: "查询近一年处罚记录",
      action: "查询记录",
    },
    {
      id: "coin-guide",
      kind: "workspace",
      workspace: "coins",
      style: "coins earn",
      icon: "coins",
      title: "贝壳币指南",
      description: "查看当期贝壳币获取方式",
      action: "查看指南",
    },
    {
      id: "complaint-dashboard",
      kind: "external",
      href: "https://app-fly.ke.com/aec0f833-f638-4404-82bf-9fa66d71c947",
      style: "complaint-board dashboard",
      iconText: "诉",
      title: "链家客诉看板",
      description: "查看链家客诉数据",
      action: "查看看板",
    },
    {
      id: "contacts",
      kind: "workspace",
      workspace: "contacts",
      style: "contacts directory",
      iconText: "联",
      title: "模块负责人",
      description: "查找各模块负责人",
      action: "查看联系人",
    },
    {
      id: "learning",
      kind: "external",
      href: "https://study.ke.com/homePage",
      style: "learning course",
      iconText: "学",
      title: "在线学习",
      description: "进入贝壳在线课程",
      action: "开始学习",
    },
    {
      id: "beilian-quality",
      kind: "external",
      href: "https://app-moma.ke.com/sz",
      style: "beilian quality-board",
      iconText: "品",
      title: "贝联客诉看板",
      description: "查看贝联客诉数据",
      action: "查看看板",
    },
  ];

  const contacts = [
    { module: "监察反馈", owner: "陈婉瑜", moduleId: "supervision" },
    { module: "争议陪审", owner: "李昊轩", moduleId: "jury" },
    { module: "区域共治", owner: "陈梦怡", moduleId: "governance" },
    { module: "信用处罚查询", owner: "李昊轩", moduleId: "credit-penalty" },
    { module: "链家客诉看板", owner: "陈瑜", moduleId: "complaint-dashboard" },
    { module: "贝联客诉看板", owner: "胡佳伟", moduleId: "beilian-quality" },
  ];

  root.GUIXIN_TOOLS = tools;
  root.GUIXIN_CONTACTS = contacts;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = tools;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
