import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Plus,
    Pencil,
    Lock,
    Unlock,
    CalendarDays,
    X,
    LoaderCircle,
    RefreshCw,
    ChevronDown,
    AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

import evaluationPeriodService from "../../services/Evaluationperiodservice";

/*
 * API fields: id, education_level ("COLLEGE" | "BASIC"), education_level_display,
 * academic_year ("2026-2027"), semester ("1st" | "2nd"), semester_display,
 * start_date, end_date (YYYY-MM-DD), is_open
 */

const DIVISIONS = [
    { label: "All", value: "ALL" },
    { label: "College", value: "COLLEGE" },
    { label: "Basic Education", value: "BASIC" },
];

const DIVISION_LABELS = {
    COLLEGE: "College",
    BASIC: "Basic Education",
};

const SEMESTERS = [
    { value: "1st", label: "1st Semester" },
    { value: "2nd", label: "2nd Semester" },
];

const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getErrorMessage(error) {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (!error?.response) {
        return error?.message || "Cannot reach the server.";
    }

    if (typeof data === "string") {
        // The server sent a whole HTML page (Django 404/500 or the Vite index.html).
        if (/^\s*<(!doctype|html)/i.test(data)) {
            return status === 404
                ? "Endpoint not found (404). Check that the backend has /admin/periods/."
                : `Server error (${status}). Check the backend console for details.`;
        }

        return data.length > 200 ? `${data.slice(0, 200)}...` : data;
    }

    if (!data) return error?.message || "Something went wrong.";
    if (data.detail) return String(data.detail);

    return Object.entries(data)
        .map(([field, messages]) => {
            const message = Array.isArray(messages)
                ? messages.join(", ")
                : typeof messages === "string"
                    ? messages
                    : JSON.stringify(messages);

            return field === "non_field_errors" ? message : `${field}: ${message}`;
        })
        .join("\n");
}

