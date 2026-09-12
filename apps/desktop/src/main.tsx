import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DesktopProvider } from "./stores/DesktopContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DesktopProvider>
      <App />
    </DesktopProvider>
  </React.StrictMode>
);
