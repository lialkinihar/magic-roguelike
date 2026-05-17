import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "./AppErrorBoundary.tsx";
import App from "./App.tsx";
import "./index.css";
import "./theme.css";

const mount = document.getElementById("root");
if (!mount) {
  throw new Error('#root отсутствует в index.html — проверьте client/index.html.')
}

createRoot(mount).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
