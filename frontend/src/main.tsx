import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "primeicons/primeicons.css";
import App from "./App";
import "./index.css";
import "./styles/home.css";
import "./styles/header.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
