import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DesktopProvider } from "./stores/DesktopContext";
import { I18nProvider, ThemeProvider } from "@aegis/ui";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <DesktopProvider>
          <App />
        </DesktopProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>
);
