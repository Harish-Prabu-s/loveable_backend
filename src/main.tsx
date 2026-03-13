import { createRoot } from "react-dom/client";
import "./lib/firebase"; // Ensure Firebase is initialized immediately
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
