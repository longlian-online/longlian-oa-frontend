import { Select as SelectPrimitive } from "@base-ui/react/select";
import type { ReactElement, ReactNode } from "react";

import { SelectGroup } from "@/components/ui/select";

interface FilterSelectContentProps {
  children: ReactNode;
}

export default function FilterSelectContent({ children }: FilterSelectContentProps): ReactElement {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side="bottom"
        sideOffset={4}
        align="start"
        alignItemWithTrigger={false}
        collisionAvoidance={{ side: "none", align: "shift" }}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className="relative isolate w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <SelectPrimitive.List className="max-h-(--available-height) overflow-y-auto">
            <SelectGroup>{children}</SelectGroup>
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}
