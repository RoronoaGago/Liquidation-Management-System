import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import App from "./App.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { BrowserRouter as Router } from "react-router";
import "./utils/tokenTest"; // Import token testing utilities
import "./utils/debugTokens"; // Import token debugging utilities
import "./utils/authFlowTest"; // Import authentication flow testing utilities

createRoot(document.getElementById("root")!).render(
  <Router>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </Router>
);
