import { useLocation } from "react-router";

import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();

  return (
    <div
      key={location.key}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150 motion-safe:ease-out motion-reduce:animate-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
