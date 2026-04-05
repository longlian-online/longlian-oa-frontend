import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// 启用 OpenObserve RUM
if (import.meta.env.VITE_RUM_ENABLE) {
  console.log("OpenObserve Enable...");
  import("./lib/rum.ts")
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
