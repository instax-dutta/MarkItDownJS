import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MarkItDownProvider } from "@markitdownjs/react";
import App from "./App.js";
import "./App.css";
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(MarkItDownProvider, { children: _jsx(App, {}) }) }));
