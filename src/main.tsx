import { StrictMode } from "react";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/App";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import TipProvider from "@/components/tip";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import "./index.css";

applyTheme(getStoredTheme());

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <TipProvider />
    <ConfirmDialogProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfirmDialogProvider>
  </StrictMode>,
);
