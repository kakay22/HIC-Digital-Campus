import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Users,
    Search,
    Plus,
    Pencil,
    Archive,
    BookOpen,
    X,
    LoaderCircle,
    RefreshCw,
    ChevronDown,
    BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";

import teacherService from "../../services/teacherService";
import TeacherSectionRatingsModal from "../../components/admin/TeacherSectionRatingsModal";

const DIVISIONS = [
    { label: "All", value: "ALL" },
    { label: "College", value: "COLLEGE" },
    { label: "Basic Education", value: "BASIC" },
];

const EMPTY_FORM = {
    first_name: "",
    last_name: "",
    specialization: "",
    education_level: "COLLEGE",
    courses: [],
};

const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (!data) return error?.message || "Something went wrong.";
    if (typeof data === "string") return data;

    return Object.entries(data)
        .map(([field, messages]) => {
            const message = Array.isArray(messages)
                ? messages.join(", ")
                : typeof messages === "string"
                    ? messages
                    : JSON.stringify(messages);

            return `${field}: ${message}`;
        })
        .join("\n");
}

function getFullName(teacher) {
    return (
        teacher.full_name ||
        `${teacher.first_name || ""} ${teacher.last_name || ""}`.trim()
    );
}

function getInitials(teacher) {
    return (
        (teacher.first_name?.[0] || "") + (teacher.last_name?.[0] || "")
    ).toUpperCase();
}

function levelLabel(level) {
    return level === "COLLEGE" ? "College" : "Basic Education";
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function Avatar({ teacher }) {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
            {getInitials(teacher)}
        </div>
    );
}

