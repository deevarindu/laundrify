import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../src/pages/HomePage";
import ServicesPage from "../src/pages/ServicesPage";
import TrackPage from "../src/pages/TrackPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/track" element={<TrackPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;