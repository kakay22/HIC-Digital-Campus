
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
  ArrowUpRight,
  ClipboardList,
  MessageSquareText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const quickLinks = [
  {
    title: "Manage Teachers",
    description: "Add and update teacher records.",
    icon: Users,
    path: "/dashboard/teachers",
  },
  {
    title: "Evaluation Periods",
    description: "Manage academic years and semesters.",
    icon: CalendarDays,
    path: "/dashboard/periods",
  },
  {
    title: "Evaluation Results",
    description: "Review teacher evaluation results.",
    icon: ClipboardList,
    path: "/dashboard/results",
  },
  {
    title: "Student Suggestions",
    description: "Review submitted suggestions.",
    icon: MessageSquareText,
    path: "/dashboard/suggestions",
  },
];

const statisticConfig = [
  {
    key: "total_teachers",
    label: "Total Teachers",
    description: "Active teacher records",
    icon: Users,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "total_evaluations",
    label: "Evaluations",
    description: "Submitted evaluations",
    icon: Activity,
    color: "bg-blue-50 text-blue-600",
  },
  {
    key: "total_students",
    label: "Registered Students",
    description: "Student records",
    icon: GraduationCap,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "total_subjects",
    label: "Subjects",
    description: "Available subjects",
    icon: BookOpen,
    color: "bg-amber-50 text-amber-600",
  },
];

function formatDate(value) {
  if (!value) return "Date unavailable";

  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DivisionCard({ title, data, accent }) {
  const hasActivePeriod = Boolean(data?.active_period);
  const period = data?.active_period;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Division overview
          </p>
        </div>

        <span className={`h-3 w-3 rounded-full ${accent}`} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Active teachers</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data?.teachers ?? 0}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Evaluations</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {data?.evaluations ?? 0}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          {hasActivePeriod ? (
            <CheckCircle2 size={16} className="text-emerald-600" />
          ) : (
            <Clock3 size={16} className="text-amber-500" />
          )}

          <span className="text-xs font-semibold text-slate-700">
            {hasActivePeriod ? "Active evaluation period" : "No active period"}
          </span>
        </div>

        {period && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">
              {period.academic_year}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {period.semester}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {formatDate(period.start_date)} – {formatDate(period.end_date)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityChart({ activity = [] }) {
  const maximum = Math.max(
    1,
    ...activity.map((item) => Number(item.total) || 0)
  );

  return (
    <div className="mt-6">
      {activity.length === 0 ? (
        <div className="flex min-h-52 items-center justify-center text-sm text-slate-400">
          No evaluation activity available.
        </div>
      ) : (
        <>
          <div className="flex h-48 items-end gap-3 sm:gap-5">
            {activity.map((item) => {
              const total = Number(item.total) || 0;
              const height = total > 0
                ? Math.max((total / maximum) * 100, 5)
                : 2;

              return (
                <div
                  key={item.month}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-semibold text-slate-600">
                    {total}
                  </span>

                  <div className="flex h-36 w-full items-end justify-center">
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-emerald-500 transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${height}%` }}
                      title={`${item.month}: ${total} evaluations`}
                    />
                  </div>

                  <span className="w-full truncate text-center text-[10px] text-slate-400 sm:text-xs">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <ClipboardList size={26} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        No recent evaluations
      </p>

      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        Student evaluation submissions will appear here.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const firstName =
    user?.first_name ||
    user?.full_name?.split(" ")[0] ||
    user?.username ||
    "Administrator";

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/admin/dashboard/summary/");
      setDashboard(response.data);
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load dashboard information. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statistics = dashboard?.statistics || {};
  const activity = dashboard?.evaluation_activity || [];
  const divisions = dashboard?.division_summary || {};
  const recentActivity = dashboard?.recent_activity || [];

  return (
    <div className="space-y-7">

      {/* Error state */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => fetchDashboard()}
            className="text-left text-sm font-semibold text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            System Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Current records from your database.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statisticConfig.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.key}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.label}
                    </p>

                    <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                      {loading
                        ? "—"
                        : Number(statistics[item.key] ?? 0).toLocaleString()}
                    </p>
                  </div>

                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Division summaries */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            Division Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            College and Basic Education evaluation status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DivisionCard
            title="College"
            data={divisions.college}
            accent="bg-emerald-500"
          />

          <DivisionCard
            title="Basic Education"
            data={divisions.basic}
            accent="bg-lime-500"
          />
        </div>
      </section>

      {/* Activity and system status */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Evaluation Activity
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Monthly submissions over the last six months.
              </p>
            </div>

            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Activity size={19} />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
            </div>
          ) : (
            <ActivityChart activity={activity} />
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-slate-900">
            System Status
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Administration overview
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">Admin account</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">Backend API</span>
              <span className="text-xs font-semibold text-emerald-600">
                Authenticated
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">Student evaluation</span>
              <span className="text-xs font-semibold text-emerald-600">
                Available
              </span>
            </div>
          </div>

          <div className="mt-7 rounded-xl bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">
              Administration portal
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Manage teachers, students, evaluation periods,
              questionnaires, and results in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Recent Evaluations
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Latest five student submissions.
            </p>
          </div>

          <Link
            to="/dashboard/results"
            className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View results <ArrowUpRight size={15} />
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-36 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyActivity />
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <GraduationCap size={19} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {item.teacher || "Unknown teacher"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.division === "COLLEGE"
                        ? "College"
                        : "Basic Education"}{" "}
                      · {formatDate(item.submitted_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-13 sm:pl-0">
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {item.overall_rating ?? "N/A"} / 5
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick access */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            Quick Access
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Common administration tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                to={item.path}
                className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>

                <ArrowUpRight
                  size={16}
                  className="shrink-0 text-slate-300 transition group-hover:text-emerald-600"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
