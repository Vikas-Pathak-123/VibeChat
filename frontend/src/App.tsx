import { Routes, Route } from "react-router-dom";
import HomePage from "./Pages/Homepage";
import Chatpage from "./Pages/Chatpage";
import NotFoundPage from "./Pages/NotFoundPage";

/**
 * Root application component.
 * Defines top-level routes for VibeChat.
 */
const App: React.FC = () => (
  <Routes>
    <Route path="/"      element={<HomePage />} />
    <Route path="/chats" element={<Chatpage />} />
    <Route path="/*"     element={<NotFoundPage />} />
  </Routes>
);

export default App;
