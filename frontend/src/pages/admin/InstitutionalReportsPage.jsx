import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertCircle,
    BarChart3,
    Download,
    FileSpreadsheet,
    Printer,
    RefreshCw,
    Users,
    ClipboardList,
    GraduationCap,
    Star,
} from "lucide-react";

import evaluationResultsService from "../../services/evaluationResultsService";
import "./InstitutionalReportsPage.css";

const INITIAL_FILTERS = {
    education_level: "BOTH",
    academic_year: "",
    semester: "",
};

const RATING_LABELS = {
    "5": "Outstanding",
    "4": "Good",
    "3": "Average",
    "2": "Needs Improvement",
    "1": "Unsatisfactory",
    N: "Not Observed",
};

const numberFormat = new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
});

function formatNumber(value, digits = 2) {
    const number = Number(value ?? 0);

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: digits,
    });
}

function formatPercent(value) {
    return `${formatNumber(value, 1)}%`;
}

function getDivisionName(value) {
    if (value === "COLLEGE") return "College";
    if (value === "BASIC") return "Basic Education";
    return value || "Unknown";
}

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (typeof data === "string") return data;

    if (data?.detail) return data.detail;

    if (data && typeof data === "object") {
        return Object.entries(data)
            .map(([key, value]) => {
                const message = Array.isArray(value)
                    ? value.join(", ")
                    : String(value);

                return `${key}: ${message}`;
            })
            .join(" ");
    }

    return error?.message || "Unable to load institutional reports.";
}

function StatCard({ title, value, description, icon: Icon }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">
                        {value}
                    </p>
                    {description && (
                        <p className="mt-1 text-xs text-gray-500">{description}</p>
                    )}
                </div>

                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                    <Icon size={20} />
                </div>
            </div>
        </div>
    );
}

