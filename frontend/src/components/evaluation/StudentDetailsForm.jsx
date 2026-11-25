import { useEffect, useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Loader2,
} from "lucide-react";
import api from "../../services/api";

const COLLEGE_YEAR_LEVELS = [
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
    "5th Year",
];

const BASIC_ED_YEAR_LEVELS = [
    "Kindergarten",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
];

const labelClass = "text-sm font-semibold text-slate-700";

const inputClass =
    "mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/10 disabled:cursor-not-allowed disabled:bg-slate-50";

function FieldError({ id, message }) {
    if (!message) return null;

    return (
        <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
            {message}
        </p>
    );
}

export default function StudentDetailsForm({
    division = "college",
    teachers = [],
    courses = [],
    activePeriod = null,
    loading = false,
    onSubmit,
    initialValues = {},
}) {
    const isCollege = division === "college";

    const yearLevels = isCollege
        ? COLLEGE_YEAR_LEVELS
        : BASIC_ED_YEAR_LEVELS;

    const [form, setForm] = useState({
        teacher: initialValues.teacher ?? "",
        subject: initialValues.subject ?? "",
        student_name: initialValues.student_name ?? "",
        student_id: initialValues.student_id ?? "",
        course: initialValues.course ?? "",
        year_level: initialValues.year_level ?? "",
    });

    const [errors, setErrors] = useState({});

    const [idStatus, setIdStatus] = useState("idle");
    const [idMessage, setIdMessage] = useState("");
    const [verifiedStudentId, setVerifiedStudentId] = useState("");

    const [duplicateStatus, setDuplicateStatus] = useState("idle");
    const [duplicateMessage, setDuplicateMessage] = useState("");

    const periodLabel = activePeriod
        ? `${activePeriod.semester ?? ""} Semester, ${activePeriod.academic_year ?? ""}`
        : "No active evaluation period";

    // Student ID verification
    useEffect(() => {
        const studentId = form.student_id.trim();

        setVerifiedStudentId("");
        setIdMessage("");

        if (!studentId) {
            setIdStatus("idle");
            return;
        }

        if (studentId.length > 10) {
            setIdStatus("invalid");
            setIdMessage("Student ID cannot exceed 10 characters.");
            return;
        }

        setIdStatus("checking");

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
                const response = await api.post(
                    "/student/verify-id/",
                    { student_id: studentId },
                    { signal: controller.signal }
                );

                if (response.data.valid) {
                    setIdStatus("valid");
                    setIdMessage(response.data.message);
                    setVerifiedStudentId(studentId);
                } else {
                    setIdStatus("invalid");
                    setIdMessage(
                        response.data.message ||
                        "Student ID could not be verified."
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                setVerifiedStudentId("");

                if (error.response?.status === 404) {
                    setIdStatus("invalid");
                    setIdMessage(
                        error.response.data.message || "Student ID not found."
                    );
                } else if (error.response?.status === 400) {
                    setIdStatus("invalid");
                    setIdMessage(
                        error.response.data.message ||
                        "Please check your Student ID."
                    );
                } else {
                    setIdStatus("error");
                    setIdMessage(
                        "Unable to verify Student ID. Please check your connection and try again."
                    );
                }
            }
        }, 500);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [form.student_id]);

    // Duplicate evaluation verification
    useEffect(() => {
        const studentId = form.student_id.trim();
        const subject = form.subject.trim();

        setDuplicateMessage("");

        if (
            idStatus !== "valid" ||
            verifiedStudentId !== studentId ||
            !form.teacher ||
            !subject ||
            !activePeriod ||
            (isCollege && !form.course)
        ) {
            setDuplicateStatus("idle");
            return;
        }

        setDuplicateStatus("checking");

        const controller = new AbortController();

        const timeout = setTimeout(async () => {
            try {
                const response = await api.post(
                    "/student/evaluation/check-duplicate/",
                    {
                        education_level: isCollege ? "COLLEGE" : "BASIC",
                        student_id: studentId,
                        teacher: form.teacher,
                        subject,
                        course: isCollege ? form.course : null,
                    },
                    { signal: controller.signal }
                );

                if (response.data.checked === false) {
                    setDuplicateStatus("error");
                    setDuplicateMessage(
                        response.data.message ||
                        "Unable to verify previous evaluations."
                    );
                    return;
                }

                if (response.data.duplicate) {
                    setDuplicateStatus("duplicate");
                    setDuplicateMessage(response.data.message);
                } else {
                    setDuplicateStatus("clear");
                    setDuplicateMessage(
                        "No previous evaluation found. You may continue."
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                setDuplicateStatus("error");
                setDuplicateMessage(
                    "Unable to check previous evaluations. Please check your connection and try again."
                );
            }
        }, 500);

        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [
        form.student_id,
        form.teacher,
        form.subject,
        form.course,
        idStatus,
        verifiedStudentId,
        activePeriod,
        isCollege,
    ]);

    function updateField(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [name]: "",
        }));
    }

    function validate() {
        const nextErrors = {};

        if (!form.teacher) {
            nextErrors.teacher = "Please select your teacher.";
        }

        if (!form.subject.trim()) {
            nextErrors.subject = "Please enter the subject.";
        }

        if (!form.student_id.trim()) {
            nextErrors.student_id = "Your student ID is required.";
        } else if (
            idStatus !== "valid" ||
            verifiedStudentId !== form.student_id.trim()
        ) {
            nextErrors.student_id =
                "Please wait until your Student ID is successfully verified.";
        }

        if (isCollege && !form.course) {
            nextErrors.course = "Please select your course.";
        }

        if (!form.year_level) {
            nextErrors.year_level = "Please select your year level.";
        }

        if (!activePeriod) {
            nextErrors.period =
                "There is currently no active evaluation period.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!validate()) return;

        onSubmit?.({
            ...form,
            division: isCollege ? "COLLEGE" : "BASIC",
            student_id: form.student_id.trim(),
            student_name: form.student_name.trim(),
            subject: form.subject.trim(),
            semester: activePeriod.semester,
            academic_year: activePeriod.academic_year,
        });
    }

    const canContinue =
        idStatus === "valid" &&
        verifiedStudentId === form.student_id.trim() &&
        duplicateStatus === "clear" &&
        !loading &&
        Boolean(activePeriod);

    const idHasProblem = idStatus === "invalid" || idStatus === "error";

    // Links each field to its error message for screen readers.
    const describe = (name) => (errors[name] ? `${name}-error` : undefined);

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
        >
            {/* Active period */}
            <div className="mb-6">
                <p className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800">
                    <CalendarDays size={16} />
                    {periodLabel}
                </p>

                <FieldError id="period-error" message={errors.period} />
            </div>

            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                {/* Teacher */}
                <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="teacher">
                        Teacher <span className="text-red-500">*</span>
                    </label>

                    <select
                        id="teacher"
                        name="teacher"
                        value={form.teacher}
                        onChange={updateField}
                        disabled={loading || teachers.length === 0}
                        aria-describedby={describe("teacher")}
                        className={inputClass}
                    >
                        <option value="">
                            {loading ? "Loading teachers..." : "Select your teacher"}
                        </option>

                        {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.full_name ??
                                    `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim()}
                            </option>
                        ))}
                    </select>

                    <FieldError id="teacher-error" message={errors.teacher} />
                </div>

                {/* Subject */}
                <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="subject">
                        Subject <span className="text-red-500">*</span>
                    </label>

                    <input
                        id="subject"
                        name="subject"
                        value={form.subject}
                        onChange={updateField}
                        placeholder="Enter the subject"
                        aria-describedby={describe("subject")}
                        className={inputClass}
                    />

                    <FieldError id="subject-error" message={errors.subject} />
                </div>

                {/* Student ID */}
                <div>
                    <label className={labelClass} htmlFor="student_id">
                        Student ID <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                        <input
                            id="student_id"
                            name="student_id"
                            value={form.student_id}
                            onChange={updateField}
                            placeholder="Enter your student ID"
                            autoComplete="off"
                            maxLength={10}
                            aria-invalid={idHasProblem}
                            aria-describedby={
                                describe("student_id") ??
                                (idMessage ? "student_id-status" : undefined)
                            }
                            className={`${inputClass} pr-11 ${
                                idStatus === "valid"
                                    ? "border-green-400 focus:border-green-600 focus:ring-green-600/10"
                                    : idHasProblem
                                        ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                                        : ""
                            }`}
                        />

                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {idStatus === "checking" && (
                                <Loader2
                                    size={19}
                                    className="animate-spin text-green-700"
                                />
                            )}

                            {idStatus === "valid" && (
                                <CheckCircle2 size={20} className="text-green-600" />
                            )}

                            {idHasProblem && (
                                <AlertCircle size={20} className="text-red-500" />
                            )}
                        </div>
                    </div>

                    {idStatus === "checking" && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <Loader2 size={13} className="animate-spin" />
                            Verifying Student ID...
                        </p>
                    )}

                    {idStatus === "valid" && (
                        <p
                            id="student_id-status"
                            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-green-700"
                        >
                            <CheckCircle2 size={13} />
                            {idMessage}
                        </p>
                    )}

                    {idHasProblem && (
                        <p
                            id="student_id-status"
                            className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600"
                        >
                            <AlertCircle size={13} className="mt-0.5 shrink-0" />
                            {idMessage}
                        </p>
                    )}

                    <FieldError id="student_id-error" message={errors.student_id} />
                </div>

                {/* Student name */}
                <div>
                    <label className={labelClass} htmlFor="student_name">
                        Student Name{" "}
                        <span className="font-normal text-slate-400">(Optional)</span>
                    </label>

                    <input
                        id="student_name"
                        name="student_name"
                        value={form.student_name}
                        onChange={updateField}
                        placeholder="Your full name"
                        className={inputClass}
                    />
                </div>

                {/* Course */}
                {isCollege && (
                    <div>
                        <label className={labelClass} htmlFor="course">
                            Course <span className="text-red-500">*</span>
                        </label>

                        <select
                            id="course"
                            name="course"
                            value={form.course}
                            onChange={updateField}
                            aria-describedby={describe("course")}
                            className={inputClass}
                        >
                            <option value="">Select your course</option>

                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.name}
                                </option>
                            ))}
                        </select>

                        <FieldError id="course-error" message={errors.course} />
                    </div>
                )}

                {/* Year / Grade level */}
                <div>
                    <label className={labelClass} htmlFor="year_level">
                        {isCollege ? "Year Level" : "Grade Level"}{" "}
                        <span className="text-red-500">*</span>
                    </label>

                    <select
                        id="year_level"
                        name="year_level"
                        value={form.year_level}
                        onChange={updateField}
                        aria-describedby={describe("year_level")}
                        className={inputClass}
                    >
                        <option value="">
                            Select {isCollege ? "year" : "grade"} level
                        </option>

                        {yearLevels.map((level) => (
                            <option key={level} value={level}>
                                {level}
                            </option>
                        ))}
                    </select>

                    <FieldError id="year_level-error" message={errors.year_level} />
                </div>
            </div>

            {/* Duplicate check result */}
            {duplicateStatus !== "idle" && (
                <div
                    role="status"
                    className={`mt-6 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                        duplicateStatus === "duplicate"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : duplicateStatus === "error"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-green-200 bg-green-50 text-green-800"
                    }`}
                >
                    {duplicateStatus === "checking" ? (
                        <Loader2 size={18} className="shrink-0 animate-spin" />
                    ) : duplicateStatus === "clear" ? (
                        <CheckCircle2 size={18} className="shrink-0" />
                    ) : (
                        <AlertCircle size={18} className="shrink-0" />
                    )}

                    <span>
                        {duplicateStatus === "checking"
                            ? "Checking for previous evaluations..."
                            : duplicateMessage}
                    </span>
                </div>
            )}

            <button
                type="submit"
                disabled={!canContinue}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-600/20 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
                Continue
                <ArrowRight size={18} />
            </button>
        </form>
    );
}