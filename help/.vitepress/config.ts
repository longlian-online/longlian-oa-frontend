import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "白箱 · 使用手册",
  description: "从加入组织到提交任务，了解白箱中的企划、项目和工作流。",
  base: "/help/",
  outDir: "../dist/help",
  cacheDir: "../node_modules/.cache/user-guide",
  head: [["link", { rel: "icon", href: "/logo.webp", type: "image/webp" }]],
  themeConfig: {
    siteTitle: "白箱使用手册",
    nav: [
      { text: "快速开始", link: "/getting-started" },
      { text: "常见问题", link: "/faq" },
    ],
    sidebar: [
      {
        text: "开始使用",
        items: [
          { text: "使用手册", link: "/" },
          { text: "注册与加入组织", link: "/getting-started" },
        ],
      },
      {
        text: "日常协作",
        items: [
          { text: "接取与提交任务", link: "/tasks" },
          { text: "企划与项目", link: "/projects" },
        ],
      },
      {
        text: "组织管理",
        items: [
          { text: "工作流与模板", link: "/workflows" },
          { text: "管理组织", link: "/organization" },
        ],
      },
      { text: "遇到问题", items: [{ text: "常见问题", link: "/faq" }] },
    ],
    outline: { level: [2, 3], label: "本页内容" },
    docFooter: { prev: "上一篇", next: "下一篇" },
    sidebarMenuLabel: "目录",
    returnToTopLabel: "返回顶部",
    darkModeSwitchLabel: "外观",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    skipToContentLabel: "跳到正文",
    notFound: {
      title: "没有找到这篇说明",
      quote: "可以从左侧目录查找，或搜索你要完成的操作。",
      linkLabel: "返回使用手册",
      linkText: "返回使用手册",
    },
    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: "搜索手册", buttonAriaLabel: "搜索使用手册" },
              modal: {
                displayDetails: "显示详细内容",
                resetButtonTitle: "清空搜索",
                backButtonTitle: "返回",
                noResultsText: "没有找到相关说明",
                footer: {
                  selectText: "选择",
                  selectKeyAriaLabel: "回车键",
                  navigateText: "切换",
                  navigateUpKeyAriaLabel: "向上",
                  navigateDownKeyAriaLabel: "向下",
                  closeText: "关闭",
                  closeKeyAriaLabel: "Esc 键",
                },
              },
            },
          },
        },
      },
    },
  },
  vite: {
    configFile: false,
    publicDir: false,
    build: { emptyOutDir: true },
  },
});
