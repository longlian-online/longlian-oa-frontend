import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";

import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "project-overview", label: "企划概览" },
  { id: "project-workspace", label: "项目" },
  { id: "project-info", label: "关于作品" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function PlanningDetailNavigation({
  pageRef,
}: {
  pageRef: RefObject<HTMLDivElement | null>;
}): ReactElement {
  const [activeSection, setActiveSection] = useState<SectionId>("project-overview");
  const feedback = useRef<{ heading: HTMLElement; timeout: number } | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    const scroller = page?.closest("main");
    if (!page || !scroller) return;
    let frame = 0;
    function update(): void {
      frame = 0;
      if (!page || !scroller || scroller.scrollHeight <= scroller.clientHeight + 1) return;
      if (scroller.scrollTop <= 1) {
        setActiveSection("project-overview");
        return;
      }
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        setActiveSection("project-info");
        return;
      }
      const threshold = scroller.getBoundingClientRect().top + 80;
      let current: SectionId = "project-overview";
      for (const section of SECTIONS) {
        const target = page.querySelector<HTMLElement>(`#${section.id}`);
        if (target && target.getBoundingClientRect().top <= threshold) current = section.id;
      }
      setActiveSection(current);
    }
    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    scroller.addEventListener("scroll", schedule, { passive: true });
    const observer = new ResizeObserver(schedule);
    observer.observe(page);
    observer.observe(scroller);
    schedule();
    return () => {
      scroller.removeEventListener("scroll", schedule);
      observer.disconnect();
      cancelAnimationFrame(frame);
      if (feedback.current) {
        clearTimeout(feedback.current.timeout);
        delete feedback.current.heading.dataset.locateHighlight;
        feedback.current = null;
      }
    };
  }, [pageRef]);

  function locate(id: SectionId): void {
    const target = pageRef.current?.querySelector<HTMLElement>(`#${id}`);
    const scroller = pageRef.current?.closest("main");
    if (!target || !scroller) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    const heading = target.querySelector<HTMLElement>("h1, h2");
    if (!heading) return;
    const view = scroller.getBoundingClientRect();
    const bounds = heading.getBoundingClientRect();
    if (bounds.top < view.top + 24 || bounds.bottom > view.bottom - 24) {
      scroller.scrollTo({
        top: scroller.scrollTop + target.getBoundingClientRect().top - view.top - 24,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    }
    if (feedback.current) {
      clearTimeout(feedback.current.timeout);
      delete feedback.current.heading.dataset.locateHighlight;
    }
    heading.dataset.locateHighlight = "true";
    heading.focus({ preventScroll: true });
    feedback.current = {
      heading,
      timeout: window.setTimeout(() => {
        delete heading.dataset.locateHighlight;
        feedback.current = null;
      }, 1400),
    };
    setActiveSection(id);
  }

  return (
    <nav aria-label="本页目录" className="sticky top-6 self-start border-l pl-4">
      <p className="mb-3 text-xs text-muted-foreground">本页目录</p>
      <ul className="flex flex-col gap-1">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={activeSection === section.id ? "location" : undefined}
              className={cn(
                "block rounded-md px-2 py-2 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                activeSection === section.id
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground",
              )}
              onClick={(event) => {
                event.preventDefault();
                locate(section.id);
              }}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
