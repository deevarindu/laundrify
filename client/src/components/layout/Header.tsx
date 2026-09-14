import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back
        </p>
        <p className="font-semibold">{user?.name}</p>
      </div>

      <button
        onClick={logout}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Logout
      </button>
    </header>
  );
};

export default Header;