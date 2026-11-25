
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MessageSquareText,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock3,
  CheckCircle2,
  CircleAlert,
  MessageCircle,
  Filter,
  GraduationCap,
  CalendarDays,
  Save,
  LoaderCircle,
  Inbox,
} from "lucide-react";
import toast from "react-hot-toast";

import suggestionsService from "../../services/suggestionsService";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "IMPLEMENTED", label: "Implemented" },
  { value: "DECLINED", label: "Declined" },
];

const CATEGORY_OPTIONS = [
  { value: "SHORTER_FORM", label: "Shorter form" },
  { value: "BETTER_QUESTIONS", label: "Better questions" },
  { value: "ANONYMITY", label: "Anonymity" },
  { value: "EARLIER", label: "Earlier evaluation" },
  { value: "SEE_RESULTS", label: "See results" },
  { value: "MOBILE", label: "Mobile experience" },
  { value: "OTHER", label: "Other" },
];

const STATUS_STYLES = {
  NEW: "bg-blue-50 text-blue-700 ring-blue-600/15",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/15",
  IMPLEMENTED: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  DECLINED: "bg-rose-50 text-rose-700 ring-rose-600/15",
};

const EMPTY_SUMMARY = {
  total: 0,
  new: 0,
  under_review: 0,
  implemented: 0,
  declined: 0,
};

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCategoryLabel(category) {
  return (
    CATEGORY_OPTIONS.find((item) => item.value === category)?.label ||
    category
  );
}

