
import { NavLink } from "react-router-dom";
import {
  Activity,
  BookOpen,
  CalendarDays,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Users,
  UserRound,
  X,
} from "lucide-react";

const navigation = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Teachers", path: "/dashboard/teachers", icon: Users },
      { label: "Students", path: "/dashboard/students", icon: GraduationCap },
    ],
  },
  {
    title: "EVALUATION",
    items: [
      { label: "Evaluation Periods", path: "/dashboard/periods", icon: CalendarDays },
      { label: "Questionnaire", path: "/dashboard/questionnaire", icon: BookOpen },
    ],
  },
  {
    title: "RESULTS & FEEDBACK",
    items: [
      { label: "Evaluation Results", path: "/dashboard/results", icon: Activity },
      { label: "Reports", path: "/dashboard/reports", icon: FileBarChart },
      { label: "Suggestions", path: "/dashboard/suggestions", icon: MessageSquareText },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Profile & Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function AdminSidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 transition-opacity lg:hidden ${
          isOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-emerald-100 bg-white transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* HIC Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-emerald-50 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-50">
              <img
                src="src/assets/HIC_LOGO_TRANSPARENT.png"
                alt="Holy Infant College logo"
                className="h-full w-full object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                Holy Infant College
              </p>
              <p className="text-[11px] font-medium text-emerald-600">
                Administration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {navigation.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.12em] text-slate-400">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "text-slate-600 hover:bg-emerald-50/70 hover:text-emerald-800"
                        }`
                      }
                    >
                      <Icon size={18} strokeWidth={1.9} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-emerald-50 p-4">
          <div className="rounded-xl bg-emerald-50/70 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <UserRound size={16} />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-800">
                  Admin Portal
                </p>
                <p className="text-[10px] text-emerald-600">
                  HIC Digital Campus
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
