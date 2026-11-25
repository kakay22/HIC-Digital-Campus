
import { useState } from "react";
import { Menu, LogOut, UserRound, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminHeader({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);

    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const displayName =
    user?.full_name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    user?.username ||
    "Administrator";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <div className="hidden sm:block">
          <p className="text-xs text-slate-400">Administration</p>
          <p className="text-sm font-semibold text-slate-800">
            Management Portal
          </p>
        </div>

        <div className="sm:hidden">
          <p className="text-sm font-bold text-slate-900">
            Teacher Evaluation
          </p>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-800">
            {displayName}
          </p>
          <p className="text-xs text-slate-400">Administrator</p>
        </div>

        <button
          onClick={() => setMenuOpen((previous) => !previous)}
          className="flex h-10 w-10 items-center justify-center rounded-full  text-emerald-700 transition hover:bg-emerald-200"
          aria-label="Administrator menu"
        >
          <UserRound size={19} />
        </button>

        <button
          onClick={() => setMenuOpen((previous) => !previous)}
          className="hidden items-center gap-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:flex"
          aria-label="Toggle administrator menu"
        >
          <ChevronDown size={15} />
        </button>

        {menuOpen && (
          <>
            <button
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            />

            <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2 sm:hidden">
                <p className="text-sm font-semibold text-slate-800">
                  {displayName}
                </p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
