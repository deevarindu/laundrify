
import { useAuth } from "../../context/AuthContext";

const Header = () => {
  const { user } = useAuth();

  const initial =
    user?.name?.trim()?.charAt(0).toUpperCase() || "U";

  const roleLabel =
    user?.role === "ADMIN" ? "Administrator" : "Staff";

  return (
    <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-end gap-4 border-b border-[#E3DED5] bg-[#F7F2EB]/95 pl-[76px] pr-4 backdrop-blur-md sm:pl-20 sm:pr-6 lg:px-8">
      <div className="min-w-0 py-3">

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D8DECB] bg-[#E9EDDF] text-sm font-semibold text-[#526441]">
            {initial}
          </div>

          <div className="hidden min-w-0 sm:block">
            <p className="text-[12px] font-semibold text-[#34382D]">
              {roleLabel}
            </p>

            <p className="mt-0.5 text-[10px] text-[#85897F]">
              Laundrify Workspace
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
