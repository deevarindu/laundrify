import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shirt,
  ClipboardList,
  CreditCard,
  History,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    path: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Customers",
    path: "/customers",
    icon: Users,
  },
  {
    label: "Services",
    path: "/services",
    icon: Shirt,
    adminOnly: true,
  },
  {
    label: "Orders",
    path: "/orders",
    icon: ClipboardList,
  },
  {
    label: "Payments",
    path: "/payments",
    icon: CreditCard,
  },
  {
    label: "History",
    path: "/history",
    icon: History,
  },
];

const Sidebar = () => {
  const { user } = useAuth();

  const visibleMenuItems = menuItems.filter(
    (item) =>
      !item.adminOnly ||
      user?.role === "ADMIN"
  );

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[#ded8cf] bg-[#f7f2eb] md:flex md:flex-col">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#30352a]">
              Laundrify
            </h1>

            <p className="text-xs text-[#73776d]">
              Laundry management
            </p>
          </div>
        </div>
      </div>

      <div className="mx-4 h-px bg-[#eae2d6]" />

      <nav className="flex-1 px-3 py-6">
        <div className="mb-4 flex items-center gap-2 px-3">
          <Sparkles className="size-3.5 text-[#8b9a6e]" />

          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#73776d]">
            Workspace
          </p>
        </div>

        <div className="space-y-1.5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#eae2d6] text-[#4b5141]"
                      : "text-[#73776d] hover:bg-white/70 hover:text-[#30352a]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#8b9a6e]" />
                    )}

                    <span
                      className={`flex size-9 items-center justify-center rounded-lg transition-all ${
                        isActive
                          ? "bg-[#8b9a6e] text-white"
                          : "bg-[#eee] text-[#73776d] group-hover:bg-[#eae2d6] group-hover:text-[#4b5141]"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>

                    <span className="flex-1">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="size-1.5 rounded-full bg-[#8b9a6e]" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="p-4">
        <div className="rounded-2xl border border-[#e3dbcf] bg-[#eae2d6] p-4">
          <div className="mb-3 flex items-center gap-2">
            <p className="text-sm font-semibold text-[#4b5141]">
              Laundrify
            </p>
          </div>

          <p className="text-xs leading-5 text-[#73776d]">
            Manage customers, services, orders, and daily laundry operations.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;