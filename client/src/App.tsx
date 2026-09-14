import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
// import CustomersPage from "./pages/customers/CustomersPage";
// import ServicesPage from "./pages/services/ServicesPage";
// import OrdersPage from "./pages/orders/OrdersPage";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* <Route element={<ProtectedRoute />}> */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* <Route path="/customers" element={<CustomersPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/orders" element={<OrdersPage />} /> */}
            </Route>
          {/* </Route> */}

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;