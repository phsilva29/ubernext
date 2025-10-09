import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeSecurity } from "./lib/securityEnforcement";
import { startRateLimitCleanup } from "./lib/rateLimiter";

// Inicializar sistemas de segurança
initializeSecurity();
startRateLimitCleanup();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
