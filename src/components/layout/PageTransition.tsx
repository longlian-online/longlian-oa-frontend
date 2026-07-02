import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const historyIndex = typeof window.history.state?.idx === "number" ? window.history.state.idx : 0;
  const previousHistoryIndex = useRef(historyIndex);
  const direction = historyIndex < previousHistoryIndex.current ? "back" : "forward";

  useEffect(() => {
    previousHistoryIndex.current = historyIndex;
  }, [historyIndex, location.key]);

  return (
    <div
      key={location.key}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-[420ms] motion-safe:ease-out motion-reduce:animate-none",
        direction === "back"
          ? "motion-safe:slide-in-from-left-8"
          : "motion-safe:slide-in-from-right-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
