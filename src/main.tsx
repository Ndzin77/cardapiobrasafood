import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (rootElement) {
  try {
    createRoot(rootElement).render(<App />);
  } catch (e) {
    rootElement.innerHTML =
      '<div style="text-align:center;padding:40px;font-family:sans-serif;">Carregando... Tente recarregar a página.</div>';
  }
}
