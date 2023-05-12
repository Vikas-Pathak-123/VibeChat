import './App.css';
import { Routes, Route, } from "react-router-dom";  
import HomePage from './Pages/Homepage'
import Chatpage from './Pages/Chatpage'
import NotFoundPage from './Pages/NotFoundPage'
function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<Chatpage />} />
        <Route path="/*" element={<NotFoundPage/>} />
      </Routes>
    </div>
  );
}

export default App;
