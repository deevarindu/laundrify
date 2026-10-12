
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-[#F7F2EB] text-[#34382D]">
      <Sidebar />

      <div className="min-h-screen min-w-0 lg:pl-64">
        <Header />

        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 xl:px-8 2xl:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
