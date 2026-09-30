import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./Pages/Homepage";
import Chatpage from "./Pages/Chatpage";
import NotFoundPage from "./Pages/NotFoundPage";
import { restoreSession } from "./store/session";

/**
 * Root application component.
 * Defines top-level routes for VibeChat and restores the session (from the
 * httpOnly refresh cookie) once on load. Concurrent calls — StrictMode runs
 * effects twice in development — share a single refresh request.
 */
const App: React.FC = () => {
  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <Routes>
      <Route path="/"      element={<HomePage />} />
      <Route path="/chats" element={<Chatpage />} />
      <Route path="/*"     element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
