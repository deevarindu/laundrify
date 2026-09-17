import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-20 items-center justify-between border-b border-[#DED8CF] bg-[#F7F2EB] px-6 md:px-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B9A6E]">
          Welcome back
        </p>

        <p className="mt-1 text-md font-semibold text-[#8B9A6E]">
          {user?.name}
        </p>
      </div>

      <button
        onClick={logout}
        className="rounded-xl border border-[#D8D2C9] bg-white px-4 py-2 text-sm font-medium text-[#4B5141] shadow-sm transition-colors hover:bg-[#EAE2D6] hover:text-[#30352A]"
      >
        Logout
      </button>
    </header>
  );
};

export default Header;