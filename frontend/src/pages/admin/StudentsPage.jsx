import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Pencil,
    Archive,
    ArchiveRestore,
    GraduationCap,
    X,
    LoaderCircle,
    RefreshCw,
    ChevronDown,
    FileSpreadsheet,
    Download,
} from "lucide-react";
import toast from "react-hot-toast";

import studentService from "../../services/studentService";

/*
 * A student record is only a registered student ID. Students have no accounts
 * and evaluate anonymously, so no names or evaluation history are shown here.
 *
 * API fields: id, student_id, education_level ("COLLEGE" | "BASIC"), is_archived
 */

const MAX_ID_LENGTH = 10;

const DIVISIONS = [
    { label: "All", value: "ALL" },
    { label: "College", value: "COLLEGE" },
    { label: "Basic Education", value: "BASIC" },
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
                ? "Endpoint not found (404). Check that the backend has /admin/students/."
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

            return `${field}: ${message}`;
        })
        .join("\n");
}

function levelLabel(level) {
    return level === "COLLEGE" ? "College" : "Basic Education";
}

// Accepts IDs separated by new lines, spaces, commas or semicolons.
function parseIds(text) {
    return Array.from(
        new Set(
            text
                .split(/[\s,;]+/)
                .map((id) => id.trim())
                .filter(Boolean),
        ),
    );
}

/* ------------------------------------------------------------------ */
/* File import (CSV, TXT, Excel)                                       */
/* ------------------------------------------------------------------ */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_IMPORT_IDS = 5000;

// Recognises a header cell such as "Student ID", "student_no", "LRN" or "ID".
const HEADER_PATTERN =
    /^(student[\s_-]*(id|no\.?|number)|student|id|id[\s_-]*(no|number)|lrn)$/i;

function splitLine(line, delimiter) {
    const cells = [];
    let current = "";
    let quoted = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (quoted && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                quoted = !quoted;
            }
        } else if (char === delimiter && !quoted) {
            cells.push(current);
            current = "";
        } else {
            current += char;
        }
    }

    cells.push(current);
    return cells;
}

function parseDelimited(text) {
    const lines = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

    if (lines.length === 0) return [];

    // Pick the delimiter that splits the first line into the most cells.
    const delimiter = [",", ";", "\t"]
        .map((d) => [d, lines[0].split(d).length])
        .sort((a, b) => b[1] - a[1])[0][0];

    return lines.map((line) => splitLine(line, delimiter));
}

// Uses the column with a recognised header, otherwise the first column.
function extractIds(rows) {
    if (rows.length === 0) return [];

    const clean = (value) => String(value ?? "").trim();

    let column = 0;
    let start = 0;

    const headerIndex = rows[0].findIndex((cell) =>
        HEADER_PATTERN.test(clean(cell)),
    );

    if (headerIndex !== -1) {
        column = headerIndex;
        start = 1;
    }

    return Array.from(
        new Set(
            rows
                .slice(start)
                .map((row) => clean(row[column]))
                .filter(Boolean),
        ),
    );
}

async function readIdsFromFile(file) {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error("This file is too large. The maximum size is 2 MB.");
    }

    const name = file.name.toLowerCase();
    let rows;

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        // Loaded only when an Excel file is chosen. Requires: npm install xlsx
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
            defval: "",
        });
    } else if (name.endsWith(".csv") || name.endsWith(".txt")) {
        rows = parseDelimited(await file.text());
    } else {
        throw new Error(
            "Unsupported file type. Upload a .csv, .txt, .xlsx or .xls file.",
        );
    }

    const ids = extractIds(rows);

    if (ids.length > MAX_IMPORT_IDS) {
        throw new Error(
            `Too many IDs. Upload at most ${MAX_IMPORT_IDS.toLocaleString()} at a time.`,
        );
    }

    return ids;
}

