import { useContext } from "react";

import { ConfirmDialogContext } from "@/components/ConfirmDialog";

export function useConfirm() {
  const confirm = useContext(ConfirmDialogContext);

  if (!confirm) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }

  return confirm;
}
