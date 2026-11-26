import { memo, useLayoutEffect, useRef, useState } from "react";

import ProjectMetadataTag from "@/components/ProjectMetadataTag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectMetadataTag as ProjectMetadataTagData } from "@/lib/projectMetadata";

interface ProjectCardTagsProps {
  tags: readonly ProjectMetadataTagData[];
}

const TAG_ROW_CLASS = "flex flex-wrap content-start items-start gap-1.5 [&>*]:h-6";
const OVERFLOW_CLASS = "text-[11px] tabular-nums";

const ProjectCardTags = memo(function ProjectCardTags({ tags }: ProjectCardTagsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);
  const clampedVisibleCount = Math.min(visibleCount, tags.length);
  const hiddenCount = tags.length - clampedVisibleCount;

  useLayoutEffect((): (() => void) | undefined => {
    if (tags.length === 0) return;
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const counter = counterRef.current;
    if (!container || !measurement || !counter) return;

    let frameId: number | null = null;

    function measure(): void {
      if (!container || !measurement || !counter) return;
      // 单阶段读取全部几何信息，不在测量循环内写 DOM，避免强制同步回流。
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const tagBounds = Array.from(measurement.children)
        .slice(0, tags.length)
        .map((element) => element.getBoundingClientRect());
      const counterBounds = counter.getBoundingClientRect();
      const { columnGap, rowGap } = getComputedStyle(measurement);
      const horizontalGap = parseFloat(columnGap) || 0;
      const verticalGap = parseFloat(rowGap) || 0;

      let count = tagBounds.findIndex((tag) => tag.bottom > bounds.bottom + 0.5);
      if (count === -1) {
        setVisibleCount((current) => (current === tags.length ? current : tags.length));
        return;
      }

      for (; count >= 0; count--) {
        const last = tagBounds[count - 1];
        if (!last) break;
        const fitsOnLastRow =
          last.right + horizontalGap + counterBounds.width <= bounds.right + 0.5;
        const fitsOnNextRow =
          last.bottom + verticalGap + counterBounds.height <= bounds.bottom + 0.5;
        if (fitsOnLastRow || fitsOnNextRow) break;
      }

      setVisibleCount((current) => (current === count ? current : count));
    }

    function scheduleMeasure(): void {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        measure();
      });
    }

    measure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    return (): void => {
      observer.disconnect();
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [tags]);

  if (tags.length === 0) {
    return <div className="relative mt-3 min-h-6 flex-1 overflow-hidden" />;
  }

  return (
    <div ref={containerRef} className="relative mt-3 min-h-6 flex-1 overflow-hidden">
      <div className={TAG_ROW_CLASS}>
        {tags.slice(0, clampedVisibleCount).map((tag, index) => (
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
          +{tags.length}
        </Badge>
      </div>
    </div>
  );
});

export default ProjectCardTags;
