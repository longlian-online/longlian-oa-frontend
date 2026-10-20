import { useLayoutEffect, useRef, useState } from "react";

import ProjectMetadataTag from "@/components/ProjectMetadataTag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectMetadataTag as ProjectMetadataTagData } from "@/lib/projectMetadata";

interface ProjectCardTagsProps {
  tags: ProjectMetadataTagData[];
}

const TAG_ROW_CLASS = "flex flex-wrap content-start items-start gap-1.5 [&>*]:h-6";
const OVERFLOW_CLASS = "text-[11px] tabular-nums";

export default function ProjectCardTags({ tags }: ProjectCardTagsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const hiddenCount = tags.length - visibleCount;

  useLayoutEffect((): (() => void) | undefined => {
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const counter = counterRef.current;
    if (!container || !measurement || !counter) return;

    function update(): void {
      if (!container || !measurement || !counter) return;
      const bounds = container.getBoundingClientRect();
      const tagBounds = Array.from(measurement.children)
        .slice(0, tags.length)
        .map((element) => element.getBoundingClientRect());
      const { columnGap, rowGap } = getComputedStyle(measurement);
      const horizontalGap = parseFloat(columnGap);
      const verticalGap = parseFloat(rowGap);
      let count = tagBounds.findIndex((tag) => tag.bottom > bounds.bottom + 0.5);
      if (count === -1) {
        setVisibleCount(tags.length);
        return;
      }

      // 为实际的 +N 宽度留位；必要时再让出最后一个标签。
      for (; count >= 0; count--) {
        counter.textContent = `+${tags.length - count}`;
        const counterBounds = counter.getBoundingClientRect();
        const last = tagBounds[count - 1];
        if (!last) break;
        const fitsOnLastRow =
          last.right + horizontalGap + counterBounds.width <= bounds.right + 0.5;
        const fitsOnNextRow =
          last.bottom + verticalGap + counterBounds.height <= bounds.bottom + 0.5;
        if (fitsOnLastRow || fitsOnNextRow) break;
      }
      setVisibleCount(count);
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    for (const element of Array.from(measurement.children).slice(0, tags.length)) {
      observer.observe(element);
    }
    return (): void => observer.disconnect();
  }, [tags]);

  return (
    <div ref={containerRef} className="relative mt-3 min-h-6 flex-1 overflow-hidden">
      <div className={TAG_ROW_CLASS}>
        {tags.slice(0, visibleCount).map((tag, index) => (
          <ProjectMetadataTag key={index} tag={tag} compact />
        ))}
        {hiddenCount > 0 && (
          <Badge
            variant="outline"
            className={OVERFLOW_CLASS}
            aria-label={`还有 ${hiddenCount} 个标签`}
            title={`还有 ${hiddenCount} 个标签`}
          >
            +{hiddenCount}
          </Badge>
        )}
      </div>
      <div
        ref={measurementRef}
        aria-hidden="true"
        className={cn("pointer-events-none invisible absolute inset-x-0 top-0", TAG_ROW_CLASS)}
      >
        {tags.map((tag, index) => (
          <ProjectMetadataTag key={index} tag={tag} compact />
        ))}
        <Badge ref={counterRef} variant="outline" className={OVERFLOW_CLASS}>
          +0
        </Badge>
      </div>
    </div>
  );
}
