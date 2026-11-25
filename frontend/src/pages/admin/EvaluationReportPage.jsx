
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import evaluationResultsService from "../../services/evaluationResultsService";
import hicLogo from "../../assets/HIC_LOGO_TRANSPARENT.png";
import reportStyles from "./Evaluationreportstyles";

const EMPTY = "—";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

const formatDate = (value) => {
  if (!value) return EMPTY;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;

  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map(({ type, value }) => [type, value])
  );

  return `${parts.month} ${parts.day}, ${parts.year} ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
};

const capFirst = (value) =>
  value ? String(value).charAt(0).toUpperCase() + String(value).slice(1) : value;

const getTeacherName = (teacher) => {
  if (typeof teacher === "string") return teacher || EMPTY;

  return (
    teacher?.full_name ||
    [teacher?.first_name, teacher?.last_name].filter(Boolean).join(" ") ||
    EMPTY
  );
};

const getSubjectName = (subject) => {
  if (typeof subject === "string") return subject;
  return subject?.name || subject?.title || "N/A";
};

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const normalizeQuestion = (item, index) => {
  const question = item.question || item;

  const rating = [
    item.rating_label,
    item.rating,
    question.rating_label,
    question.rating,
  ].find(hasValue);

  return {
    key: question.id ?? item.id ?? index,
    order: question.order ?? index + 1,
    text: question.text || "",
    rating: rating ?? EMPTY,
  };
};

const normalizeSections = (sections) => {
  const list = Array.isArray(sections)
    ? sections
    : Object.entries(sections || {}).map(([prefix, section]) => ({
        ...section,
        prefix: section.prefix || prefix,
      }));

  return list.map((section, index) => ({
    key: section.id ?? section.prefix ?? index,
    prefix: section.prefix || index + 1,
    title: section.title || "",
    total: [section.total_score, section.total].find(hasValue) ?? EMPTY,
    questions: (section.questions || section.items || []).map(normalizeQuestion),
  }));
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildExcelRows = (evaluation, sections) => {
  const rows = [
    ["Teacher Evaluation Report"],
    ["Academic Evaluation Record"],
    [],
    ["Subject", getSubjectName(evaluation.subject || evaluation.course)],
    ["Teacher", getTeacherName(evaluation.teacher)],
    ["Semester", evaluation.semester || EMPTY],
    ["Academic Year", evaluation.academic_year || EMPTY],
    ["Year Level", evaluation.year_level || EMPTY],
    ["Student ID", evaluation.student_id || EMPTY],
  ];

  if (evaluation.student_name) {
    rows.push(["Student Name", evaluation.student_name]);
  }

  rows.push(["Date Submitted", formatDate(evaluation.submitted_at)]);

  sections.forEach((section) => {
    rows.push([], [`${section.prefix} ${section.title}`.trim()]);
    rows.push(["Question", "Rating"]);

    section.questions.forEach((question) => {
      rows.push([
        `${question.order}. ${question.text}`,
        question.rating,
      ]);
    });

    rows.push(["Total Score", section.total]);
  });

  rows.push([], ["Additional Comments"]);
  rows.push([
    "A. Commendable Features",
    capFirst(evaluation.commendable_features) || "No remarks provided.",
  ]);
  rows.push([
    "B. Suggestions for Improvement",
    capFirst(evaluation.suggestions_improvement) || "No suggestions provided.",
  ]);

  return rows;
};

const downloadExcel = (rows, filename) => {
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">${body}</table></body></html>`;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <p className="mt-4 text-sm text-slate-500">
        Loading evaluation report...
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry, onBack }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="text-sm text-rose-600">{message}</p>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
        >
          Try again
        </button>

        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Go back
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, children }) {
  return (
    <div className="report-info-item">
      <p className="report-info-label">{label}</p>
      <p className="report-info-value">{children}</p>
    </div>
  );
}

