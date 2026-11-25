
import { useState } from "react";
import {
  MessageSquareText,
  Send,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

const CATEGORIES = [
  {
    value: "SHORTER_FORM",
    label: "Shorter and easier evaluation form",
  },
  {
    value: "BETTER_QUESTIONS",
    label: "Clearer or better questions",
  },
  {
    value: "ANONYMITY",
    label: "More privacy and anonymity",
  },
  {
    value: "EARLIER",
    label: "Conduct evaluations earlier",
  },
  {
    value: "SEE_RESULTS",
    label: "See results and improvements afterward",
  },
  {
    value: "MOBILE",
    label: "Better mobile experience",
  },
  {
    value: "OTHER",
    label: "Other suggestions",
  },
];

export default function SuggestionForm({
  division = "college",
  activePeriod = null,
}) {
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const educationLevel =
    division === "college" ? "COLLEGE" : "BASIC";

  function toggleCategory(value) {
    setCategories((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (categories.length === 0 && !message.trim()) {
      toast.error("Please select a category or write a suggestion.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post(
        "/student/suggestions/submit/",
        {
          education_level: educationLevel,
          categories,
          message: message.trim(),
          student_name: studentName.trim(),
          student_id: studentId.trim(),
        }
      );

      toast.success(
        response.data.detail || "Suggestion submitted successfully!"
      );

      setCategories([]);
      setMessage("");
      setStudentName("");
      setStudentId("");
      setSubmitted(true);
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Unable to submit your suggestion. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((previous) => !previous)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50 sm:p-5"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <MessageSquareText size={21} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Suggest an Improvement
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Help us improve the teacher evaluation system.
            </p>
          </div>
        </div>

        {expanded ? (
          <ChevronUp size={20} className="text-slate-500" />
        ) : (
          <ChevronDown size={20} className="text-slate-500" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 sm:p-5">
          {submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2
                size={42}
                className="mx-auto text-emerald-500"
              />

              <h4 className="mt-3 font-bold text-slate-900">
                Thank you for your feedback!
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Your suggestion has been received and will be reviewed.
              </p>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 text-sm font-semibold text-violet-600 hover:text-violet-700"
              >
                Submit another suggestion
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  What can we improve?
                </p>

                <div className="space-y-2">
                  {CATEGORIES.map((category) => (
                    <label
                      key={category.value}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50/50"
                    >
                      <input
                        type="checkbox"
                        checked={categories.includes(category.value)}
                        onChange={() => toggleCategory(category.value)}
                        className="mt-0.5 h-4 w-4 accent-violet-600"
                      />

                      <span className="text-sm text-slate-700">
                        {category.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="suggestion-message"
                  className="text-sm font-semibold text-slate-700"
                >
                  Additional details
                  <span className="ml-1 font-normal text-slate-400">
                    (Optional)
                  </span>
                </label>

                <textarea
                  id="suggestion-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Tell us how we can make the evaluation system better..."
                  className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {message.length}/1000
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={17} />
                    Submit Suggestion
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
