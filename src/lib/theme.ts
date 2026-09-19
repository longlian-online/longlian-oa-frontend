export type AppTheme = "light" | "dark" | "pink";

const THEME_STORAGE_KEY = "theme";

function isAppTheme(value: string | null): value is AppTheme {
  return value === "light" || value === "dark" || value === "pink";
}

export function getStoredTheme(): AppTheme {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (isAppTheme(storedTheme)) return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getCurrentTheme(): AppTheme {
  const root = document.documentElement;
  if (root.dataset.colorTheme === "pink") return "pink";
  return root.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  if (theme === "pink") {
    root.dataset.colorTheme = "pink";
  } else {
    delete root.dataset.colorTheme;
  }
  root.dataset.theme = theme === "dark" ? "dark" : "light";
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function transitionToTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.classList.add("theme-transition");

  if (!document.startViewTransition) {
    applyTheme(theme);
    window.setTimeout(() => root.classList.remove("theme-transition"), 100);
    return;
  }

  void document
    .startViewTransition(() => applyTheme(theme))
    .finished.finally(() => root.classList.remove("theme-transition"));
}
