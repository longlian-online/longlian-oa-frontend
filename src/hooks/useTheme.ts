import { useCallback, useEffect, useState } from "react";

import { getCurrentTheme, transitionToTheme, type AppTheme } from "@/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => getCurrentTheme());

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeState(getCurrentTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-color-theme"] });
    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    transitionToTheme(nextTheme);
  }, []);

  return { theme, setTheme };
}
