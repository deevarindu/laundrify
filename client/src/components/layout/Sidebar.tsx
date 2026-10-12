
import { useEffect, useState } from "react";
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
import type { LucideIcon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type MenuItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  section: "workspace" | "management";
  adminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    section: "workspace",
  },
  {
    label: "Orders",
    path: "/orders",
    icon: ClipboardList,
    section: "workspace",
  },
  {
    label: "Pickup & Delivery",
    path: "/pickup-delivery",
    icon: Truck,
    section: "workspace",
  },
  {
    label: "Customers",
    path: "/customers",
    icon: UserRound,
    section: "management",
  },
  {
    label: "Services",
    path: "/services",
    icon: Package,
    section: "management",
    adminOnly: true,
  },
  {
    label: "Payments",
    path: "/payments",
    icon: CreditCard,
    section: "management",
  },
  {
    label: "History",
    path: "/history",
    icon: History,
    section: "management",
  },
  {
    label: "Users",
    path: "/users",
    icon: Users,
    section: "management",
    adminOnly: true,
  },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const visibleMenuItems = menuItems.filter(
    (item) => !item.adminOnly || user?.role === "ADMIN"
  );

  const workspaceItems = visibleMenuItems.filter(
    (item) => item.section === "workspace"
  );

  const managementItems = visibleMenuItems.filter(
    (item) => item.section === "management"
  );

  const isMenuItemActive = (path: string, isActive: boolean) => {
    if (isActive) return true;

    if (path === "/orders") {
      return (
        location.pathname === "/orders/create" ||
        location.pathname.startsWith("/order/")
      );
    }

    if (path === "/customers") {
      return location.pathname.startsWith("/customer/");
    }

    return false;
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === "/dashboard"}
        onClick={() => setIsOpen(false)}
        className={({ isActive }) => {
          const active = isMenuItemActive(item.path, isActive);

          return [
            "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5",
            "text-[13px] font-medium transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#839365]",
            active
              ? "bg-[#E9EDDF] text-[#46543A]"
              : "text-[#72766C] hover:bg-[#F0EEE7] hover:text-[#34382D]",
          ].join(" ");
        }}
      >
        {({ isActive }) => {
          const active = isMenuItemActive(item.path, isActive);

          return (
            <>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[#839365]"
                />
              )}

              <Icon
                aria-hidden="true"
                className={[
                  "ml-0.5 h-[17px] w-[17px] shrink-0 transition-colors",
                  active
                    ? "text-[#65784D]"
                    : "text-[#85897F] group-hover:text-[#4B5141]",
                ].join(" ")}
                strokeWidth={active ? 2.1 : 1.8}
              />

              <span className="min-w-0 flex-1 truncate">
                {item.label}
              </span>
            </>
          );
        }}
      </NavLink>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className={[
          "fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center",
          "rounded-lg border border-[#E3DED5] bg-white text-[#454C3B] shadow-sm",
          "transition hover:bg-[#F7F5EF] focus-visible:outline-2",
          "focus-visible:outline-offset-2 focus-visible:outline-[#839365]",
          "lg:hidden",
        ].join(" ")}
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-[#24281F]/35 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col",
          "border-r border-[#E3DED5] bg-[#FBF9F5]",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#E9E4DB] px-5">
          <NavLink
            to="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#839365]"
          >
            <span className="min-w-0">
              <span className="block font-heading text-[17px] font-semibold tracking-[-0.04em] text-[#34382D]">
                Laundrify
              </span>
              <span className="mt-0.5 block text-[10px] font-medium tracking-[0.04em] text-[#85897F]">
                LAUNDRY MANAGEMENT
              </span>
            </span>
          </NavLink>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#72766C] transition hover:bg-[#F0EEE7] hover:text-[#34382D] lg:hidden"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          <section aria-label="Workspace navigation">
            <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#979A90]">
              Workspace
            </p>

            <div className="space-y-1">
              {workspaceItems.map(renderMenuItem)}
            </div>
          </section>

          {managementItems.length > 0 && (
            <section aria-label="Management navigation">
              <p className="mb-2.5 px-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#979A90]">
                Management
              </p>

              <div className="space-y-1">
                {managementItems.map(renderMenuItem)}
              </div>
            </section>
          )}
        </nav>

        <div className="shrink-0 border-t border-[#E9E4DB] p-3">
          <button
            type="button"
            onClick={logout}
            className={[
              "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2.5",
              "text-[13px] font-medium text-[#72766C]",
              "transition-colors duration-150 hover:bg-[#F7EAE7] hover:text-[#A34842]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#839365]",
            ].join(" ")}
          >
            <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.8} />
            <span>Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
