import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AppLayout from "./components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/orders/OrdersPage";
import CustomersPage from "./pages/customers/CustomersPage";
import ServicesPage from "./pages/services/ServicesPage";
import UsersPage from "./pages/users/UsersPage";
import CustomerDetailPage from "./pages/customers/CustomerDetailPage";
import CreateOrderPage from "./pages/orders/CreateOrderPage";
import OrderDetailPage from "./pages/orders/OrderDetailPage";
import PaymentsPage from "./pages/Payments/PaymentsPage";
import HistoryPage from "./pages/histories/HistoryPage";
import InvoicePage from "./pages/orders/InvoicePage";

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/order/:id" element={<OrderDetailPage />} />
              <Route path="/orders/create" element={<CreateOrderPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customer/:id" element={<CustomerDetailPage />} />

              <Route path="/services" element={
                <AdminRoute>
                  <ServicesPage />
                </AdminRoute>
              } />

              <Route path="/users" element={
                <AdminRoute>
                  <UsersPage />
                </AdminRoute>
              } />

              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/invoices/:id" element={<InvoicePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;