function StatusBadge({ status }) {
  const label =
    STATUS_OPTIONS.find((item) => item.value === status)?.label || status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] || "bg-gray-100 text-gray-700 ring-gray-500/10"
      }`}
    >
      {label}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, iconClass }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${iconClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-gray-500">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SuggestionDetails({
  suggestion,
  onClose,
  onUpdated,
}) {
  const [status, setStatus] = useState(suggestion.status || "NEW");
  const [adminNotes, setAdminNotes] = useState(suggestion.admin_notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(suggestion.status || "NEW");
    setAdminNotes(suggestion.admin_notes || "");
  }, [suggestion]);

  const handleSave = async () => {
    setSaving(true);

    try {
      await suggestionsService.updateSuggestion(suggestion.id, {
        status,
        admin_notes: adminNotes,
      });

      toast.success("Suggestion updated successfully.");
      onUpdated(suggestion.id);
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.status ||
        "Unable to update this suggestion.";

      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/40">
      <button
        type="button"
        aria-label="Close suggestion details"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Suggestion details
            </p>
            <h2 className="mt-1 text-lg font-bold text-gray-900">
              Suggestion #{suggestion.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={suggestion.status} />
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {suggestion.education_level === "BASIC"
                ? "Basic Education"
                : "College"}
            </span>
          </div>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Suggestion
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-800">
              {suggestion.message || "No written suggestion was provided."}
            </p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Categories
            </h3>

            <div className="mt-3 flex flex-wrap gap-2">
              {(suggestion.category_labels?.length
                ? suggestion.category_labels
                : (suggestion.categories || []).map(getCategoryLabel)
              ).map((category) => (
                <span
                  key={category}
                  className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
                >
                  {category}
                </span>
              ))}

              {!suggestion.categories?.length && (
                <span className="text-sm text-gray-400">No category selected</span>
              )}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
            <div>
              <p className="text-xs text-gray-500">Student name</p>
              <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                {suggestion.student_name || "Anonymous"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Student ID</p>
              <p className="mt-1 break-words text-sm font-semibold text-gray-800">
                {suggestion.student_id || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Academic year</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {suggestion.academic_year || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Semester</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {suggestion.semester || "—"}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {formatDate(suggestion.created_at)}
              </p>
            </div>
          </section>

          <section className="space-y-3 border-t border-gray-100 pt-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Manage suggestion
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Update its progress and leave an internal administrator note.
              </p>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Status
              </span>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Administrator notes
              </span>

              <textarea
                value={adminNotes}
                onChange={(event) => setAdminNotes(event.target.value)}
                rows={5}
                placeholder="Add an internal note about this suggestion..."
                className="w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save changes
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    education_level: "",
    academic_year: "",
    semester: "",
    category: "",
    status: "",
    page: 1,
    page_size: 20,
  });

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
  });

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }));
  };

  const fetchSuggestions = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await suggestionsService.getSuggestions(filters);

        setSuggestions(data.results || []);
        setSummary(data.summary || EMPTY_SUMMARY);

        setPagination({
          count: data.count || 0,
          next: data.next || null,
          previous: data.previous || null,
        });

        setSelectedSuggestion((current) => {
          if (!current) return null;

          return (
            (data.results || []).find((item) => item.id === current.id) ||
            current
          );
        });
      } catch (error) {
        const message =
          error.response?.data?.detail ||
          "Unable to load student suggestions.";

        toast.error(message);
        setSuggestions([]);
        setSummary(EMPTY_SUMMARY);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleSuggestionUpdated = async (id) => {
    await fetchSuggestions({ silent: true });

    try {
      const updated = await suggestionsService.getSuggestion(id);
      setSelectedSuggestion(updated);
    } catch {
      setSelectedSuggestion(null);
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(pagination.count / filters.page_size),
  );

  const showingStart =
    pagination.count === 0
      ? 0
      : (filters.page - 1) * filters.page_size + 1;

  const showingEnd = Math.min(
    filters.page * filters.page_size,
    pagination.count,
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.education_level ||
          filters.academic_year ||
          filters.semester ||
          filters.category ||
          filters.status,
      ),
    [filters],
  );

  const clearFilters = () => {
    setFilters((current) => ({
      ...current,
      search: "",
      education_level: "",
      academic_year: "",
      semester: "",
      category: "",
      status: "",
      page: 1,
    }));
  };

  return (
    <div className="min-h-full space-y-6 pb-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
              <MessageSquareText size={21} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Student Suggestions
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Review student feedback and track suggestions for improving the
            evaluation system.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchSuggestions({ silent: true })}
          disabled={refreshing || loading}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard
          title="Total suggestions"
          value={summary.total}
          icon={MessageSquareText}
          iconClass="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          title="New"
          value={summary.new}
          icon={CircleAlert}
          iconClass="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="Under review"
          value={summary.under_review}
          icon={Clock3}
          iconClass="bg-amber-50 text-amber-600"
        />
        <SummaryCard
          title="Implemented"
          value={summary.implemented}
          icon={CheckCircle2}
          iconClass="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          title="Declined"
          value={summary.declined}
          icon={MessageCircle}
          iconClass="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={17} className="text-gray-500" />
            <h2 className="text-sm font-bold text-gray-900">
              Filter suggestions
            </h2>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="block sm:col-span-2 xl:col-span-2">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">
              Search
            </span>

            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={filters.search}
                onChange={(event) =>
                  updateFilter("search", event.target.value)
                }
                placeholder="Search message, student name or ID..."
                className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </label>

          <FilterSelect
            label="Division"
            value={filters.education_level}
            onChange={(value) => updateFilter("education_level", value)}
            options={[
              { value: "", label: "All divisions" },
              { value: "COLLEGE", label: "College" },
              { value: "BASIC", label: "Basic Education" },
            ]}
          />

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">
              Academic year
            </span>
            <input
              value={filters.academic_year}
              onChange={(event) =>
                updateFilter("academic_year", event.target.value)
              }
              placeholder="e.g. 2026-2027"
              className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <FilterSelect
            label="Semester"
            value={filters.semester}
            onChange={(value) => updateFilter("semester", value)}
            options={[
              { value: "", label: "All semesters" },
              { value: "1st", label: "1st Semester" },
              { value: "2nd", label: "2nd Semester" },
            ]}
          />

          <FilterSelect
            label="Category"
            value={filters.category}
            onChange={(value) => updateFilter("category", value)}
            options={[
              { value: "", label: "All categories" },
              ...CATEGORY_OPTIONS,
            ]}
          />

          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={[
              { value: "", label: "All statuses" },
              ...STATUS_OPTIONS,
            ]}
          />
        </div>
      </section>

      {/* Suggestions table */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Submitted suggestions
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Select a suggestion to view its details and update its status.
            </p>
          </div>

          <span className="text-xs font-medium text-gray-500">
            {pagination.count.toLocaleString()} result
            {pagination.count === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-gray-500">
            <LoaderCircle size={26} className="animate-spin text-indigo-600" />
            <p className="text-sm">Loading suggestions...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-2xl bg-gray-100 p-4 text-gray-400">
              <Inbox size={28} />
            </div>
            <h3 className="mt-4 text-sm font-bold text-gray-900">
              No suggestions found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : "Student suggestions will appear here once they are submitted."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {suggestions.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion.id}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  className="group flex w-full flex-col gap-3 px-4 py-4 text-left transition hover:bg-gray-50 sm:px-5"
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">
                          #{suggestion.id}
                        </span>
                        <StatusBadge status={suggestion.status} />
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {suggestion.education_level === "BASIC"
                            ? "Basic Education"
                            : "College"}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-gray-800">
                        {suggestion.message || "Category-only suggestion"}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-lg p-2 text-gray-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <Eye size={18} />
                    </div>
                  </div>

                  <div className="flex w-full flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1.5">
                        <GraduationCap size={14} />
                        {suggestion.student_name || "Anonymous"}
                      </span>

                      {suggestion.student_id && (
                        <span>ID: {suggestion.student_id}</span>
                      )}

                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={13} />
                        {formatDate(suggestion.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(suggestion.category_labels || [])
                        .slice(0, 2)
                        .map((category) => (
                          <span
                            key={category}
                            className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700"
                          >
                            {category}
                          </span>
                        ))}

                      {(suggestion.category_labels || []).length > 2 && (
                        <span className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-500">
                          +{suggestion.category_labels.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-xs text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {showingStart}–{showingEnd}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {pagination.count}
                </span>
              </p>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>

                <span className="px-2 text-xs font-medium text-gray-500">
                  Page {filters.page} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={filters.page >= totalPages}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedSuggestion && (
        <SuggestionDetails
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onUpdated={handleSuggestionUpdated}
        />
      )}
    </div>
  );
}
