import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "primeicons/primeicons.css";
import App from "./App";
import "./index.css";
import "./styles/chat-heads.css";
import "./styles/home.css";
import "./styles/header.css";
import "./styles/footer.css";
import "./styles/ads.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
