import DefaultTheme from "vitepress/theme-without-fonts";
import Layout from "./Layout.vue";
import type { Theme } from "vitepress";

export default {
  extends: DefaultTheme,
  Layout,
} satisfies Theme;
