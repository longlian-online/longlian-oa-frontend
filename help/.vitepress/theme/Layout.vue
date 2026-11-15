<script setup lang="ts">
import DefaultTheme from "vitepress/theme-without-fonts";
import "@fontsource-variable/geist";
import "../../../src/styles/theme/shadcn.css";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <a href="/dashboard/planning" target="_self">返回白箱</a>
    </template>
  </Layout>
</template>

<style>
:root {
  --vp-font-family-base: "Geist Variable", sans-serif;
  --vp-c-bg: var(--background);
  --vp-c-bg-alt: var(--card);
  --vp-c-bg-elv: var(--popover);
  --vp-c-bg-soft: var(--muted);
  --vp-c-text-1: var(--foreground);
  --vp-c-text-2: var(--muted-foreground);
  --vp-c-text-3: var(--muted-foreground);
  --vp-c-divider: var(--border);
  --vp-c-border: var(--border);
  --vp-c-gutter: var(--border);
  --vp-c-brand-1: var(--primary);
  --vp-c-brand-2: var(--foreground);
  --vp-c-brand-3: var(--primary);
  --vp-c-brand-soft: var(--muted);
  --vp-sidebar-bg-color: var(--card);
  --vp-local-search-bg: var(--popover);
  --vp-local-search-highlight-bg: var(--primary);
  --vp-local-search-highlight-text: var(--primary-foreground);
  --vp-code-color: var(--foreground);
  --vp-code-bg: var(--muted);
}
</style>
