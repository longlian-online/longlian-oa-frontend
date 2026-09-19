import { StrictMode } from "react";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useRoutes } from "react-router";
import routes from "~react-pages";
import { ConfirmDialogProvider } from "@/components/ConfirmDialog";
import PageTransition from "@/components/layout/PageTransition";
import TipProvider from "@/components/tip";
import { applyTheme, getStoredTheme } from "@/lib/theme";
import "./index.css";

applyTheme(getStoredTheme());

function App() {
  const location = useLocation();
  const element = useRoutes(routes, location);

  if (location.pathname.startsWith("/dashboard")) {
    return element;
  }

  return <PageTransition className="min-h-svh">{element}</PageTransition>;
}

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