function SectionHeading({ title, description, action }) {
    return (
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div>
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
                {description && (
                    <p className="mt-1 text-sm text-gray-500">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}

function EmptyState({ message = "No data available for the selected filters." }) {
    return (
        <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center">
            <BarChart3 className="mx-auto mb-3 text-gray-400" size={25} />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}

function DivisionComparison({ rows = [] }) {
    if (!rows.length) return <EmptyState />;

    const maxEvaluations = Math.max(
        1,
        ...rows.map((row) => Number(row.total_evaluations || 0))
    );

    return (
        <div className="space-y-6">
            {rows.map((row) => {
                const evaluations = Number(row.total_evaluations || 0);
                const average = Number(row.overall_average || 0);
                const percentage = (evaluations / maxEvaluations) * 100;

                return (
                    <div key={row.education_level}>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {row.division_name || getDivisionName(row.education_level)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatNumber(row.teachers_evaluated, 0)} teachers evaluated
                                </p>
                            </div>

                            <div className="text-right">
                                <p className="text-lg font-semibold text-gray-900">
                                    {formatNumber(average)}
                                    <span className="ml-1 text-xs font-normal text-gray-500">
                                        / 5
                                    </span>
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatNumber(evaluations, 0)} evaluations
                                </p>
                            </div>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PeriodTrends({ rows = [] }) {
    if (!rows.length) return <EmptyState />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <th className="px-3 py-3 font-medium">Division</th>
                        <th className="px-3 py-3 font-medium">Academic year</th>
                        <th className="px-3 py-3 font-medium">Semester</th>
                        <th className="px-3 py-3 text-right font-medium">Evaluations</th>
                        <th className="px-3 py-3 text-right font-medium">Teachers</th>
                        <th className="px-3 py-3 text-right font-medium">Average</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((row, index) => (
                        <tr
                            key={`${row.education_level}-${row.academic_year}-${row.semester}-${index}`}
                            className="border-b border-gray-100 last:border-0"
                        >
                            <td className="px-3 py-3 font-medium text-gray-800">
                                {getDivisionName(row.education_level)}
                            </td>
                            <td className="px-3 py-3 text-gray-600">
                                {row.academic_year || "—"}
                            </td>
                            <td className="px-3 py-3 text-gray-600">
                                {row.semester || "—"}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                                {formatNumber(row.total_evaluations, 0)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-700">
                                {formatNumber(row.teachers_evaluated, 0)}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums text-gray-900">
                                {formatNumber(row.overall_average)}
                                <span className="ml-1 text-xs font-normal text-gray-400">
                                    / 5
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function SectionPerformance({ rows = [] }) {
    if (!rows.length) return <EmptyState />;

    const maxAverage = 5;

    return (
        <div className="space-y-5">
            {rows.map((row, index) => {
                const average = Number(row.average_rating || 0);
                const width = Math.max(0, Math.min(100, (average / maxAverage) * 100));

                return (
                    <div key={`${row.education_level}-${row.section_id}-${index}`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-800">
                                    {row.prefix ? `${row.prefix} — ` : ""}
                                    {row.title || "Untitled section"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {getDivisionName(row.education_level)} ·{" "}
                                    {formatNumber(row.total_responses, 0)} section records
                                </p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-gray-900">
                                {formatNumber(average)} / 5
                            </p>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RatingDistribution({ rows = [] }) {
    if (!rows.length) return <EmptyState />;

    const total = rows.reduce(
        (sum, row) => sum + Number(row.total || row.count || 0),
        0
    );

    return (
        <div className="space-y-4">
            {rows.map((row, index) => {
                const rating = String(row.rating ?? "");
                const count = Number(row.total || row.count || 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                    <div key={`${rating}-${row.education_level}-${index}`}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">
                                    {RATING_LABELS[rating] || `Rating ${rating}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {row.education_level
                                        ? getDivisionName(row.education_level)
                                        : "All divisions"}
                                </p>
                            </div>

                            <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-gray-900">
                                    {formatNumber(count, 0)}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatPercent(percentage)}
                                </p>
                            </div>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function downloadCsv(data) {
    const rows = [
        ["Institutional Evaluation Report"],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Summary"],
        ["Total evaluations", data.statistics?.total_evaluations ?? 0],
        ["Teachers evaluated", data.statistics?.teachers_evaluated ?? 0],
        ["Active teachers", data.statistics?.total_active_teachers ?? 0],
        ["Participation rate", data.statistics?.participation_rate ?? 0],
        ["Overall average", data.statistics?.overall_average ?? 0],
        ["Numeric responses", data.statistics?.numeric_responses ?? 0],
        ["Not observed responses", data.statistics?.not_observed_responses ?? 0],
        [],
        ["Division comparison"],
        [
            "Division",
            "Evaluations",
            "Teachers evaluated",
            "Overall average",
        ],
        ...(data.division_comparison || []).map((row) => [
            row.division_name || getDivisionName(row.education_level),
            row.total_evaluations ?? 0,
            row.teachers_evaluated ?? 0,
            row.overall_average ?? 0,
        ]),
        [],
        ["Period trends"],
        [
            "Division",
            "Academic year",
            "Semester",
            "Evaluations",
            "Teachers evaluated",
            "Average",
        ],
        ...(data.period_trends || []).map((row) => [
            getDivisionName(row.education_level),
            row.academic_year ?? "",
            row.semester ?? "",
            row.total_evaluations ?? 0,
            row.teachers_evaluated ?? 0,
            row.overall_average ?? 0,
        ]),
        [],
        ["Section performance"],
        ["Division", "Section", "Average rating", "Total responses"],
        ...(data.section_performance || []).map((row) => [
            getDivisionName(row.education_level),
            `${row.prefix || ""} ${row.title || ""}`.trim(),
            row.average_rating ?? 0,
            row.total_responses ?? 0,
        ]),
        [],
        ["Rating distribution"],
        ["Division", "Rating", "Rating label", "Count"],
        ...(data.rating_distribution || []).map((row) => [
            getDivisionName(row.education_level),
            row.rating ?? "",
            RATING_LABELS[String(row.rating)] || "",
            row.total ?? row.count ?? 0,
        ]),
    ];

    const escapeCell = (value) =>
        `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "institutional-evaluation-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export default function InstitutionalReportsPage() {
    const [filters, setFilters] = useState(INITIAL_FILTERS);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadReport = useCallback(async (activeFilters = filters) => {
        setLoading(true);
        setError("");

        try {
            const data =
                await evaluationResultsService.getInstitutionalReports(
                    activeFilters
                );

            setReport(data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        loadReport(INITIAL_FILTERS);
        // Load the initial report once when the page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const availableYears = useMemo(() => {
        const years = (report?.available_periods || [])
            .map((period) => period.academic_year)
            .filter(Boolean);

        return [...new Set(years)].sort().reverse();
    }, [report]);

    const statistics = report?.statistics || {};

    const handleFilterChange = (key, value) => {
        setFilters((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const handleApplyFilters = () => {
        loadReport(filters);
    };

    const handleResetFilters = () => {
        setFilters(INITIAL_FILTERS);
        loadReport(INITIAL_FILTERS);
    };

    const handleExport = () => {
        if (report) downloadCsv(report);
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Page header */}
            {/* Screen header */}
            <div className="report-screen-header flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm text-indigo-600">
                        <BarChart3 size={17} />
                        <span className="font-medium">Analytics & Reports</span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Institutional Reports
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        View institution-wide evaluation performance and compare academic divisions.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        disabled={!report || loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Printer size={16} />
                        Print report
                    </button>

                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={!report || loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Activity size={17} className="text-gray-500" />
                    <h2 className="text-sm font-semibold text-gray-900">
                        Report filters
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label
                            htmlFor="report-division"
                            className="mb-1.5 block text-xs font-medium text-gray-600"
                        >
                            Education division
                        </label>
                        <select
                            id="report-division"
                            value={filters.education_level}
                            onChange={(event) =>
                                handleFilterChange("education_level", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="BOTH">All divisions</option>
                            <option value="COLLEGE">College</option>
                            <option value="BASIC">Basic Education</option>
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="report-year"
                            className="mb-1.5 block text-xs font-medium text-gray-600"
                        >
                            Academic year
                        </label>
                        <select
                            id="report-year"
                            value={filters.academic_year}
                            onChange={(event) =>
                                handleFilterChange("academic_year", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="">All academic years</option>
                            {availableYears.map((year) => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label
                            htmlFor="report-semester"
                            className="mb-1.5 block text-xs font-medium text-gray-600"
                        >
                            Semester
                        </label>
                        <select
                            id="report-semester"
                            value={filters.semester}
                            onChange={(event) =>
                                handleFilterChange("semester", event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="">All semesters</option>
                            <option value="1st">1st Semester</option>
                            <option value="2nd">2nd Semester</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                            type="button"
                            onClick={handleApplyFilters}
                            disabled={loading}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
                        >
                            <BarChart3 size={16} />
                            Apply
                        </button>

                        <button
                            type="button"
                            onClick={handleResetFilters}
                            disabled={loading}
                            title="Reset filters"
                            className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2.5 text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Formal print document heading */}
            {report && (
                <div className="print-document-header hidden">
                    <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-widest">
                            Republic of the Philippines
                        </p>

                        <h1 className="mt-2 text-xl font-bold uppercase">
                            Institutional Evaluation Report
                        </h1>

                        <p className="mt-1 text-sm">
                            Faculty Performance Evaluation Summary
                        </p>

                        <div className="mx-auto mt-4 max-w-2xl border-t border-b border-gray-800 py-3">
                            <div className="grid grid-cols-3 gap-4 text-left text-xs">
                                <div>
                                    <strong>Division</strong>
                                    <p className="mt-1">
                                        {filters.education_level === "BOTH"
                                            ? "All Divisions"
                                            : getDivisionName(filters.education_level)}
                                    </p>
                                </div>

                                <div>
                                    <strong>Academic Year</strong>
                                    <p className="mt-1">
                                        {filters.academic_year || "All Academic Years"}
                                    </p>
                                </div>

                                <div>
                                    <strong>Semester</strong>
                                    <p className="mt-1">
                                        {filters.semester
                                            ? `${filters.semester} Semester`
                                            : "All Semesters"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="mt-3 text-right text-xs">
                            Date generated: {new Date().toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 shrink-0" size={18} />
                    <div className="min-w-0">
                        <p className="font-semibold">Unable to load report</p>
                        <p className="mt-1 break-words">{error}</p>
                        <button
                            type="button"
                            onClick={() => loadReport(filters)}
                            className="mt-2 font-semibold underline underline-offset-2"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {loading && !report ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
                    <RefreshCw className="mx-auto mb-3 animate-spin text-indigo-600" />
                    <p className="text-sm text-gray-500">
                        Loading institutional report...
                    </p>
                </div>
            ) : report ? (
                <div className={`report-content ${loading ? "opacity-60" : ""}`}>
                    {/* Summary statistics */}
                    <div className="report-summary mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            title="Total evaluations"
                            value={formatNumber(statistics.total_evaluations, 0)}
                            description="Submitted evaluation records"
                            icon={ClipboardList}
                        />

                        <StatCard
                            title="Teachers evaluated"
                            value={formatNumber(statistics.teachers_evaluated, 0)}
                            description="Distinct teachers with evaluations"
                            icon={GraduationCap}
                        />

                        <StatCard
                            title="Participation rate"
                            value={formatPercent(statistics.participation_rate)}
                            description={`${formatNumber(
                                statistics.total_active_teachers,
                                0
                            )} active teachers`}
                            icon={Users}
                        />

                        <StatCard
                            title="Overall average"
                            value={`${formatNumber(statistics.overall_average)} / 5`}
                            description="Institutional evaluation average"
                            icon={Star}
                        />
                    </div>

                    {/* Response totals */}
                    <div className="report-summary mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                                Numeric responses
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-900">
                                {formatNumber(statistics.numeric_responses, 0)}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                                Not observed responses
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-900">
                                {formatNumber(statistics.not_observed_responses, 0)}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                            <p className="text-xs font-medium text-gray-500">
                                Total responses
                            </p>
                            <p className="mt-1 text-xl font-semibold text-gray-900">
                                {formatNumber(statistics.total_responses, 0)}
                            </p>
                        </div>
                    </div>

                    {/* Division comparison */}
                    <section className="report-section mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <SectionHeading
                            title="Division comparison"
                            description="Compare evaluation volume and average performance across divisions."
                        />

                        <DivisionComparison rows={report.division_comparison || []} />
                    </section>

                    {/* Period trends */}
                    <section className="report-section mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                        <SectionHeading
                            title="Academic period trends"
                            description="Evaluation activity and average ratings by academic year and semester."
                        />

                        <PeriodTrends rows={report.period_trends || []} />
                    </section>

                    {/* Section and rating analysis */}
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <SectionHeading
                                title="Section performance"
                                description="Average rating for each evaluation questionnaire section."
                            />

                            <SectionPerformance
                                rows={report.section_performance || []}
                            />
                        </section>

                        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <SectionHeading
                                title="Rating distribution"
                                description="Distribution of submitted numeric and not-observed answers."
                            />

                            <RatingDistribution
                                rows={report.rating_distribution || []}
                            />
                        </section>
                    </div>

                    <p className="mt-5 text-xs text-gray-400">
                        Report data is based on submitted evaluations matching the selected
                        filters. Average ratings are displayed on a 5-point scale.
                    </p>
                </div>
            ) : (
                !error && <EmptyState message="No report data was returned." />
            )}
        </div>
    );
}