
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import evaluationResultsService from "../../services/evaluationResultsService";

const PAGE_SIZE = 10;

const getEvaluationId = (row) =>
  row?.id ??
  row?.evaluation_id ??
  row?.teacher_evaluation_id ??
  row?.evaluation?.id ??
  null;

const getTeacherName = (teacher) => {
  if (typeof teacher === "string") return teacher;

  return (
    teacher?.full_name ||
    [teacher?.first_name, teacher?.last_name].filter(Boolean).join(" ") ||
    "Unknown teacher"
  );
};

const getSubject = (subject) => {
  if (typeof subject === "string") return subject;
  return subject?.name || subject?.title || "—";
};

const getDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
};

const extractEvaluations = (response) => {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.evaluations)) return data.evaluations;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

export default function EvaluationResultsPage() {
  const navigate = useNavigate();

  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const [page, setPage] = useState(1);

  const loadEvaluations = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const filters = {};

      if (division) filters.education_level = division;
      if (semester) filters.semester = semester;
      if (academicYear) filters.academic_year = academicYear;

      const response =
        await evaluationResultsService.getEvaluations(filters);

      setEvaluations(extractEvaluations(response));
      setPage(1);
    } catch (err) {
      console.error("Evaluation results error:", err);
      setEvaluations([]);
      setError(
        err.response?.data?.detail ||
          "Unable to load submitted evaluations."
      );
    } finally {
      setLoading(false);
    }
  }, [division, semester, academicYear]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const filteredEvaluations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return evaluations;

    return evaluations.filter((row) => {
      const teacher = getTeacherName(row.teacher);
      const subject = getSubject(row.subject || row.course);

      const searchable = [
        teacher,
        subject,
        row.student_id,
        row.student_name,
        row.academic_year,
        row.semester,
        row.education_level,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [evaluations, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEvaluations.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedEvaluations = filteredEvaluations.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleViewReport = (row) => {
    const id = getEvaluationId(row);

    if (!id) {
      console.error("Missing evaluation ID in API result:", row);
      setError(
        "This evaluation does not have a valid ID. Check the evaluation list API response."
      );
      return;
    }

    navigate(`/dashboard/evaluations/${id}`);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Evaluation Results
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View submitted teacher evaluations and individual reports.
          </p>
        </div>

        <button
          type="button"
          onClick={loadEvaluations}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total evaluations</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {evaluations.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Filtered results</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredEvaluations.length}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search evaluations..."
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={division}
            onChange={(event) => setDivision(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All divisions</option>
            <option value="COLLEGE">College</option>
            <option value="BASIC">Basic Education</option>
          </select>

          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All semesters</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>

          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="Academic year (e.g. 2026-2027)"
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <h2 className="font-semibold text-slate-900">
            Submitted evaluations
          </h2>
          <span className="text-xs text-slate-500">
            {filteredEvaluations.length} records
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">
              Loading evaluations...
            </p>
          </div>
        ) : paginatedEvaluations.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center px-4 text-center text-sm text-slate-500">
            No evaluations found.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Teacher</th>
                    <th className="px-4 py-3 font-semibold">Subject</th>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Division</th>
                    <th className="px-4 py-3 font-semibold">Semester</th>
                    <th className="px-4 py-3 font-semibold">Academic Year</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedEvaluations.map((row, index) => {
                    const id = getEvaluationId(row);

                    return (
                      <tr
                        key={id ?? `evaluation-${index}`}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {getTeacherName(row.teacher)}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {getSubject(row.subject || row.course)}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.student_id || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.education_level || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.semester || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.academic_year || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {getDate(row.submitted_at)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleViewReport(row)}
                            disabled={!id}
                            title={!id ? "Missing evaluation ID" : "View report"}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Eye size={15} />
                            View Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(
                  currentPage * PAGE_SIZE,
                  filteredEvaluations.length
                )}{" "}
                of {filteredEvaluations.length}
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="text-xs text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
