export interface ScrollBox {
  top: number;
  bottom: number;
}

/**
 * 把任务详情移进纵向滚动区所需的 scrollTop 增量。
 * 高于滚动区时对齐顶部，矮于滚动区时只滚到完整可见；已经铺满或完整可见时为 0。
 */
export function detailScrollDelta(scrollport: ScrollBox, detail: ScrollBox): number {
  const portHeight = scrollport.bottom - scrollport.top;
  const detailHeight = detail.bottom - detail.top;
  if (portHeight <= 0 || detailHeight <= 0) return 0;
  if (detail.top >= scrollport.top && detail.bottom <= scrollport.bottom) return 0;

  if (detailHeight > portHeight) {
    const coversScrollport = detail.top <= scrollport.top && detail.bottom >= scrollport.bottom;
    if (coversScrollport) return 0;
    if (detail.top > scrollport.top) return detail.top - scrollport.top;
    return detail.bottom - scrollport.bottom;
  }

  if (detail.bottom > scrollport.bottom) return detail.bottom - scrollport.bottom;
  if (detail.top < scrollport.top) return detail.top - scrollport.top;
  return 0;
}

function verticalScrollport(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
    parent = parent.parentElement;
  }
  const scrollingElement = document.scrollingElement;
  return scrollingElement instanceof HTMLElement ? scrollingElement : null;
}

/** 打开详情后，把该区域滚进主滚动区。详情已在视口内时不改变滚动位置。 */
export function scrollTaskDetailIntoView(detail: HTMLElement): void {
  const scrollport = verticalScrollport(detail);
  if (!scrollport) return;
  const delta = detailScrollDelta(
    scrollport.getBoundingClientRect(),
    detail.getBoundingClientRect(),
  );
  if (Math.abs(delta) < 1) return;
  scrollport.scrollBy({ top: delta });
}
