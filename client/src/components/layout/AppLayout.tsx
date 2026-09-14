import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />

      <div className="md:pl-64">
        <Header />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;