
const ratings = [
  { value: "5", label: "Outstanding" },
  { value: "4", label: "Good" },
  { value: "3", label: "Average" },
  { value: "2", label: "Needs Improvement" },
  { value: "1", label: "Unsatisfactory" },
  { value: "N", label: "Not Observed" },
];

export default function RatingGuide() {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="font-bold text-slate-900">Rating guide</h2>
      <p className="mt-1 text-sm text-slate-500">
        Choose the rating that best describes the teacher's performance for
        each statement.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ratings.map((rating) => (
          <div
            key={rating.value}
            className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 font-bold text-violet-700">
              {rating.value}
            </span>
            <span className="text-xs font-medium text-slate-700 sm:text-sm">
              {rating.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
