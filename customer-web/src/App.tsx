import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "../src/pages/HomePage";
import ServicesPage from "../src/pages/ServicesPage";
import TrackPage from "../src/pages/TrackPage";
import PickupDeliveryRequest from "./pages/PickupDeliveryRequestPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/request" element={<PickupDeliveryRequest />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;