function ActionsMenu({ onPrint, onExportExcel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const run = (action) => () => {
    setOpen(false);
    action();
  };

  return (
    <div className="report-menu-wrap" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="report-menu-button"
        aria-label="More actions"
        aria-expanded={open}
      >
        <span className="report-menu-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <div className={`report-dropdown ${open ? "" : "hidden"}`}>
        <button type="button" onClick={run(onPrint)}>
          <span aria-hidden="true">🖨</span>
          <span>Print report</span>
        </button>

        <button type="button" onClick={run(onPrint)}>
          <span aria-hidden="true">📄</span>
          <span>Export PDF</span>
        </button>

        <button type="button" onClick={run(onExportExcel)}>
          <span aria-hidden="true">📊</span>
          <span>Export Excel</span>
        </button>
      </div>
    </div>
  );
}

function EvaluationSection({ section }) {
  return (
    <section className="report-section">
      <h2 className="report-section-title">
        <span className="report-section-marker">{section.prefix}</span>
        <span>{section.title}</span>
      </h2>

      <div className="report-table-wrap">
        <table className="report-table">
          <thead>
            <tr>
              <th scope="col">Question</th>
              <th scope="col">Rating</th>
            </tr>
          </thead>

          <tbody>
            {section.questions.map((question) => (
              <tr key={question.key}>
                <td>
                  {question.order}. {question.text}
                </td>
                <td className="report-rating">{question.rating}</td>
              </tr>
            ))}

            <tr className="report-total-row">
              <td className="report-total-label">Total Score</td>
              <td className="report-rating">{section.total}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CommentBlock({ label, children }) {
  return (
    <div className="paper-block">
      <div className="paper-label">{label}</div>
      <div className="paper-content">{children}</div>
    </div>
  );
}

export default function EvaluationReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    if (!id || !/^\d+$/.test(id)) {
      setReport(null);
      setError(
        "Invalid evaluation ID. Please return to the evaluation results."
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await evaluationResultsService.getEvaluationDetails(id);

      const data = response?.data ?? response;
      setReport(data);
    } catch (err) {
      console.error("Evaluation report error:", err);

      setReport(null);
      setError(
        err.response?.data?.detail ||
          "Unable to load this evaluation report."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const evaluation = report?.evaluation ?? report?.data?.evaluation;

  const sections = useMemo(
    () => normalizeSections(report?.sections ?? report?.data?.sections),
    [report]
  );

  const handleExcelExport = () => {
    if (!evaluation) return;

    downloadExcel(
      buildExcelRows(evaluation, sections),
      `evaluation-report-${evaluation.id || id}.xls`
    );
  };

  if (loading) return <LoadingState />;

  if (error || !evaluation) {
    return (
      <ErrorState
        message={error || "Evaluation record not found."}
        onRetry={loadReport}
        onBack={() => navigate(-1)}
      />
    );
  }

  return (
    <>
      <style>{reportStyles}</style>

      <div className="evaluation-report">
        <div className="paper">
          <header className="report-header">
            <img
              src={hicLogo}
              className="report-logo"
              alt="School Logo"
            />

            <div className="report-heading">
              <h1>Teacher Evaluation Report</h1>
              <p>Academic Evaluation Record</p>
            </div>
          </header>

          <div className="report-actions no-print">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="report-back"
            >
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>

            <ActionsMenu
              onPrint={() => window.print()}
              onExportExcel={handleExcelExport}
            />
          </div>

          <section
            className="report-info-grid"
            aria-label="Evaluation information"
          >
            <InfoItem label="Subject">
              {getSubjectName(evaluation.subject || evaluation.course)}
            </InfoItem>

            <InfoItem label="Teacher">
              {getTeacherName(evaluation.teacher)}
            </InfoItem>

            <InfoItem label="Semester">
              {evaluation.semester || EMPTY}
            </InfoItem>

            <InfoItem label="Academic Year">
              {evaluation.academic_year || EMPTY}
            </InfoItem>

            <InfoItem label="Year Level">
              {evaluation.year_level || EMPTY}
            </InfoItem>

            <InfoItem label="Student ID">
              {evaluation.student_id || EMPTY}
            </InfoItem>

            {evaluation.student_name && (
              <InfoItem label="Student Name">
                {evaluation.student_name}
              </InfoItem>
            )}

            <InfoItem label="Date Submitted">
              {formatDate(evaluation.submitted_at)}
            </InfoItem>
          </section>

          {sections.map((section) => (
            <EvaluationSection
              key={section.key}
              section={section}
            />
          ))}

          <section className="paper-comments-section">
            <div className="paper-section-header">
              <h3>Additional Comments</h3>
              <p>Evaluator remarks and recommendations</p>
            </div>

            <div className="paper-sheet">
              <CommentBlock label="A. Commendable Features">
                {capFirst(evaluation.commendable_features) ||
                  "No remarks provided."}
              </CommentBlock>

              <CommentBlock label="B. Suggestions for Improvement">
                {capFirst(evaluation.suggestions_improvement) ||
                  "No suggestions provided."}
              </CommentBlock>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
