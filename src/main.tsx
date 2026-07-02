import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation, useRoutes } from "react-router";
import routes from "~react-pages";
import PageTransition from "@/components/layout/PageTransition";
import TipProvider from "@/components/tip";
import "./index.css";

const theme = localStorage.getItem("theme");
if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
  document.documentElement.classList.add("dark");
  document.documentElement.dataset.theme = "dark";
} else {
  document.documentElement.dataset.theme = "light";
}

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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
