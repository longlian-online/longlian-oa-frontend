import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router";
import routes from "~react-pages";
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
  return useRoutes(routes);
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <TipProvider />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
