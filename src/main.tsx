import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./pages/Options";
import { Popup } from "./pages/Popup";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const Page = document.body.dataset.page === "options" ? Options : Popup;

createRoot(rootElement).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);

