import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import { queryClient } from "@/lib/queryClient";
import App from "@/App";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import ImageCropProvider from "@/components/ImageCropProvider";
import TipProvider from "@/components/tip";
import { applyTheme, getStoredTheme } from "@/lib/theme";

import "./index.css";

applyTheme(getStoredTheme());

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TipProvider />
      <ImageCropProvider />
      <ConfirmDialogProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfirmDialogProvider>
    </QueryClientProvider>
  </StrictMode>,
);
