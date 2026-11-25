
import {
  X,
  BarChart3,
  Star,
  LoaderCircle,
  BookOpen,
  CalendarDays,
} from "lucide-react";

function RatingStars({ rating }) {
  if (rating == null) {
    return <span className="text-sm text-slate-400">No rating</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-slate-900">
        {Number(rating).toFixed(2)}
      </span>
      <span className="text-xs text-amber-500">/ 5.00</span>
    </div>
  );
}

export default function TeacherSectionRatingsModal({
  teacher,
  onClose,
}) {
  const sections = teacher?.section_insights || [];
  const period = teacher?.current_period;

  const average =
    teacher?.average_rating != null
      ? Number(teacher.average_rating)
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <BarChart3 size={22} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">
                Section Ratings
              </h2>
              <p className="text-xs text-slate-500">
                {teacher.full_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close section ratings"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* Current period */}
          <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
            <CalendarDays
              size={19}
              className="mt-0.5 shrink-0 text-violet-600"
            />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                Current Evaluation Period
              </p>

              {period ? (
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {period.academic_year} · {period.semester} Semester
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">
                  No open evaluation period for this division.
                </p>
              )}
            </div>
          </div>

          {/* Overall rating */}
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm font-medium text-slate-500">
              Overall Teacher Rating
            </p>

            <div className="mt-2 flex items-center gap-3">
              <Star
                size={27}
                className="fill-amber-400 text-amber-400"
              />

              {average == null ? (
                <span className="text-xl font-bold text-slate-400">
                  No rating yet
                </span>
              ) : (
                <>
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    {average.toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-400">
                    / 5.00
                  </span>
                </>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {teacher.evaluation_count || 0} completed evaluations
            </p>
          </div>

          {/* Section ratings */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-violet-600" />
              <h3 className="font-semibold text-slate-900">
                Average Rating per Section
              </h3>
            </div>

            {!period ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <CalendarDays
                  size={26}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-sm text-slate-600">
                  There is currently no open evaluation period.
                </p>
              </div>
            ) : sections.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <BarChart3
                  size={26}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-sm font-medium text-slate-700">
                  No section ratings available
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Ratings will appear when students submit evaluations.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => {
                  const rating =
                    section.average_rating == null
                      ? null
                      : Number(section.average_rating);

                  const percentage =
                    rating == null
                      ? 0
                      : Math.max(0, Math.min(100, (rating / 5) * 100));

                  return (
                    <div
                      key={section.section_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            Section {section.prefix}
                          </p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {section.title}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <RatingStars rating={rating} />
                          <p className="mt-1 text-[11px] text-slate-400">
                            {section.evaluation_count} evaluations
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 p-5 sm:px-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