function downloadTemplate() {
    const blob = new Blob(["student_id\n2024-0123\n2024-0124\n"], {
        type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "student-ids-template.csv";
    link.click();

    URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

function IdIcon() {
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <GraduationCap size={18} />
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

function StudentModal({ student, defaultDivision, onClose, onSave, saving }) {
    const isEditing = Boolean(student);

    const [mode, setMode] = useState("single");
    const [studentId, setStudentId] = useState(student?.student_id || "");
    const [bulkText, setBulkText] = useState("");
    const [fileData, setFileData] = useState(null);
    const [fileError, setFileError] = useState("");
    const [reading, setReading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [educationLevel, setEducationLevel] = useState(
        student?.education_level || defaultDivision || "COLLEGE",
    );

    const pastedIds = useMemo(() => parseIds(bulkText), [bulkText]);
    const bulkIds = mode === "file" ? fileData?.ids || [] : pastedIds;
    const tooLong = bulkIds.filter((id) => id.length > MAX_ID_LENGTH);

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

    const handleFile = async (file) => {
        if (!file) return;

        setFileError("");
        setFileData(null);
        setReading(true);

        try {
            const ids = await readIdsFromFile(file);

            if (ids.length === 0) {
                setFileError("No student IDs were found in this file.");
            } else {
                setFileData({ name: file.name, ids });
            }
        } catch (error) {
            setFileError(error?.message || "Unable to read this file.");
        } finally {
            setReading(false);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (mode !== "single" && !isEditing) {
            if (bulkIds.length === 0) {
                toast.error(
                    mode === "file"
                        ? "Upload a file that contains student IDs."
                        : "Enter at least one student ID.",
                );
                return;
            }

            if (tooLong.length > 0) {
                toast.error(
                    `Student IDs cannot exceed ${MAX_ID_LENGTH} characters: ${tooLong
                        .slice(0, 3)
                        .join(", ")}`,
                );
                return;
            }

            onSave({
                mode: "bulk",
                student_ids: bulkIds,
                education_level: educationLevel,
            });
            return;
        }

        if (!studentId.trim()) {
            toast.error("Student ID is required.");
            return;
        }

        onSave({
            mode: "single",
            student_id: studentId.trim(),
            education_level: educationLevel,
        });
    };

    const submitLabel = isEditing
        ? "Save changes"
        : mode === "single"
            ? "Add student ID"
            : bulkIds.length
                ? `Add ${bulkIds.length} ${bulkIds.length === 1 ? "ID" : "IDs"}`
                : "Add IDs";

    const tabs = [
        { value: "single", label: "One ID" },
        { value: "file", label: "Upload file" },
        { value: "paste", label: "Paste list" },
    ];

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
                aria-labelledby="student-modal-title"
                className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <h2
                            id="student-modal-title"
                            className="text-base font-semibold text-slate-900"
                        >
                            {isEditing ? "Edit student ID" : "Add student IDs"}
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Registered IDs can open the evaluation form.
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
                        {!isEditing && (
                            <div
                                role="tablist"
                                aria-label="Add mode"
                                className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
                            >
                                {tabs.map((item) => (
                                    <button
                                        key={item.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={mode === item.value}
                                        onClick={() => setMode(item.value)}
                                        className={`rounded-md py-1.5 text-sm font-medium transition ${mode === item.value
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* One ID */}
                        {(mode === "single" || isEditing) && (
                            <div>
                                <label
                                    htmlFor="student_id"
                                    className="mb-1.5 block text-sm font-medium text-slate-700"
                                >
                                    Student ID
                                </label>
                                <input
                                    id="student_id"
                                    required
                                    autoFocus
                                    maxLength={MAX_ID_LENGTH}
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="2024-0123"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        {/* Upload file */}
                        {mode === "file" && !isEditing && (
                            <div className="space-y-3">
                                <label
                                    htmlFor="id_file"
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragging(false);
                                        handleFile(e.dataTransfer.files?.[0]);
                                    }}
                                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition ${dragging
                                        ? "border-violet-500 bg-violet-50"
                                        : "border-slate-300 hover:bg-slate-50"
                                        }`}
                                >
                                    {reading ? (
                                        <LoaderCircle
                                            size={24}
                                            className="animate-spin text-violet-600"
                                        />
                                    ) : (
                                        <FileSpreadsheet size={24} className="text-slate-400" />
                                    )}

                                    <span className="break-all text-sm font-medium text-slate-700">
                                        {reading
                                            ? "Reading file..."
                                            : fileData
                                                ? fileData.name
                                                : "Choose a file or drag it here"}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        CSV, TXT or Excel, up to 2 MB
                                    </span>
                                </label>

                                <input
                                    id="id_file"
                                    type="file"
                                    accept=".csv,.txt,.xlsx,.xls"
                                    className="sr-only"
                                    onChange={(e) => {
                                        handleFile(e.target.files?.[0]);
                                        e.target.value = "";
                                    }}
                                />

                                {fileError && (
                                    <p className="text-sm text-red-600">{fileError}</p>
                                )}

                                {fileData && (
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-sm font-medium text-slate-900">
                                            {fileData.ids.length}{" "}
                                            {fileData.ids.length === 1 ? "ID" : "IDs"} found
                                        </p>

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {fileData.ids.slice(0, 6).map((id) => (
                                                <span
                                                    key={id}
                                                    className={`rounded-md border px-2 py-0.5 text-xs ${id.length > MAX_ID_LENGTH
                                                        ? "border-red-200 bg-red-50 text-red-700"
                                                        : "border-slate-200 bg-white text-slate-600"
                                                        }`}
                                                >
                                                    {id}
                                                </span>
                                            ))}
                                            {fileData.ids.length > 6 && (
                                                <span className="px-1 py-0.5 text-xs text-slate-500">
                                                    +{fileData.ids.length - 6} more
                                                </span>
                                            )}
                                        </div>

                                        {tooLong.length > 0 && (
                                            <p className="mt-2 text-xs text-red-600">
                                                {tooLong.length} ID(s) are longer than{" "}
                                                {MAX_ID_LENGTH} characters. Fix the file and
                                                upload it again.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-xs text-slate-500">
                                        Put the IDs in one column. A header such as
                                        &quot;student_id&quot; is optional. In Excel, format the
                                        column as Text to keep leading zeros.
                                    </p>

                                    <button
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-800"
                                    >
                                        <Download size={13} />
                                        Template
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Paste list */}
                        {mode === "paste" && !isEditing && (
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label
                                        htmlFor="bulk_ids"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Student IDs
                                    </label>
                                    <span className="text-xs text-slate-500">
                                        {pastedIds.length} found
                                    </span>
                                </div>
                                <textarea
                                    id="bulk_ids"
                                    rows={7}
                                    autoFocus
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={"One ID per line\n2024-0123\n2024-0124\n2024-0125"}
                                    className={`${inputClass} resize-none`}
                                />
                                <p
                                    className={`mt-1.5 text-xs ${tooLong.length ? "text-red-600" : "text-slate-500"
                                        }`}
                                >
                                    {tooLong.length
                                        ? `${tooLong.length} ID(s) are longer than ${MAX_ID_LENGTH} characters.`
                                        : "Paste a list. IDs that are already registered are skipped."}
                                </p>
                            </div>
                        )}

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
                                    value={educationLevel}
                                    onChange={(e) => setEducationLevel(e.target.value)}
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
                            {mode !== "single" && !isEditing && (
                                <p className="mt-1.5 text-xs text-slate-500">
                                    Applies to every ID in this upload.
                                </p>
                            )}
                        </div>
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
                            disabled={saving || reading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving && <LoaderCircle size={16} className="animate-spin" />}
                            {saving ? "Saving..." : submitLabel}
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

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [division, setDivision] = useState("ALL");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [includeArchived, setIncludeArchived] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const loadStudents = useCallback(async () => {
        setLoading(true);

        try {
            const filters = {
                ...(division !== "ALL" && { education_level: division }),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(includeArchived && { include_archived: "true" }),
            };

            const data = await studentService.getStudents(filters);
            setStudents(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(getErrorMessage(error) || "Unable to load student IDs.");
        } finally {
            setLoading(false);
        }
    }, [division, debouncedSearch, includeArchived]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const openCreateModal = () => {
        setSelectedStudent(null);
        setModalOpen(true);
    };

    const openEditModal = (student) => {
        setSelectedStudent(student);
        setModalOpen(true);
    };

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setSelectedStudent(null);
    }, []);

    const handleSave = async ({ mode, ...data }) => {
        setSaving(true);

        try {
            if (selectedStudent) {
                await studentService.updateStudent(selectedStudent.id, data);
                toast.success("Student ID updated.");
            } else if (mode === "bulk") {
                const result = await studentService.bulkCreateStudents(data);
                const skipped = result?.skipped || 0;

                toast.success(
                    `${result?.created ?? 0} added${skipped ? `, ${skipped} already registered` : ""}.`,
                );
            } else {
                await studentService.createStudent(data);
                toast.success("Student ID added.");
            }

            closeModal();
            await loadStudents();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (student) => {
        const confirmed = window.confirm(
            `Archive ${student.student_id}?\n\nThis ID will no longer open the evaluation form. Submitted evaluations are not affected.`,
        );

        if (!confirmed) return;

        try {
            await studentService.archiveStudent(student.id);
            toast.success("Student ID archived.");
            await loadStudents();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const handleRestore = async (student) => {
        try {
            await studentService.restoreStudent(student.id);
            toast.success("Student ID restored.");
            await loadStudents();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const activeCount = students.filter((s) => !s.is_archived).length;
    const archivedCount = students.filter((s) => s.is_archived).length;

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                        Students
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Registered student IDs. Students use them to submit evaluations
                        anonymously.
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Add student IDs</span>
                    <span className="sm:hidden">Add</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
                <Stat label="Showing" value={students.length} loading={loading} />
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
                                placeholder="Search by student ID"
                                aria-label="Search student IDs"
                                className={`${inputClass} pl-9`}
                            />
                        </div>

                        <button
                            onClick={loadStudents}
                            disabled={loading}
                            aria-label="Refresh"
                            title="Refresh"
                            className="rounded-lg border border-slate-300 px-3 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

                        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
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
                            Show archived
                        </label>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <LoaderCircle size={24} className="animate-spin text-violet-600" />
                        <p className="mt-3 text-sm text-slate-500">Loading student IDs...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <GraduationCap size={22} />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold text-slate-900">
                            No student IDs found
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Change your filters or register new student IDs.
                        </p>
                        <button
                            onClick={openCreateModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                        >
                            <Plus size={16} />
                            Add student IDs
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Mobile list */}
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {students.map((student) => (
                                <li key={student.id} className="p-4">
                                    <div className="flex items-center gap-3">
                                        <IdIcon />

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {student.student_id}
                                            </p>
                                            <p className="mt-0.5 text-sm text-slate-500">
                                                {levelLabel(student.education_level)}
                                            </p>
                                        </div>

                                        <StatusBadge archived={student.is_archived} />
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => openEditModal(student)}
                                            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>

                                        {student.is_archived ? (
                                            <button
                                                onClick={() => handleRestore(student)}
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                            >
                                                <ArchiveRestore size={15} />
                                                Restore
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleArchive(student)}
                                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-amber-50 hover:text-amber-700"
                                            >
                                                <Archive size={15} />
                                                Archive
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
                                        <th className="px-5 py-3 font-medium">Student ID</th>
                                        <th className="px-5 py-3 font-medium">Division</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {students.map((student) => (
                                        <tr key={student.id} className="transition hover:bg-slate-50">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <IdIcon />
                                                    <span className="font-medium text-slate-900">
                                                        {student.student_id}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-5 py-3.5 text-slate-600">
                                                {levelLabel(student.education_level)}
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <StatusBadge archived={student.is_archived} />
                                            </td>

                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-1">
                                                    <IconButton
                                                        label="Edit student ID"
                                                        onClick={() => openEditModal(student)}
                                                    >
                                                        <Pencil size={17} />
                                                    </IconButton>

                                                    {student.is_archived ? (
                                                        <IconButton
                                                            label="Restore student ID"
                                                            onClick={() => handleRestore(student)}
                                                        >
                                                            <ArchiveRestore size={17} />
                                                        </IconButton>
                                                    ) : (
                                                        <IconButton
                                                            label="Archive student ID"
                                                            tone="danger"
                                                            onClick={() => handleArchive(student)}
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
                <StudentModal
                    student={selectedStudent}
                    defaultDivision={division !== "ALL" ? division : "COLLEGE"}
                    onClose={closeModal}
                    onSave={handleSave}
                    saving={saving}
                />
            )}
        </div>
    );
}