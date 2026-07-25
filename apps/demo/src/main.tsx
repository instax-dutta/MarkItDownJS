import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MarkItDownProvider } from "@markitdownjs/react";
import App from "./App.js";
import "./App.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MarkItDownProvider>
      <App />
    </MarkItDownProvider>
  </StrictMode>
);
