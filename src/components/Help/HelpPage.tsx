import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { RootProvider } from "fumadocs-ui/provider/react-router";
import { Suspense, useEffect, type ReactElement } from "react";
import { Link, ScrollRestoration, useParams } from "react-router";

import HelpArticle from "@/components/Help/HelpArticle";
import HelpSearchDialog from "@/components/Help/HelpSearchDialog";
import PageLoading from "@/components/PageLoading";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { helpSource } from "@/lib/help";

const translations = {
  "Search(search trigger)": "搜索手册",
  "Open Search(search trigger)(aria-label)": "搜索使用手册",
  "Search(search dialog)": "搜索手册",
  "No results found(search dialog)": "没有找到相关说明",
  "Close Search(search dialog)(aria-label)": "关闭搜索",
  "Search failed(search dialog)": "搜索失败",
  "Search failed, showing results for {query}(search dialog)": "搜索失败，显示「{query}」的结果",
  "On this page(table of contents)": "本页内容",
  "No Headings(table of contents)": "暂无目录",
  "Next Page(pagination)": "下一篇",
  "Previous Page(pagination)": "上一篇",
  "Skip to Content(skip link)": "跳到正文",
  "Copy Anchor Link(heading anchor)(aria-label)": "复制章节链接",
  "Copied Anchor Link(heading anchor)(aria-label)": "章节链接已复制",
  "Open Sidebar(sidebar)(aria-label)": "展开目录",
  "Close Sidebar(sidebar)(aria-label)": "收起目录",
  "Collapse Sidebar(sidebar)(aria-label)": "收起目录",
  "Hide Sidebar(sidebar)": "收起目录",
  "Show Sidebar(sidebar)": "展开目录",
};

export default function HelpPage(): ReactElement {
  const params = useParams();
  const slugs = params["*"]?.split("/").filter(Boolean) ?? [];
  const page = helpSource.getPage(slugs);
  const title = page?.data.title ?? "没有找到这篇说明";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | 白箱使用手册`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <RootProvider
      theme={{ enabled: false }}
      i18n={{ locale: "zh-CN", translations }}
      search={{ SearchDialog: HelpSearchDialog }}
    >
      <DocsLayout
        tree={helpSource.getPageTree()}
        nav={{ title: "白箱使用手册", url: "/help/" }}
        links={[{ text: "返回白箱", url: "/dashboard/planning", active: "none" }]}
        slots={{ themeSwitch: ThemeToggle }}
      >
        {page ? (
          <Suspense fallback={<PageLoading message="正在加载手册…" />}>
            <HelpArticle key={page.url} page={page} />
          </Suspense>
        ) : (
          <DocsPage footer={{ enabled: false }} breadcrumb={{ enabled: false }}>
            <ScrollRestoration getKey={(location) => location.pathname + location.hash} />
            <DocsTitle>没有找到这篇说明</DocsTitle>
            <DocsBody>
              <p>可以从左侧目录查找，或搜索你要完成的操作。</p>
              <Link to="/help/">返回使用手册</Link>
            </DocsBody>
          </DocsPage>
        )}
      </DocsLayout>
    </RootProvider>
  );
}
