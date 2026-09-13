import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const applyTheme = useCallback((dark: boolean) => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    const root = document.documentElement;
    root.classList.add("theme-transition");

    if (!document.startViewTransition) {
      applyTheme(next);
      setIsDark(next);
      setTimeout(() => root.classList.remove("theme-transition"), 100);
      return;
    }

    void document
      .startViewTransition(() => {
        applyTheme(next);
        setIsDark(next);
      })
      .finished.finally(() => root.classList.remove("theme-transition"));
  }, [isDark, applyTheme]);

  return { isDark, toggle };
}

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={isDark ? "切换为浅色模式" : "切换为深色模式"}
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
