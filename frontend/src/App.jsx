import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./Pages/Login/login";
import Forgot from "./Pages/Login/Forgot";
import Landing from "./Pages/Landing/Landing";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<Forgot/>} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;