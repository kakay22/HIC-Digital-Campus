
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Eye,
  GraduationCap,
  LoaderCircle,
  MessageSquareText,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import teacherService from "../../services/teacherService";

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Rating({ value, size = "normal" }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-slate-400">No rating yet</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold text-amber-600 ${size === "large" ? "text-3xl" : "text-sm"
        }`}
    >
      <Star
        size={size === "large" ? 25 : 15}
        className="fill-amber-400 text-amber-400"
      />
      {Number(value).toFixed(2)}
      <span className="text-sm font-normal text-slate-400">/ 5</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>

      {description && (
        <p className="mt-1 text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}

function SectionCard({ section }) {
  const rating = Number(section.average_rating);
  const percentage = Number.isFinite(rating)
    ? Math.min((rating / 5) * 100, 100)
    : 0;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">
            {section.prefix} — {section.title}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {section.evaluation_count} evaluations
          </p>
        </div>

        <Rating value={section.average_rating} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EvaluationCard({ evaluation }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">
            {evaluation.subject_name || "Unnamed subject"}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {evaluation.course_name || "Basic Education"}
            {" · "}
            {evaluation.year_level || "—"}
          </p>
        </div>

        <Rating value={evaluation.overall_rating} />
      </div>

      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 sm:grid-cols-2">
        <p>
          <CalendarDays size={14} className="mr-1 inline" />
          {evaluation.semester || "—"} · {evaluation.academic_year || "—"}
        </p>

        <p>
          <Users size={14} className="mr-1 inline" />
          Student: {evaluation.student_name || "Anonymous"}
        </p>

        <p>
          Student ID: {evaluation.student_id || "—"}
        </p>

        <p>
          Submitted: {formatDate(evaluation.submitted_at)}
        </p>
      </div>

      {evaluation.section_scores?.length > 0 && (
        <div className="mt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Section ratings
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {evaluation.section_scores.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-600">
                  {section.prefix} — {section.title}
                </span>
                <Rating value={section.average_rating} />
              </div>
            ))}
          </div>
        </div>
      )}

      {evaluation.commendable_features && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4">
          <p className="mb-1 text-xs font-semibold text-emerald-700">
            Commendable features
          </p>
          <p className="whitespace-pre-wrap text-sm text-emerald-900">
            {evaluation.commendable_features}
          </p>
        </div>
      )}

      {evaluation.suggestions_improvement && (
        <div className="mt-3 rounded-xl bg-amber-50 p-4">
          <p className="mb-1 text-xs font-semibold text-amber-700">
            Suggestions for improvement
          </p>
          <p className="whitespace-pre-wrap text-sm text-amber-900">
            {evaluation.suggestions_improvement}
          </p>
        </div>
      )}
    </div>
  );
}

function EvaluationReportModal({ evaluation, onClose }) {
  if (!evaluation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 -mx-5 -mt-5 mb-5 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:-mx-7 sm:-mt-7 sm:px-7">
          <div>
            <h2
              id="report-title"
              className="text-lg font-bold text-slate-900"
            >
              Evaluation Report
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Detailed student evaluation
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <EvaluationCard evaluation={evaluation} />
      </div>
    </div>
  );
}

function EmptyEvaluationState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
      <MessageSquareText
        size={30}
        className="mx-auto text-slate-300"
      />

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}

export default function TeacherProfilePage() {
  const { id } = useParams();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeEvaluationTab, setActiveEvaluationTab] = useState("ratings");
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadTeacher() {
      try {
        setLoading(true);
        setError("");

        const data = await teacherService.getTeacher(id);

        if (active) {
          setTeacher(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
            "Unable to load this teacher's profile."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTeacher();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            size={32}
            className="mx-auto animate-spin text-violet-600"
          />
          <p className="mt-3 text-sm text-slate-500">
            Loading teacher profile...
          </p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
          <UserRound size={26} />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Teacher profile unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {error || "The requested teacher could not be found."}
        </p>

        <Link
          to="/dashboard/teachers"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <ArrowLeft size={16} />
          Back to teachers
        </Link>
      </div>
    );
  }

  const courses = teacher.course_details || [];
  const sections = teacher.section_insights || [];
  const history = teacher.evaluation_history || [];
  const period = teacher.current_period;

  const recommendations = history.filter(
    (evaluation) =>
      evaluation.commendable_features?.trim()
  );

  const improvementSuggestions = history.filter(
    (evaluation) =>
      evaluation.suggestions_improvement?.trim()
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      {/* Breadcrumb */}
      <Link
        to="/dashboard/teachers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-violet-600"
      >
        <ArrowLeft size={17} />
        Back to teachers
      </Link>

      {/* Teacher information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <GraduationCap size={32} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {teacher.full_name ||
                  `${teacher.first_name || ""} ${teacher.last_name || ""}`}
              </h1>

              {teacher.is_archived && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Archived
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {teacher.specialization || "No specialization specified"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
                {teacher.education_level === "COLLEGE"
                  ? "College"
                  : "Basic Education"}
              </span>

              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Teacher ID: {teacher.id}
              </span>
            </div>
          </div>
        </div>

        {courses.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Assigned courses
            </p>

            <div className="flex flex-wrap gap-2">
              {courses.map((course) => (
                <span
                  key={course.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
                >
                  <BookOpen size={15} className="text-violet-500" />
                  {course.name}
                  {course.code && (
                    <span className="text-xs text-slate-400">
                      ({course.code})
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Current period */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Evaluation performance
          </h2>
          <p className="text-sm text-slate-500">
            Statistics for the currently open evaluation period.
          </p>
        </div>

        {period && (
          <span className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:self-auto">
            <CalendarDays size={15} />
            {period.semester} · {period.academic_year}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Star}
          label="Overall rating"
          value={
            teacher.average_rating != null
              ? `${Number(teacher.average_rating).toFixed(2)} / 5`
              : "—"
          }
          description="Current evaluation period"
        />

        <StatCard
          icon={Users}
          label="Evaluations"
          value={teacher.evaluation_count ?? 0}
          description="Current evaluation period"
        />

        <StatCard
          icon={BookOpen}
          label="Assigned courses"
          value={courses.length}
          description="Total assigned courses"
        />
      </div>

      {/* Section performance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Section performance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Average rating for each evaluation section in the current period.
          </p>
        </div>

        {sections.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {sections.map((section) => (
              <SectionCard
                key={section.section_id}
                section={section}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
            <BookOpen className="mx-auto text-slate-300" size={28} />
            <p className="mt-3 text-sm text-slate-500">
              No section ratings available for the current period.
            </p>
          </div>
        )}
      </section>

      {/* Evaluation Reports */}
      <section>
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Evaluation Reports
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review student ratings, recommendations, and suggestions.
          </p>
        </div>

        {/* Mobile-first tabs */}
        <div className="mb-5 overflow-x-auto">
          <div
            role="tablist"
            aria-label="Evaluation report categories"
            className="flex min-w-max gap-2 border-b border-slate-200"
          >
            {[
              {
                id: "ratings",
                label: "Ratings",
                count: history.length,
              },
              {
                id: "recommendations",
                label: "Recommendations",
                count: recommendations.length,
              },
              {
                id: "suggestions",
                label: "Suggestions for Improvement",
                count: improvementSuggestions.length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeEvaluationTab === tab.id}
                onClick={() => setActiveEvaluationTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${activeEvaluationTab === tab.id
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
              >
                {tab.label}

                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${activeEvaluationTab === tab.id
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Ratings tab */}
        {activeEvaluationTab === "ratings" && (
          <div className="space-y-4">
            {history.length > 0 ? (
              history.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">
                        {evaluation.subject_name || "Unnamed subject"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {evaluation.course_name || "Basic Education"}
                        {" · "}
                        {evaluation.year_level || "—"}
                      </p>

                      <p className="mt-2 text-xs text-slate-400">
                        {evaluation.semester || "—"} ·{" "}
                        {evaluation.academic_year || "—"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <Rating value={evaluation.overall_rating} />

                      <button
                        onClick={() => navigate(`/dashboard/evaluations/${evaluation.id}`)}
                      >
                        View Report
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                    <span>
                      <Users size={14} className="mr-1 inline" />
                      {evaluation.student_name || "Anonymous"}
                    </span>

                    <span>
                      <CalendarDays size={14} className="mr-1 inline" />
                      {formatDate(evaluation.submitted_at)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyEvaluationState message="No evaluation ratings available yet." />
            )}
          </div>
        )}

        {/* Recommendations tab */}
        {activeEvaluationTab === "recommendations" && (
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="rounded-2xl border border-emerald-100 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                          <MessageSquareText size={17} />
                        </span>

                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Student recommendation
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900">
                        {evaluation.subject_name || "Unnamed subject"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {evaluation.semester || "—"} ·{" "}
                        {evaluation.academic_year || "—"}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/dashboard/evaluations/${evaluation.id}`)}
                    >
                      View Report
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-950">
                      {evaluation.commendable_features}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Student: {evaluation.student_name || "Anonymous"}
                    {" · "}
                    {formatDate(evaluation.submitted_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyEvaluationState message="No student recommendations have been submitted yet." />
            )}
          </div>
        )}

        {/* Suggestions tab */}
        {activeEvaluationTab === "suggestions" && (
          <div className="space-y-4">
            {improvementSuggestions.length > 0 ? (
              improvementSuggestions.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="rounded-2xl border border-amber-100 bg-white p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                          <MessageSquareText size={17} />
                        </span>

                        <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                          Improvement suggestion
                        </span>
                      </div>

                      <h3 className="font-semibold text-slate-900">
                        {evaluation.subject_name || "Unnamed subject"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        {evaluation.semester || "—"} ·{" "}
                        {evaluation.academic_year || "—"}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(`/dashboard/evaluations/${evaluation.id}`)}
                    >
                      View Report
                    </button>
                  </div>

                  <div className="mt-4 rounded-xl bg-amber-50 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-950">
                      {evaluation.suggestions_improvement}
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Student: {evaluation.student_name || "Anonymous"}
                    {" · "}
                    {formatDate(evaluation.submitted_at)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyEvaluationState message="No improvement suggestions have been submitted yet." />
            )}
          </div>
        )}
      </section>

      {/* Detailed report modal */}
      {selectedEvaluation && (
        <EvaluationReportModal
          evaluation={selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
        />
      )}
    </div>
  );
}
