import { ArrowRight, CheckCheck, Languages, Paintbrush } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Link } from "react-router";

import { getDocsIcon } from "@/lib/docsIcons";

interface DocsChildrenProps {
  children: ReactNode;
}

interface DocsGuideProps extends DocsChildrenProps {
  href: string;
  icon: string;
}

export function DocsIntro({ children }: DocsChildrenProps): ReactElement {
  return (
    <div className="not-prose grid items-center gap-6 rounded-2xl bg-secondary/60 p-6 ring-1 ring-foreground/10 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="text-base leading-8 text-foreground/80 [&_p]:m-0">{children}</div>
      <figure
        aria-label="工作流示例：翻译、校对、嵌字"
        className="m-0 flex flex-col items-center gap-4 px-2 py-1"
      >
        <img
          src="/logo-full.webp"
          alt=""
          width={88}
          height={88}
          className="size-22 -rotate-6 object-contain brightness-95 dark:brightness-80"
        />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 rounded-md bg-background px-2 py-1.5 ring-1 ring-foreground/10">
            <Languages aria-hidden="true" className="size-3.5" />
            翻译
          </span>
          <ArrowRight aria-hidden="true" className="size-3 text-muted-foreground" />
          <span className="flex items-center gap-1 rounded-md bg-background px-2 py-1.5 ring-1 ring-foreground/10">
            <CheckCheck aria-hidden="true" className="size-3.5" />
            校对
          </span>
          <ArrowRight aria-hidden="true" className="size-3 text-muted-foreground" />
          <span className="flex items-center gap-1 rounded-md bg-background px-2 py-1.5 ring-1 ring-foreground/10">
            <Paintbrush aria-hidden="true" className="size-3.5" />
            嵌字
          </span>
        </div>
      </figure>
    </div>
  );
}

export function DocsGuides({ children }: DocsChildrenProps): ReactElement {
  return (
    <div className="not-prose grid gap-x-6 gap-y-2 md:grid-cols-2 md:[&>a:last-child:nth-child(odd)]:col-span-2">
      {children}
    </div>
  );
}

export function DocsGuide({ href, icon, children }: DocsGuideProps): ReactElement {
  return (
    <Link
      to={href}
      className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary ring-1 ring-foreground/10 [&_svg]:size-5">
        {getDocsIcon(icon)}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground [&_p]:m-0 [&_p+p]:mt-1 [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
      <ArrowRight
        aria-hidden="true"
        className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:group-hover:translate-x-0.5"
      />
    </Link>
  );
}
