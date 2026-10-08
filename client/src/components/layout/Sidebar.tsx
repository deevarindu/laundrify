import {
  ClipboardList,
  CreditCard,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: ClipboardList,
    },
    {
      label: "Pickup & Delivery",
      path: "/pickup-delivery",
      icon: Truck,
    },
    {
      label: "Customers",
      path: "/customers",
      icon: UserRound,
    },
    {
      label: "Services",
      path: "/services",
      icon: Package,
      adminOnly: true,
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
    {
      label: "Users",
      path: "/users",
      icon: Users,
      adminOnly: true,
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN"
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border bg-white p-2 shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-white transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Laundrify
            </h1>
            <p className="text-xs text-muted-foreground">
              Laundry Management
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Main Menu
          </p>

          <div className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>

        <div className="border-t p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() ?? "U"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.name ?? "User"}
              </p>

              <p className="text-xs uppercase text-muted-foreground">
                {user?.role ?? "STAFF"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;