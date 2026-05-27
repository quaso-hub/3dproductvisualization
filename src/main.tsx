import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// Error boundary at root level for better error handling
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1>Error Loading Application</h1>
      <p>Please refresh the page or check the console for details.</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${String(error)}</pre>
    </div>
  `;
}
