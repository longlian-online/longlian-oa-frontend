import { memo, useEffect, useRef, useState } from "react";

import ProjectMetadataTag from "@/components/ProjectMetadataTag";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectMetadataTag as ProjectMetadataTagData } from "@/lib/projectMetadata";

interface ProjectCardTagsProps {
  tags: readonly ProjectMetadataTagData[];
}

type MeasureTask = () => (() => void) | null;

const pendingMeasures = new Set<MeasureTask>();
let sharedFrameId: number | null = null;

function flushMeasures(): void {
  sharedFrameId = null;
  const tasks = Array.from(pendingMeasures);
  pendingMeasures.clear();
  const writes: Array<() => void> = [];
  for (const task of tasks) {
    const write = task();
    if (write) writes.push(write);
  }
  for (const write of writes) {
    write();
  }
}

function enqueueMeasure(task: MeasureTask): void {
  pendingMeasures.add(task);
  if (sharedFrameId === null) {
    sharedFrameId = window.requestAnimationFrame(flushMeasures);
  }
}

function cancelMeasure(task: MeasureTask): void {
  pendingMeasures.delete(task);
  if (pendingMeasures.size === 0 && sharedFrameId !== null) {
    window.cancelAnimationFrame(sharedFrameId);
    sharedFrameId = null;
  }
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

  useEffect((): (() => void) | undefined => {
    if (tags.length === 0) return;
    const container = containerRef.current;
    const measurement = measurementRef.current;
    const counter = counterRef.current;
    if (!container || !measurement || !counter) return;

    const readLayout: MeasureTask = () => {
      // 全页所有卡片在同一 rAF 内先集中读几何信息，再集中写入状态，避免交错读写触发多次同步回流。
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return null;
      const tagBounds = Array.from(measurement.children)
        .slice(0, tags.length)
        .map((element) => element.getBoundingClientRect());
      const counterBounds = counter.getBoundingClientRect();
      const { columnGap, rowGap } = getComputedStyle(measurement);
      const horizontalGap = parseFloat(columnGap) || 0;
      const verticalGap = parseFloat(rowGap) || 0;

      let count = tagBounds.findIndex((tag) => tag.bottom > bounds.bottom + 0.5);
      if (count === -1) {
        return () =>
          setVisibleCount((current) => (current === tags.length ? current : tags.length));
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

      const nextCount = count;
      return () => setVisibleCount((current) => (current === nextCount ? current : nextCount));
    };

    const scheduleMeasure = (): void => enqueueMeasure(readLayout);

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(container);
    return (): void => {
      observer.disconnect();
      cancelMeasure(readLayout);
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
