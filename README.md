<p align="center">
  <img src="./public/logo-full.webp" alt="白箱" width="96" />
</p>

<h1 align="center">白箱</h1>

<p align="center">LongLian OA 的 Web 前端。</p>

白箱是 LongLian OA 的 Web 客户端，用来访问系统的使用界面和管理界面。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 构建 | Vite Plus（`vp`） |
| 界面 | React 19、TypeScript 5.9 |
| 样式 | Tailwind CSS v4、shadcn/ui |
| 路由 | React Router 7、vite-plugin-pages |

日常开发命令使用 `vp`，不要直接调用 `pnpm`、`npm` 或 `npx`。

## 本地开发

```bash
git clone https://github.com/longlian-online/longlian-oa-frontend
cd longlian-oa-frontend
pnpm install
vp dev
```

浏览器打开 http://localhost:5173 。`pnpm install` 只负责安装依赖并启用 Git Hooks，之后的开发、检查和构建都使用 `vp`。提交前可运行 `vp check`，一次完成格式、lint 和类型检查。

## 许可证

本项目以 [Apache License 2.0](./LICENSE) 授权。

Copyright 2026 longlian-online