function formatDate(value) {
    if (!value) return "—";

    return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function todayString() {
    return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

// "open" accepts evaluations now, "outside" is marked open but today is
// outside its dates (students still cannot submit), "closed" is closed.
function getPeriodState(period) {
    if (!period.is_open) return "closed";

    const today = todayString();

    return today < period.start_date || today > period.end_date
        ? "outside"
        : "open";
}

function suggestAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();

    return now.getMonth() >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function StatusBadge({ state }) {
    const styles = {
        open: {
            wrapper: "bg-emerald-50 text-emerald-700",
            dot: "bg-emerald-500",
            label: "Open",
        },
        outside: {
            wrapper: "bg-amber-50 text-amber-700",
            dot: "bg-amber-500",
            label: "Open, outside dates",
        },
        closed: {
            wrapper: "bg-slate-100 text-slate-600",
            dot: "bg-slate-400",
            label: "Closed",
        },
    }[state];

    return (
        <span
            title={
                state === "outside"
                    ? "Today is outside this period's dates, so students cannot submit yet."
                    : undefined
            }
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${styles.wrapper}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
            {styles.label}
        </span>
    );
}

function DivisionBadge({ level }) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${level === "BASIC"
                ? "bg-amber-50 text-amber-700"
                : "bg-violet-50 text-violet-700"
                }`}
        >
            {DIVISION_LABELS[level] || level}
        </span>
    );
}

function Stat({ label, value, loading }) {
    return (
        <div className="px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
                {loading ? "–" : value}
            </p>
        </div>
    );
}

function PeriodActions({ period, busy, onEdit, onOpen, onClose, fullWidth }) {
    const base = `inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${fullWidth ? "flex-1" : ""
        }`;

    return (
        <>
            <button
                type="button"
                onClick={() => onEdit(period)}
                disabled={busy}
                className={`${base} border-slate-300 text-slate-700 hover:bg-slate-50`}
            >
                <Pencil size={15} />
                Edit
            </button>

            {period.is_open ? (
                <button
                    type="button"
                    onClick={() => onClose(period)}
                    disabled={busy}
                    className={`${base} border-red-200 text-red-700 hover:bg-red-50`}
                >
                    {busy ? (
                        <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                        <Lock size={15} />
                    )}
                    Close
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => onOpen(period)}
                    disabled={busy}
                    className={`${base} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`}
                >
                    {busy ? (
                        <LoaderCircle size={15} className="animate-spin" />
                    ) : (
                        <Unlock size={15} />
                    )}
                    Open
                </button>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Add / Edit modal                                                    */
/* ------------------------------------------------------------------ */

function PeriodModal({ period, defaultDivision, onClose, onSave, saving }) {
    const isEditing = Boolean(period);

    const [form, setForm] = useState(() => ({
        education_level: period?.education_level || defaultDivision || "COLLEGE",
        academic_year: period?.academic_year || suggestAcademicYear(),
        semester: period?.semester || "1st",
        start_date: period?.start_date || "",
        end_date: period?.end_date || "",
        is_open: period?.is_open || false,
    }));

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !saving) onClose();
        };

        document.addEventListener("keydown", onKeyDown);
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [onClose, saving]);

    const update = (field, value) =>
        setForm((current) => ({ ...current, [field]: value }));

    const handleSubmit = (event) => {
        event.preventDefault();

        const academicYear = form.academic_year.trim();
        const match = academicYear.match(/^(\d{4})-(\d{4})$/);

        if (!match || Number(match[2]) !== Number(match[1]) + 1) {
            toast.error("Academic year must look like 2026-2027.");
            return;
        }

        if (!form.start_date || !form.end_date) {
            toast.error("Start date and end date are required.");
            return;
        }

        if (form.end_date < form.start_date) {
            toast.error("The end date cannot be before the start date.");
            return;
        }

        onSave({ ...form, academic_year: academicYear });
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="period-modal-title"
                className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2
                            id="period-modal-title"
                            className="text-base font-semibold text-slate-900"
                        >
                            {isEditing ? "Edit period" : "New period"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Students can evaluate only while a period is open.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="-mr-1.5 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                        <div>
                            <label
                                htmlFor="education_level"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Division
                            </label>
                            <div className="relative">
                                <select
                                    id="education_level"
                                    value={form.education_level}
                                    onChange={(e) => update("education_level", e.target.value)}
                                    className={`${inputClass} appearance-none pr-10`}
                                >
                                    <option value="COLLEGE">College</option>
                                    <option value="BASIC">Basic Education</option>
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="academic_year"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Academic year
                                </label>
                                <input
                                    id="academic_year"
                                    required
                                    maxLength={9}
                                    value={form.academic_year}
                                    onChange={(e) => update("academic_year", e.target.value)}
                                    placeholder="2026-2027"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="semester"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Semester
                                </label>
                                <div className="relative">
                                    <select
                                        id="semester"
                                        value={form.semester}
                                        onChange={(e) => update("semester", e.target.value)}
                                        className={`${inputClass} appearance-none pr-10`}
                                    >
                                        {SEMESTERS.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        size={16}
                                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="start_date"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Start date
                                </label>
                                <input
                                    id="start_date"
                                    type="date"
                                    required
                                    value={form.start_date}
                                    onChange={(e) => update("start_date", e.target.value)}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="end_date"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    End date
                                </label>
                                <input
                                    id="end_date"
                                    type="date"
                                    required
                                    min={form.start_date || undefined}
                                    value={form.end_date}
                                    onChange={(e) => update("end_date", e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition hover:bg-slate-50">
                            <input
                                type="checkbox"
                                checked={form.is_open}
                                onChange={(e) => update("is_open", e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-violet-600"
                            />
                            <span>
                                <span className="block text-sm font-medium text-slate-700">
                                    Open for evaluations
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                    Opening this period closes any other open period in the same
                                    division.
                                </span>
                            </span>
                        </label>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:rounded-b-2xl">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving && <LoaderCircle size={16} className="animate-spin" />}
                            {saving
                                ? "Saving..."
                                : isEditing
                                    ? "Save changes"
                                    : "Create period"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


/* ------------------------------------------------------------------ */
/* Open / Close confirmation modal                                    */
/* ------------------------------------------------------------------ */

function PeriodActionModal({ action, onClose, onConfirm, loading }) {
    const isOpening = action?.type === "open";
    const period = action?.period;

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !loading) onClose();
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose, loading]);

    if (!period) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onClose();
                }
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="period-action-title"
                aria-describedby="period-action-description"
                className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl sm:zoom-in-95"
            >
                {/* Header */}
                <div className="relative px-6 pb-5 pt-7 text-center sm:pt-8">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close dialog"
                        className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    >
                        <X size={19} />
                    </button>

                    <div
                        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${isOpening
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-red-50 text-red-600"
                            }`}
                    >
                        {isOpening ? (
                            <Unlock size={25} strokeWidth={1.8} />
                        ) : (
                            <Lock size={25} strokeWidth={1.8} />
                        )}
                    </div>

                    <h2
                        id="period-action-title"
                        className="mt-4 text-lg font-semibold tracking-tight text-slate-900"
                    >
                        {isOpening ? "Open evaluation period?" : "Close evaluation period?"}
                    </h2>

                    <p
                        id="period-action-description"
                        className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500"
                    >
                        {isOpening
                            ? "Students in this division will be able to submit their evaluations while the period is open and within its scheduled dates."
                            : "Students in this division will no longer be able to submit evaluations while this period is closed."}
                    </p>
                </div>

                {/* Period details */}
                <div className="mx-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Selected period
                            </p>

                            <p className="mt-1 font-semibold text-slate-900">
                                {period.semester_display || period.semester}
                            </p>

                            <p className="mt-0.5 text-sm text-slate-500">
                                Academic year {period.academic_year}
                            </p>
                        </div>

                        <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${isOpening
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                                }`}
                        >
                            {isOpening ? "Opening" : "Closing"}
                        </span>
                    </div>

                    <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-xs text-slate-500">Division</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">
                            {DIVISION_LABELS[period.education_level] ||
                                period.education_level}
                        </p>
                    </div>
                </div>

                {/* Important notice */}
                <div
                    className={`mx-5 mt-4 flex items-start gap-2.5 rounded-xl p-3 ${isOpening
                        ? "bg-amber-50 text-amber-800"
                        : "bg-red-50 text-red-800"
                        }`}
                >
                    <AlertTriangle size={17} className="mt-0.5 shrink-0" />

                    <p className="text-xs leading-5">
                        {isOpening
                            ? "Any other currently open period in this division will automatically be closed."
                            : "Students will immediately lose the ability to submit evaluations for this period."}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 pb-6 pt-5 sm:flex-row sm:justify-end sm:pb-5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${isOpening
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : "bg-red-600 hover:bg-red-700"
                            }`}
                    >
                        {loading ? (
                            <>
                                <LoaderCircle size={16} className="animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {isOpening ? <Unlock size={16} /> : <Lock size={16} />}
                                {isOpening ? "Yes, open period" : "Yes, close period"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}


/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function EvaluationPeriodsPage() {
    const [periods, setPeriods] = useState([]);
    const [division, setDivision] = useState("ALL");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    const loadPeriods = useCallback(async () => {
        setLoading(true);

        try {
            const data = await evaluationPeriodService.getPeriods();
            setPeriods(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(getErrorMessage(error) || "Unable to load evaluation periods.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPeriods();
    }, [loadPeriods]);

    const visiblePeriods = useMemo(
        () =>
            division === "ALL"
                ? periods
                : periods.filter((p) => p.education_level === division),
        [periods, division],
    );

    // Divisions that currently have no open period (checked on all periods).
    const divisionsWithoutOpenPeriod = useMemo(
        () =>
            ["COLLEGE", "BASIC"].filter(
                (level) =>
                    !periods.some((p) => p.education_level === level && p.is_open),
            ),
        [periods],
    );

    const openCount = periods.filter((p) => p.is_open).length;
    const closedCount = periods.length - openCount;

    const openCreateModal = () => {
        setSelectedPeriod(null);
        setModalOpen(true);
    };

    const openEditModal = (period) => {
        setSelectedPeriod(period);
        setModalOpen(true);
    };

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setSelectedPeriod(null);
    }, []);

    const handleSave = async (data) => {
        setSaving(true);

        try {
            if (selectedPeriod) {
                await evaluationPeriodService.updatePeriod(selectedPeriod.id, data);
                toast.success("Period updated.");
            } else {
                await evaluationPeriodService.createPeriod(data);
                toast.success("Period created.");
            }

            closeModal();
            await loadPeriods();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (period, action, successMessage) => {
        setBusyId(period.id);

        try {
            await action(period.id);
            toast.success(successMessage);
            await loadPeriods();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusyId(null);
        }
    };


    const handleOpen = (period) => {
        setPendingAction({
            type: "open",
            period,
        });
    };

    const handleClose = (period) => {
        setPendingAction({
            type: "close",
            period,
        });
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;

        const { period, type } = pendingAction;

        setBusyId(period.id);

        try {
            if (type === "open") {
                await evaluationPeriodService.openPeriod(period.id);
                toast.success("Evaluation period opened successfully.");
            } else {
                await evaluationPeriodService.closePeriod(period.id);
                toast.success("Evaluation period closed successfully.");
            }

            setPendingAction(null);
            await loadPeriods();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setBusyId(null);
        }
    };


    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                        Evaluation periods
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Set semester schedules and control when students can submit
                        evaluations.
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">New period</span>
                    <span className="sm:hidden">New</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
                <Stat label="Total" value={periods.length} loading={loading} />
                <Stat label="Open" value={openCount} loading={loading} />
                <Stat label="Closed" value={closedCount} loading={loading} />
            </div>

            {/* Warning when a division cannot accept evaluations */}
            {!loading && divisionsWithoutOpenPeriod.length > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
                    <div className="text-sm">
                        <p className="font-medium text-amber-900">
                            {divisionsWithoutOpenPeriod
                                .map((level) => DIVISION_LABELS[level])
                                .join(" and ")}{" "}
                            {divisionsWithoutOpenPeriod.length > 1 ? "have" : "has"} no open
                            period
                        </p>
                        <p className="mt-0.5 text-amber-800">
                            Students there cannot submit evaluations until a period is opened.
                        </p>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
                    <div
                        role="tablist"
                        aria-label="Filter by division"
                        className="-mx-1 flex gap-1 overflow-x-auto px-1"
                    >
                        {DIVISIONS.map((item) => (
                            <button
                                key={item.value}
                                role="tab"
                                aria-selected={division === item.value}
                                onClick={() => setDivision(item.value)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${division === item.value
                                    ? "bg-violet-50 text-violet-700"
                                    : "text-slate-600 hover:bg-slate-100"
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={loadPeriods}
                        disabled={loading}
                        aria-label="Refresh"
                        title="Refresh"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <LoaderCircle size={24} className="animate-spin text-violet-600" />
                        <p className="mt-3 text-sm text-slate-500">
                            Loading evaluation periods...
                        </p>
                    </div>
                ) : visiblePeriods.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <CalendarDays size={22} />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">
                            No evaluation periods
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {division === "ALL"
                                ? "Create your first period to let students start evaluating."
                                : "There are no periods for this division yet."}
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                            <Plus size={16} />
                            New period
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Mobile list */}
                        <ul className="divide-y divide-slate-100 lg:hidden">
                            {visiblePeriods.map((period) => (
                                <li key={period.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {period.semester_display || period.semester}
                                            </p>
                                            <p className="mt-0.5 text-sm text-slate-500">
                                                Academic year {period.academic_year}
                                            </p>
                                            <div className="mt-2">
                                                <DivisionBadge level={period.education_level} />
                                            </div>
                                        </div>

                                        <StatusBadge state={getPeriodState(period)} />
                                    </div>

                                    <p className="mt-3 text-sm text-slate-600">
                                        {formatDate(period.start_date)} to{" "}
                                        {formatDate(period.end_date)}
                                    </p>

                                    <div className="mt-3 flex gap-2">
                                        <PeriodActions
                                            period={period}
                                            busy={busyId === period.id}
                                            onEdit={openEditModal}
                                            onOpen={handleOpen}
                                            onClose={handleClose}
                                            fullWidth
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Period</th>
                                        <th className="px-5 py-3 font-medium">Division</th>
                                        <th className="px-5 py-3 font-medium">Schedule</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {visiblePeriods.map((period) => (
                                        <tr key={period.id} className="transition hover:bg-slate-50">
                                            <td className="px-5 py-3.5">
                                                <p className="font-medium text-slate-900">
                                                    {period.semester_display || period.semester}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Academic year {period.academic_year}
                                                </p>
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <DivisionBadge level={period.education_level} />
                                            </td>

                                            <td className="px-5 py-3.5 text-slate-600">
                                                {formatDate(period.start_date)} to{" "}
                                                {formatDate(period.end_date)}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <StatusBadge state={getPeriodState(period)} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-2">
                                                    <PeriodActions
                                                        period={period}
                                                        busy={busyId === period.id}
                                                        onEdit={openEditModal}
                                                        onOpen={handleOpen}
                                                        onClose={handleClose}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {modalOpen && (
                <PeriodModal
                    period={selectedPeriod}
                    defaultDivision={division !== "ALL" ? division : "COLLEGE"}
                    onClose={closeModal}
                    onSave={handleSave}
                    saving={saving}
                />
            )}


            {pendingAction && (
                <PeriodActionModal
                    action={pendingAction}
                    loading={busyId === pendingAction.period.id}
                    onClose={() => {
                        if (!busyId) setPendingAction(null);
                    }}
                    onConfirm={handleConfirmAction}
                />
            )}

        </div>
    );
}