import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MarkItDownProvider } from "@markitdownjs/react";
// The /preset entry only pulls in the converters + chunker, keeping the
// browser bundle free of Node-only integrations (api/next).
import { createMarkItDown } from "@markitdownjs/all/preset";
import App from "./App";
import "./App.css";

// Fully-configured parser with every converter and the RAG chunker registered.
const parser = createMarkItDown();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MarkItDownProvider parser={parser}>
      <App />
    </MarkItDownProvider>
  </StrictMode>
);
