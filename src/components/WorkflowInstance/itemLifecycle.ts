interface ItemLifecycle {
  switchTo: (itemId: string) => void;
  capture: () => () => boolean;
}

/** 每次切换项目开启新生命周期，即使返回相同项目也不接受上次的异步结果。 */
export function createItemLifecycle(initialItemId: string): ItemLifecycle {
  let currentItemId = initialItemId;
  let generation = 0;
  return {
    switchTo(itemId: string): void {
      if (itemId !== currentItemId) {
        currentItemId = itemId;
        generation += 1;
      }
    },
    capture(): () => boolean {
      const capturedGeneration = generation;
      return () => generation === capturedGeneration;
    },
  };
}
