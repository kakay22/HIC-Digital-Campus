
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    Check,
    CheckCircle2,
    ClipboardCheck,
    GraduationCap,
    LoaderCircle,
    MessageSquareText,
    RotateCcw,
    School,
    Send,
    ShieldCheck,
    UserRound,
} from "lucide-react";

import api from "../services/api";
import StudentDetailsForm from "../components/evaluation/StudentDetailsForm";
import SwipeEvaluation from "../components/evaluation/SwipeEvaluation";
import SuggestionForm from "../components/evaluation/SuggestionForm";

const STEPS = [
    { id: "details", label: "Details", icon: UserRound },
    { id: "questions", label: "Evaluation", icon: BookOpen },
    { id: "feedback", label: "Feedback", icon: MessageSquareText },
    { id: "review", label: "Review", icon: ClipboardCheck },
];

function getErrorMessage(error) {
    const data = error?.response?.data;

    if (!data) {
        return "Unable to connect to the server. Please try again.";
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    const firstError = Object.values(data).flat()[0];

    return typeof firstError === "string"
        ? firstError
        : "Please check your information and try again.";
}

export default function DivisionPage({ division }) {
    const isCollege = division === "college";
    const divisionCode = isCollege ? "COLLEGE" : "BASIC";
    const title = isCollege ? "College" : "Basic Education";

    const [setup, setSetup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [setupError, setSetupError] = useState("");

    const [step, setStep] = useState("details");
    const [studentDetails, setStudentDetails] = useState(null);
    const [answers, setAnswers] = useState({});
    const [feedback, setFeedback] = useState({
        commendable_features: "",
        suggestions_improvement: "",
    });

    const [submitting, setSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);

    useEffect(() => {
        let active = true;

        async function loadSetup() {
            setLoading(true);
            setSetupError("");

            try {
                const response = await api.get(
                    "/student/evaluation/setup/",
                    {
                        params: { division: divisionCode },
                    }
                );

                if (active) {
                    setSetup(response.data);
                }
            } catch (error) {
                if (active) {
                    setSetupError(getErrorMessage(error));
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadSetup();

        return () => {
            active = false;
        };
    }, [divisionCode]);

    const sections = setup?.sections ?? [];

    const questions = useMemo(
        () =>
            sections.flatMap((section) =>
                (section.questions ?? []).map((question) => ({
                    ...question,
                    sectionPrefix: section.prefix,
                    sectionTitle: section.title,
                }))
            ),
        [sections]
    );

    const answeredCount = questions.filter(
        (question) => answers[String(question.id)] !== undefined
    ).length;

    const allAnswered =
        questions.length > 0 && answeredCount === questions.length;

    const handleAnswersChange = useCallback((nextAnswers) => {
        setAnswers(nextAnswers);
    }, []);

    function handleStudentDetails(details) {
        setStudentDetails(details);
        setStep("questions");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleQuestionnaireComplete(nextAnswers) {
        setAnswers(nextAnswers);
        setStep("feedback");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function updateFeedback(event) {
        const { name, value } = event.target;

        setFeedback((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function goBack(nextStep) {
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function submitEvaluation() {
        if (!studentDetails || !allAnswered || submitting) {
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                ...studentDetails,
                division: divisionCode,
                answers,
                commendable_features: feedback.commendable_features.trim(),
                suggestions_improvement: feedback.suggestions_improvement.trim(),
            };

            const response = await api.post(
                "/student/evaluation/submit/",
                payload
            );

            setSubmissionResult(response.data);
            toast.success("Your evaluation was submitted successfully.");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    function startNewEvaluation() {
        setStep("details");
        setStudentDetails(null);
        setAnswers({});
        setFeedback({
            commendable_features: "",
            suggestions_improvement: "",
        });
        setSubmissionResult(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const activePeriod = setup?.active_period;

    const currentIndex = STEPS.findIndex(
        (entry) => entry.id === step
    );

    const inputClass =
        "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-600/10";

    return (
        <main className="min-h-screen bg-[#f7faf7]">
            <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">

                {/* Intro */}
                {!submissionResult && (
                    <div className="mb-8 text-center">

                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-green-700">
                            HIC · {title}
                        </p>

                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Teacher Evaluation
                        </h1>

                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex min-h-64 flex-col items-center justify-center text-center">
                        <LoaderCircle
                            size={34}
                            className="animate-spin text-green-700"
                        />

                        <p className="mt-4 text-sm font-semibold text-slate-700">
                            Preparing your evaluation portal...
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                            Loading teachers, questions, and evaluation period
                        </p>
                    </div>
                )}

                {/* Setup error */}
                {!loading && setupError && (
                    <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-7 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <ShieldCheck size={24} />
                        </div>

                        <h2 className="mt-4 text-lg font-bold text-slate-900">
                            Unable to load evaluation
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            {setupError}
                        </p>

                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white transition hover:bg-green-800"
                        >
                            <RotateCcw size={16} />
                            Try again
                        </button>
                    </div>
                )}

                {/* No active period */}
                {!loading && !setupError && !activePeriod && (
                    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-white p-7 text-center shadow-sm">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <CalendarDays size={24} />
                        </div>

                        <h2 className="mt-4 text-lg font-bold text-slate-900">
                            Evaluation is currently closed
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            There is no active evaluation period for {title}.
                            Please check again when the administrator opens
                            the evaluation.
                        </p>

                        <Link
                            to="/"
                            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white transition hover:bg-green-800"
                        >
                            <ArrowLeft size={16} />
                            Back to Home
                        </Link>
                    </div>
                )}

                {/* Successful submission */}
                {!loading && submissionResult && (
                    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
                            <CheckCircle2 size={36} />
                        </div>

                        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-green-700">
                            HIC Teacher Evaluation
                        </p>

                        <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                            Evaluation submitted!
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Thank you for taking the time to evaluate your
                            teacher. Your response has been recorded successfully.
                        </p>

                        <div className="mt-7 rounded-xl border border-slate-100 bg-[#f7faf7] p-5 text-left">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-slate-500">
                                    Evaluation reference
                                </span>

                                <span className="font-bold text-slate-900">
                                    #{submissionResult.evaluation_id}
                                </span>
                            </div>

                            <div className="my-3 h-px bg-slate-200" />

                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-slate-500">
                                    Questions submitted
                                </span>

                                <span className="font-semibold text-slate-900">
                                    {submissionResult.total_questions}
                                </span>
                            </div>
                        </div>

                        <p className="mt-5 text-xs leading-5 text-slate-400">
                            Your feedback will be included in the teacher
                            evaluation records.
                        </p>

                        <Link
                            to="/"
                            className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white transition hover:bg-green-800"
                        >
                            <ArrowLeft size={17} />
                            Return to Home
                        </Link>

                        <SuggestionForm
                            division={division}
                            activePeriod={activePeriod}
                        />
                    </div>
                )}

                {/* Main evaluation flow */}
                {!loading &&
                    !setupError &&
                    activePeriod &&
                    !submissionResult && (
                        <>
                            <div className="mx-auto mb-6 max-w-2xl">

                                {/* Period */}
                                <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-[#f0f8ee] px-4 py-3">
                                    <div className="flex items-center gap-2 text-green-800">
                                        <CalendarDays size={17} />

                                        <span className="text-sm font-semibold">
                                            {activePeriod.semester} Semester
                                        </span>
                                    </div>

                                    <span className="text-sm font-bold text-green-700">
                                        AY {activePeriod.academic_year}
                                    </span>
                                </div>

                                {/* Step progress */}
                                <div className="relative px-1 py-2">
                                    <div className="flex items-start">
                                        {STEPS.map((item, index) => {
                                            const Icon = item.icon;
                                            const isCurrent = index === currentIndex;
                                            const isComplete = index < currentIndex;

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="relative flex flex-1 flex-col items-center"
                                                >
                                                    {index > 0 && (
                                                        <div
                                                            className={`absolute right-1/2 top-5 h-0.5 w-full transition-colors duration-300 ${
                                                                index <= currentIndex
                                                                    ? "bg-green-600"
                                                                    : "bg-slate-200"
                                                            }`}
                                                        />
                                                    )}

                                                    <div
                                                        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                                            isComplete
                                                                ? "border-green-600 bg-green-600 text-white"
                                                                : isCurrent
                                                                    ? "border-green-700 bg-green-700 text-white shadow-lg shadow-green-200"
                                                                    : "border-slate-200 bg-white text-slate-400"
                                                        }`}
                                                    >
                                                        {isComplete ? (
                                                            <Check
                                                                size={19}
                                                                strokeWidth={2.5}
                                                            />
                                                        ) : (
                                                            <Icon size={18} />
                                                        )}
                                                    </div>

                                                    <div className="mt-3 text-center">
                                                        <p
                                                            className={`text-xs font-bold sm:text-sm ${
                                                                isCurrent
                                                                    ? "text-green-800"
                                                                    : isComplete
                                                                        ? "text-green-700"
                                                                        : "text-slate-400"
                                                            }`}
                                                        >
                                                            {item.label}
                                                        </p>

                                                        <p className="mt-0.5 hidden text-[10px] font-medium text-slate-400 sm:block">
                                                            {isCurrent
                                                                ? "In progress"
                                                                : isComplete
                                                                    ? "Completed"
                                                                    : "Upcoming"}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Step 1: Student details */}
                            {step === "details" && (
                                <StudentDetailsForm
                                    division={division}
                                    teachers={setup?.teachers ?? []}
                                    courses={setup?.courses ?? []}
                                    activePeriod={activePeriod}
                                    loading={false}
                                    initialValues={studentDetails ?? {}}
                                    onSubmit={handleStudentDetails}
                                />
                            )}

                            {/* Step 2: Questionnaire */}
                            {step === "questions" && (
                                <div>
                                    <SwipeEvaluation
                                        sections={sections}
                                        initialAnswers={answers}
                                        onAnswersChange={handleAnswersChange}
                                        onComplete={handleQuestionnaireComplete}
                                    />

                                    <div className="mx-auto mt-5 max-w-2xl">
                                        <button
                                            type="button"
                                            onClick={() => goBack("details")}
                                            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-green-800"
                                        >
                                            <ArrowLeft size={17} />
                                            Back to student details
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Optional feedback */}
                            {step === "feedback" && (
                                <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                            <MessageSquareText size={22} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900">
                                                Additional Feedback
                                            </h2>

                                            <p className="text-sm text-slate-500">
                                                These comments are optional.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label
                                                htmlFor="commendable_features"
                                                className="text-sm font-semibold text-slate-700"
                                            >
                                                Commendable features
                                            </label>

                                            <p className="mt-1 text-xs text-slate-400">
                                                What do you appreciate about this teacher?
                                            </p>

                                            <textarea
                                                id="commendable_features"
                                                name="commendable_features"
                                                value={feedback.commendable_features}
                                                onChange={updateFeedback}
                                                maxLength={2000}
                                                rows={4}
                                                placeholder="Share the teacher's strengths..."
                                                className={inputClass + " resize-y py-3"}
                                            />
                                        </div>

                                        <div>
                                            <label
                                                htmlFor="suggestions_improvement"
                                                className="text-sm font-semibold text-slate-700"
                                            >
                                                Suggestions for improvement
                                            </label>

                                            <p className="mt-1 text-xs text-slate-400">
                                                What could help improve the teaching experience?
                                            </p>

                                            <textarea
                                                id="suggestions_improvement"
                                                name="suggestions_improvement"
                                                value={feedback.suggestions_improvement}
                                                onChange={updateFeedback}
                                                maxLength={2000}
                                                rows={4}
                                                placeholder="Share your suggestions..."
                                                className={inputClass + " resize-y py-3"}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                                        <button
                                            type="button"
                                            onClick={() => goBack("questions")}
                                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                                        >
                                            <ArrowLeft size={17} />
                                            Back to questions
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => goBack("review")}
                                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white transition hover:bg-green-800"
                                        >
                                            Review evaluation
                                            <ArrowRight size={17} />
                                        </button>
                                    </div>
                                </section>
                            )}

                            {/* Step 4: Review */}
                            {step === "review" && (
                                <section className="mx-auto max-w-2xl space-y-5">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                                        <div className="mb-5 flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                                                <ClipboardCheck size={22} />
                                            </div>

                                            <div>
                                                <h2 className="text-lg font-bold text-slate-900">
                                                    Review your evaluation
                                                </h2>

                                                <p className="text-sm text-slate-500">
                                                    Please check your details and answers before submitting.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-[#f7faf7] p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm text-slate-500">
                                                    Student ID
                                                </span>

                                                <span className="text-sm font-bold text-slate-900">
                                                    {studentDetails?.student_id}
                                                </span>
                                            </div>

                                            <div className="my-3 h-px bg-slate-200" />

                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm text-slate-500">
                                                    Teacher
                                                </span>

                                                <span className="text-right text-sm font-semibold text-slate-900">
                                                    {setup?.teachers?.find(
                                                        (teacher) =>
                                                            String(teacher.id) ===
                                                            String(studentDetails?.teacher)
                                                    )?.full_name ?? "Selected teacher"}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <span className="text-sm text-slate-500">
                                                    Subject
                                                </span>

                                                <span className="text-right text-sm font-semibold text-slate-900">
                                                    {studentDetails?.subject}
                                                </span>
                                            </div>

                                            {isCollege && (
                                                <div className="mt-3 flex items-center justify-between gap-3">
                                                    <span className="text-sm text-slate-500">
                                                        Course
                                                    </span>

                                                    <span className="text-right text-sm font-semibold text-slate-900">
                                                        {setup?.courses?.find(
                                                            (course) =>
                                                                String(course.id) ===
                                                                String(studentDetails?.course)
                                                        )?.name ?? "Selected course"}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <span className="text-sm text-slate-500">
                                                    {isCollege ? "Year level" : "Grade level"}
                                                </span>

                                                <span className="text-sm font-semibold text-slate-900">
                                                    {studentDetails?.year_level}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between gap-3">
                                            <h3 className="font-bold text-slate-900">
                                                Questionnaire answers
                                            </h3>

                                            <span className="text-xs font-semibold text-green-700">
                                                {answeredCount}/{questions.length} completed
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-4">
                                            {sections.map((section) => (
                                                <div
                                                    key={section.id}
                                                    className="overflow-hidden rounded-xl border border-slate-200"
                                                >
                                                    <div className="bg-[#f3faf1] px-4 py-3">
                                                        <p className="text-sm font-bold text-green-900">
                                                            {section.prefix}. {section.title}
                                                        </p>
                                                    </div>

                                                    <div className="divide-y divide-slate-100">
                                                        {(section.questions ?? []).map((question) => {
                                                            const answer =
                                                                answers[String(question.id)];

                                                            const ratingLabel = {
                                                                "5": "Outstanding",
                                                                "4": "Good",
                                                                "3": "Average",
                                                                "2": "Needs Improvement",
                                                                "1": "Unsatisfactory",
                                                                N: "Not Observed",
                                                            }[answer];

                                                            return (
                                                                <div
                                                                    key={question.id}
                                                                    className="flex items-start justify-between gap-4 px-4 py-3"
                                                                >
                                                                    <p className="text-sm leading-6 text-slate-600">
                                                                        {question.order}. {question.text}
                                                                    </p>

                                                                    <span className="shrink-0 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800">
                                                                        {answer} · {ratingLabel}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6">
                                            <h3 className="font-bold text-slate-900">
                                                Additional feedback
                                            </h3>

                                            <div className="mt-3 space-y-3">
                                                <div className="rounded-xl bg-[#f7faf7] p-4">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        Commendable features
                                                    </p>

                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                                        {feedback.commendable_features.trim() ||
                                                            "No additional comment."}
                                                    </p>
                                                </div>

                                                <div className="rounded-xl bg-[#f7faf7] p-4">
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        Suggestions for improvement
                                                    </p>

                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                                        {feedback.suggestions_improvement.trim() ||
                                                            "No additional comment."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                                        <button
                                            type="button"
                                            onClick={() => goBack("feedback")}
                                            disabled={submitting}
                                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            <ArrowLeft size={17} />
                                            Back to feedback
                                        </button>

                                        <button
                                            type="button"
                                            onClick={submitEvaluation}
                                            disabled={submitting || !allAnswered}
                                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-green-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-600/20 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        >
                                            {submitting ? (
                                                <>
                                                    <LoaderCircle
                                                        size={18}
                                                        className="animate-spin"
                                                    />
                                                    Submitting...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={17} />
                                                    Submit evaluation
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {!allAnswered && (
                                        <p className="text-center text-xs text-red-600">
                                            Please answer all questions before submitting.
                                        </p>
                                    )}
                                </section>
                            )}
                        </>
                    )}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white px-4 py-5">
                <p className="text-center text-xs text-slate-400">
                    HIC · {title} Teacher Evaluation Portal
                </p>
            </footer>
        </main>
    );
}
