import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function FormSection({
  title,
  description,
  icon,
  action,
  footer,
  children,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
          <div className="min-w-0">
            <h2 className="text-base font-medium text-foreground">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
      {footer && <div className="mt-4 border-t pt-4">{footer}</div>}
    </section>
  );
}
