import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { queryClient } from "@/lib/queryClient";
import { startFrontendReleaseWatch } from "@/lib/frontendReleaseWatch";
import { router } from "@/router";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import FrontendReleaseNotice from "@/components/FrontendReleaseNotice";
import ImageCropProvider from "@/components/ImageCropProvider";
import TipProvider from "@/components/tip";
import { applyTheme, getStoredTheme } from "@/lib/theme";

import "./index.css";

applyTheme(getStoredTheme());
startFrontendReleaseWatch();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TipProvider />
      <FrontendReleaseNotice />
      <ImageCropProvider />
      <ConfirmDialogProvider>
        <RouterProvider router={router} />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  </StrictMode>,
);
