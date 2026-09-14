import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Shirt,
  ClipboardList,
  CreditCard,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
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
];

const Sidebar = () => {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background md:block">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">Laundrify</h1>
      </div>

      <nav className="space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;