function StatusBadge({ archived }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${archived
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
                }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${archived ? "bg-amber-500" : "bg-emerald-500"
                    }`}
            />
            {archived ? "Archived" : "Active"}
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

function IconButton({ label, onClick, tone = "default", children }) {
    const tones = {
        default: "hover:bg-slate-100 hover:text-slate-900",
        danger: "hover:bg-amber-50 hover:text-amber-700",
    };

    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`rounded-lg p-2 text-slate-500 transition ${tones[tone]}`}
        >
            {children}
        </button>
    );
}

/* ------------------------------------------------------------------ */
/* Add / Edit modal                                                    */
/* ------------------------------------------------------------------ */

function TeacherModal({ teacher, courses, onClose, onSave, saving }) {
    const [form, setForm] = useState(() => ({
        ...EMPTY_FORM,
        ...(teacher || {}),
        specialization: teacher?.specialization || "",
        courses: teacher?.courses || [],
    }));

    const isEditing = Boolean(teacher);

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

    const updateField = (field, value) => {
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === "education_level" && value === "BASIC"
                ? { courses: [] }
                : {}),
        }));
    };

    const toggleCourse = (courseId) => {
        setForm((current) => ({
            ...current,
            courses: current.courses.includes(courseId)
                ? current.courses.filter((id) => id !== courseId)
                : [...current.courses, courseId],
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!form.first_name.trim() || !form.last_name.trim()) {
            toast.error("First name and last name are required.");
            return;
        }

        onSave({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            specialization: form.specialization.trim(),
            education_level: form.education_level,
            courses: form.education_level === "COLLEGE" ? form.courses : [],
        });
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
                aria-labelledby="teacher-modal-title"
                className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2
                            id="teacher-modal-title"
                            className="text-base font-semibold text-slate-900"
                        >
                            {isEditing ? "Edit teacher" : "Add teacher"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            {isEditing
                                ? "Update the teacher's details."
                                : "Create a new teacher record."}
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

                {/* Body */}
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="first_name"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    First name
                                </label>
                                <input
                                    id="first_name"
                                    required
                                    value={form.first_name}
                                    onChange={(e) =>
                                        updateField("first_name", e.target.value)
                                    }
                                    placeholder="Maria"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="last_name"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Last name
                                </label>
                                <input
                                    id="last_name"
                                    required
                                    value={form.last_name}
                                    onChange={(e) =>
                                        updateField("last_name", e.target.value)
                                    }
                                    placeholder="Santos"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="specialization"
                                className="mb-1.5 block text-sm font-medium text-slate-700"
                            >
                                Specialization{" "}
                                <span className="font-normal text-slate-400">
                                    (optional)
                                </span>
                            </label>
                            <input
                                id="specialization"
                                value={form.specialization}
                                onChange={(e) =>
                                    updateField("specialization", e.target.value)
                                }
                                placeholder="Mathematics, English, Science"
                                className={inputClass}
                            />
                        </div>

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
                                    onChange={(e) =>
                                        updateField("education_level", e.target.value)
                                    }
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

                        {form.education_level === "COLLEGE" && (
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">
                                        Assigned courses
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {form.courses.length} selected
                                    </span>
                                </div>

                                {courses.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center">
                                        <BookOpen
                                            size={20}
                                            className="mx-auto text-slate-400"
                                        />
                                        <p className="mt-2 text-sm text-slate-600">
                                            No courses available
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Add courses first, then assign them here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                                        {courses.map((course) => (
                                            <label
                                                key={course.id}
                                                className="flex cursor-pointer items-center gap-3 px-3 py-3 transition hover:bg-slate-50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.courses.includes(course.id)}
                                                    onChange={() => toggleCourse(course.id)}
                                                    className="h-4 w-4 rounded border-slate-300 accent-violet-600"
                                                />
                                                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                                    {course.name}
                                                </span>
                                                {course.code && (
                                                    <span className="text-xs text-slate-400">
                                                        {course.code}
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                            {saving && (
                                <LoaderCircle size={16} className="animate-spin" />
                            )}
                            {saving
                                ? "Saving..."
                                : isEditing
                                    ? "Save changes"
                                    : "Create teacher"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function TeachersPage() {
    const [sortBy, setSortBy] = useState("default");
    const [teachers, setTeachers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [division, setDivision] = useState("ALL");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [includeArchived, setIncludeArchived] = useState(false);

    const [loading, setLoading] = useState(true);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [ratingsTeacher, setRatingsTeacher] = useState(null);

    // Debounce only the search box so filters respond instantly.
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadTeachers = useCallback(async () => {
        setLoading(true);

        try {
            const filters = {
                ...(division !== "ALL" && { education_level: division }),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(includeArchived && { include_archived: "true" }),
            };

            const data = await teacherService.getTeachers(filters);
            setTeachers(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(getErrorMessage(error) || "Unable to load teachers.");
        } finally {
            setLoading(false);
        }
    }, [division, debouncedSearch, includeArchived]);

    const sortedTeachers = useMemo(() => {
        const result = [...teachers];

        switch (sortBy) {
            case "highest_rating":
                return result.sort((a, b) => {
                    const ratingA = Number(a.average_rating);
                    const ratingB = Number(b.average_rating);

                    if (!Number.isFinite(ratingA)) return 1;
                    if (!Number.isFinite(ratingB)) return -1;

                    return ratingB - ratingA;
                });

            case "lowest_rating":
                return result.sort((a, b) => {
                    const ratingA = Number(a.average_rating);
                    const ratingB = Number(b.average_rating);

                    if (!Number.isFinite(ratingA)) return 1;
                    if (!Number.isFinite(ratingB)) return -1;

                    return ratingA - ratingB;
                });

            case "most_evaluated":
                return result.sort(
                    (a, b) =>
                        (Number(b.evaluation_count) || 0) -
                        (Number(a.evaluation_count) || 0)
                );

            default:
                return result;
        }
    }, [teachers, sortBy]);

    useEffect(() => {
        loadTeachers();
    }, [loadTeachers]);

    useEffect(() => {
        let active = true;

        async function loadCourses() {
            try {
                const data = await teacherService.getCourses();
                if (active) setCourses(Array.isArray(data) ? data : []);
            } catch {
                if (active) {
                    setCourses([]);
                    toast.error("Unable to load courses.");
                }
            } finally {
                if (active) setCoursesLoading(false);
            }
        }

        loadCourses();

        return () => {
            active = false;
        };
    }, []);

    const openCreateModal = () => {
        setSelectedTeacher(null);
        setModalOpen(true);
    };

    const openEditModal = (teacher) => {
        setSelectedTeacher(teacher);
        setModalOpen(true);
    };

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setSelectedTeacher(null);
    }, []);

    const handleSave = async (data) => {
        setSaving(true);

        try {
            if (selectedTeacher) {
                await teacherService.updateTeacher(selectedTeacher.id, data);
                toast.success("Teacher updated.");
            } else {
                await teacherService.createTeacher(data);
                toast.success("Teacher created.");
            }

            closeModal();
            await loadTeachers();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (teacher) => {
        const confirmed = window.confirm(
            `Archive ${getFullName(teacher)}?\n\nThey will be hidden from the active list. Their evaluation history is kept.`,
        );

        if (!confirmed) return;

        try {
            await teacherService.archiveTeacher(teacher.id);
            toast.success("Teacher archived.");
            await loadTeachers();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const activeCount = teachers.filter((t) => !t.is_archived).length;
    const archivedCount = teachers.filter((t) => t.is_archived).length;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                        Teachers
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage College and Basic Education teachers.
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add teacher</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
                <Stat label="Showing" value={teachers.length} loading={loading} />
                <Stat label="Active" value={activeCount} loading={loading} />
                <Stat label="Archived" value={archivedCount} loading={loading} />
            </div>

            {/* Directory */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {/* Toolbar */}
                <div className="space-y-3 border-b border-slate-200 p-4">
                    <div className="flex gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or specialization"
                                aria-label="Search teachers"
                                className={`${inputClass} pl-9`}
                            />
                        </div>

                        <button
                            onClick={loadTeachers}
                            disabled={loading}
                            aria-label="Refresh"
                            title="Refresh"
                            className="rounded-lg border border-slate-300 px-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "animate-spin" : ""}
                            />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {/* Division filters */}
                        <div className="flex items-center justify-between gap-3">
                            <div
                                role="tablist"
                                aria-label="Filter by division"
                                className="-mx-1 flex min-w-0 gap-1 overflow-x-auto px-1"
                            >
                                {DIVISIONS.map((item) => (
                                    <button
                                        key={item.value}
                                        role="tab"
                                        aria-selected={division === item.value}
                                        onClick={() => setDivision(item.value)}
                                        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${division === item.value
                                            ? "bg-violet-50 text-violet-700"
                                            : "text-slate-600 hover:bg-slate-100"
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>

                            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs text-slate-600 sm:text-sm">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={includeArchived}
                                    onClick={() => setIncludeArchived((c) => !c)}
                                    className={`relative h-5 w-9 shrink-0 rounded-full transition ${includeArchived ? "bg-violet-600" : "bg-slate-300"
                                        }`}
                                >
                                    <span
                                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${includeArchived ? "translate-x-4" : ""
                                            }`}
                                    />
                                </button>
                                Archived
                            </label>
                        </div>

                        {/* Sorting filters */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <span className="shrink-0 text-xs font-semibold text-slate-400">
                                SORT:
                            </span>

                            {[
                                { label: "Default", value: "default" },
                                { label: "Highest rating", value: "highest_rating" },
                                { label: "Lowest rating", value: "lowest_rating" },
                                { label: "Most evaluated", value: "most_evaluated" },
                            ].map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setSortBy(item.value)}
                                    aria-pressed={sortBy === item.value}
                                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${sortBy === item.value
                                        ? "border-violet-600 bg-violet-600 text-white"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <LoaderCircle
                            size={24}
                            className="animate-spin text-violet-600"
                        />
                        <p className="mt-3 text-sm text-slate-500">Loading teachers...</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Users size={22} />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">
                            No teachers found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Change your filters or add a new teacher.
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                            <Plus size={16} />
                            Add teacher
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Mobile list */}
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {sortedTeachers.map((teacher) => (
                                <li key={teacher.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Avatar teacher={teacher} />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <Link
                                                    to={`/dashboard/teachers/${teacher.id}`}
                                                    className="truncate text-sm font-semibold text-slate-900 hover:text-violet-700"
                                                >
                                                    {getFullName(teacher)}
                                                </Link>
                                                <StatusBadge archived={teacher.is_archived} />
                                            </div>

                                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                                {teacher.specialization || "No specialization"}
                                            </p>

                                            <p className="mt-2 text-xs text-slate-500">
                                                {levelLabel(teacher.education_level)}
                                                {" • "}
                                                {teacher.course_details?.length || 0} courses
                                                {" • "}
                                                {teacher.evaluation_count ?? 0} evaluations
                                                {" • "}
                                                {Number(teacher.average_rating) > 0
                                                    ? `${Number(teacher.average_rating).toFixed(2)} rating`
                                                    : "No rating"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => setRatingsTeacher(teacher)}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <BarChart3 size={15} />
                                            Ratings
                                        </button>
                                        <button
                                            onClick={() => openEditModal(teacher)}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>
                                        {!teacher.is_archived && (
                                            <button
                                                onClick={() => handleArchive(teacher)}
                                                aria-label={`Archive ${getFullName(teacher)}`}
                                                className="rounded-lg border border-slate-300 px-3 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                                            >
                                                <Archive size={16} />
                                            </button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Teacher</th>
                                        <th className="px-5 py-3 font-medium">Specialization</th>
                                        <th className="px-5 py-3 font-medium">Division</th>
                                        <th className="px-5 py-3 text-right font-medium">Courses</th>
                                        <th className="px-5 py-3 text-right font-medium">Evaluations</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {sortedTeachers.map((teacher) => (
                                        <tr
                                            key={teacher.id}
                                            className="transition hover:bg-slate-50"
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar teacher={teacher} />
                                                    <div className="min-w-0">
                                                        <Link
                                                            to={`/dashboard/teachers/${teacher.id}`}
                                                            className="font-medium text-slate-900 hover:text-violet-700"
                                                        >
                                                            {getFullName(teacher)}
                                                        </Link>
                                                        <p className="text-xs text-slate-400">
                                                            ID {teacher.id}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-slate-600">
                                                {teacher.specialization || "—"}
                                            </td>

                                            <td className="px-5 py-3.5 text-slate-600">
                                                {levelLabel(teacher.education_level)}
                                            </td>

                                            <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                                                {teacher.course_details?.length || 0}
                                            </td>

                                            <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                                                {teacher.evaluation_count ?? 0}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <StatusBadge archived={teacher.is_archived} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-1">
                                                    <IconButton
                                                        label="View section ratings"
                                                        onClick={() => setRatingsTeacher(teacher)}
                                                    >
                                                        <BarChart3 size={17} />
                                                    </IconButton>
                                                    <IconButton
                                                        label="Edit teacher"
                                                        onClick={() => openEditModal(teacher)}
                                                    >
                                                        <Pencil size={17} />
                                                    </IconButton>
                                                    {!teacher.is_archived && (
                                                        <IconButton
                                                            label="Archive teacher"
                                                            tone="danger"
                                                            onClick={() => handleArchive(teacher)}
                                                        >
                                                            <Archive size={17} />
                                                        </IconButton>
                                                    )}
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
                <TeacherModal
                    teacher={selectedTeacher}
                    courses={coursesLoading ? [] : courses}
                    onClose={closeModal}
                    onSave={handleSave}
                    saving={saving}
                />
            )}

            {ratingsTeacher && (
                <TeacherSectionRatingsModal
                    teacher={ratingsTeacher}
                    onClose={() => setRatingsTeacher(null)}
                />
            )}
        </div>
    );
}