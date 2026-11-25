import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { flushSync } from "react-dom";

import {
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Hand,
    Lock,
} from "lucide-react";

import { animate } from "animejs";
import "./SwipeEvaluation.css";

const RATINGS = [
    { value: "5", label: "Outstanding" },
    { value: "4", label: "Good" },
    { value: "3", label: "Average" },
    { value: "2", label: "Needs Improvement" },
    { value: "1", label: "Unsatisfactory" },
    { value: "N", label: "Not Observed" },
];

// Stable default so the `initialAnswers` effect doesn't fire every render
// (a fresh `{}` default would reset the user's answers on each re-render).
const EMPTY_ANSWERS = {};

// Space between the two cards while they slide.
const CARD_GAP = 24;

// Short, fixed-length tweens (no spring settling tail). The slide scales
// with the distance left to travel, so a short release finishes quickly.
const SLIDE_EASE = "out(3)";
const SLIDE_MIN_MS = 160;
const SLIDE_EXTRA_MS = 120;
const SNAP_BACK_EASE = "out(3)";
const SNAP_BACK_MS = 200;

// Fast flick = swipe, even if the drag distance is under the threshold.
const FLICK_VELOCITY = 0.45; // px per ms
const FLICK_MIN_DISTANCE = 24; // px

function setCardX(element, x) {
    if (!element) return;
    element.style.transform = `translate3d(${x}px, 0, 0)`;
}

function getQuestionKey(question, section) {
    return String(
        question.id ?? `${section.prefix ?? section.id}-${question.order}`
    );
}

export default function SwipeEvaluation({
    sections = [],
    initialAnswers = EMPTY_ANSWERS,
    onAnswersChange,
    onComplete,
}) {
    const [answers, setAnswers] = useState(initialAnswers);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previewDirection, setPreviewDirection] = useState(0);

    const cardAreaRef = useRef(null);
    const activeCardRef = useRef(null);
    const previewCardRef = useRef(null);

    const pointerStart = useRef(null);
    const dragXRef = useRef(0);
    const didDragRef = useRef(false);
    const cardWidthRef = useRef(320);

    const currentIndexRef = useRef(0);
    const finishRef = useRef(null); // completes the running animation instantly
    const previewDirectionRef = useRef(0);
    const animationRef = useRef([]);

    const questions = useMemo(
        () =>
            sections.flatMap((section) =>
                (section.questions ?? []).map((question) => ({
                    ...question,
                    sectionId: section.id,
                    sectionPrefix: section.prefix,
                    sectionTitle: section.title,
                    answerKey: getQuestionKey(question, section),
                }))
            ),
        [sections]
    );

    useEffect(() => {
        setAnswers(initialAnswers ?? EMPTY_ANSWERS);
    }, [initialAnswers]);

    useEffect(() => {
        onAnswersChange?.(answers);
    }, [answers, onAnswersChange]);

    const totalQuestions = questions.length;
    const currentQuestion = questions[currentIndex];

    const answeredCount = questions.filter(
        (question) => answers[question.answerKey] !== undefined
    ).length;

    const allAnswered =
        totalQuestions > 0 && answeredCount === totalQuestions;

    const progress = totalQuestions
        ? (answeredCount / totalQuestions) * 100
        : 0;

    const previewQuestion =
        previewDirection === 1
            ? questions[currentIndex + 1]
            : previewDirection === -1
                ? questions[currentIndex - 1]
                : null;

    const previewIndex =
        previewDirection === 1 ? currentIndex + 1 : currentIndex - 1;

    // Distance between the two card origins: one card width plus a gap.
    function getSpacing() {
        return cardWidthRef.current + CARD_GAP;
    }

    function measureCardWidth() {
        cardWidthRef.current =
            cardAreaRef.current?.getBoundingClientRect().width || 320;
    }

    function stopAnimations() {
        animationRef.current.forEach((animation) => animation?.pause());
        animationRef.current = [];
    }

    function setPreviewDirectionSafe(direction) {
        if (previewDirectionRef.current === direction) return;

        previewDirectionRef.current = direction;
        setPreviewDirection(direction);
    }

    // Position the preview card before paint whenever its direction or
    // question changes, so it never flashes in the wrong place.
    useLayoutEffect(() => {
        if (!previewCardRef.current) return;

        measureCardWidth();

        const direction = previewDirectionRef.current;
        const spacing = getSpacing();

        setCardX(
            previewCardRef.current,
            direction === 0 ? spacing : direction * spacing + dragXRef.current
        );
    }, [previewDirection, currentIndex, totalQuestions]);

    useEffect(() => {
        return () => {
            stopAnimations();
        };
    }, []);

    // Keep a ref to the index so handlers never act on a stale closure
    // while a slide is finishing.
    useLayoutEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    // If a slide/snap-back is still running, jump it to its end state now.
    // Input is never blocked: the next touch just completes the animation.
    function finishPending() {
        const finish = finishRef.current;

        if (!finish) return;

        stopAnimations();
        finish();
    }

    function handleRating(answerKey, value) {
        setAnswers((previous) => ({
            ...previous,
            [answerKey]: value,
        }));
    }

    /**
     * Slide to the adjacent question.
     *
     * One animejs animation drives a 0 -> 1 value and both cards are placed
     * from it every frame, so they move in lockstep (no gap, no overlap).
     */
    function commitSlide(direction, startX = 0) {
        // Prevent moving forward until the current question is answered.
        if (direction === 1) {
            const activeQuestion = questions[currentIndexRef.current];

            if (
                !activeQuestion ||
                answers[activeQuestion.answerKey] === undefined
            ) {
                snapBack();
                return;
            }
        }
        const nextIndex = currentIndexRef.current + direction;

        if (nextIndex < 0 || nextIndex >= totalQuestions) {
            snapBack();
            return;
        }

        stopAnimations();

        // Render the preview question before the incoming card moves.
        flushSync(() => setPreviewDirectionSafe(direction));

        const spacing = getSpacing();
        const endX = -direction * spacing; // outgoing card ends one slot away
        const state = { value: 0 };

        const render = (t) => {
            const x = startX + (endX - startX) * t;
            setCardX(activeCardRef.current, x);
            setCardX(previewCardRef.current, x + direction * spacing);
        };

        const finalize = () => {
            if (finishRef.current !== finalize) return;
            finishRef.current = null;
            animationRef.current = [];

            render(1);
            dragXRef.current = 0;
            currentIndexRef.current = nextIndex;

            // Swap content and reset positions in one synchronous block; the
            // active card now shows what the incoming card showed, so nothing
            // visibly changes.
            flushSync(() => {
                setCurrentIndex(nextIndex);
                setPreviewDirectionSafe(0);
            });

            setCardX(activeCardRef.current, 0);
            setCardX(previewCardRef.current, getSpacing());
        };

        finishRef.current = finalize;
        render(0);

        const remaining = Math.min(1, Math.abs(endX - startX) / spacing);

        animationRef.current = [
            animate(state, {
                value: 1,
                duration: Math.round(SLIDE_MIN_MS + SLIDE_EXTRA_MS * remaining),
                ease: SLIDE_EASE,
                onUpdate: () => render(state.value),
                onComplete: finalize,
            }),
        ];
    }

    function snapBack() {
        const startX = dragXRef.current;
        const direction = previewDirectionRef.current;

        stopAnimations();

        const reset = () => {
            dragXRef.current = 0;
            flushSync(() => setPreviewDirectionSafe(0));
            setCardX(activeCardRef.current, 0);
            setCardX(previewCardRef.current, getSpacing());
        };

        if (startX === 0) {
            reset();
            return;
        }

        const spacing = getSpacing();
        const state = { value: 0 };

        const render = (t) => {
            const x = startX * (1 - t);
            setCardX(activeCardRef.current, x);

            if (direction !== 0) {
                setCardX(previewCardRef.current, direction * spacing + x);
            }
        };

        const finalize = () => {
            if (finishRef.current !== finalize) return;
            finishRef.current = null;
            animationRef.current = [];

            render(1);
            reset();
        };

        finishRef.current = finalize;

        animationRef.current = [
            animate(state, {
                value: 1,
                duration: SNAP_BACK_MS,
                ease: SNAP_BACK_EASE,
                onUpdate: () => render(state.value),
                onComplete: finalize,
            }),
        ];
    }

    // Previous / Next buttons: same slide as a swipe, never disabled.
    function step(delta) {
        finishPending();

        if (delta > 0) {
            const activeQuestion = questions[currentIndexRef.current];

            if (
                !activeQuestion ||
                answers[activeQuestion.answerKey] === undefined
            ) {
                return;
            }
        }

        const nextIndex = currentIndexRef.current + delta;

        if (nextIndex < 0 || nextIndex >= totalQuestions) return;

        measureCardWidth();
        dragXRef.current = 0;
        pointerStart.current = null;

        commitSlide(delta > 0 ? 1 : -1, 0);
    }

    function handlePointerDown(event) {
        if (!event.isPrimary) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        didDragRef.current = false;

        pointerStart.current = {
            x: event.clientX,
            y: event.clientY,
            axis: null,
            lastX: event.clientX,
            lastT: performance.now(),
            velocity: 0,
        };

        measureCardWidth();

        // Pointer capture is deferred until we know it's a horizontal drag,
        // so taps on the rating buttons still work.
    }

    function handlePointerMove(event) {
        const start = pointerStart.current;

        if (!start) return;

        if (!start.axis) {
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;

            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

            start.axis = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";

            if (start.axis === "horizontal") {
                didDragRef.current = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);

                // A slide was still finishing: complete it instantly and take
                // over from rest, so a new swipe is never ignored.
                if (finishRef.current) {
                    finishPending();
                    measureCardWidth();

                    start.x = event.clientX;
                    start.lastX = event.clientX;
                    start.lastT = performance.now();
                    start.velocity = 0;
                }
            }
        }

        if (start.axis !== "horizontal") return;

        const deltaX = event.clientX - start.x;

        // Track velocity for flick detection (smoothed).
        const now = performance.now();
        const dt = now - start.lastT;

        if (dt > 0) {
            const instant = (event.clientX - start.lastX) / dt;
            start.velocity = start.velocity * 0.6 + instant * 0.4;
            start.lastX = event.clientX;
            start.lastT = now;
        }

        const index = currentIndexRef.current;
        const hasPrevious = index > 0;
        const hasNext = index < totalQuestions - 1;

        const activeQuestion = questions[index];
        const canGoNext =
            activeQuestion &&
            answers[activeQuestion.answerKey] !== undefined;

        let adjustedX = deltaX;

        // Prevent forward swiping while unanswered.
        if (deltaX < 0 && !canGoNext) {
            adjustedX = deltaX * 0.12;
        }

        // Rubber-band resistance at the ends of the deck.
        if ((deltaX > 0 && !hasPrevious) || (deltaX < 0 && !hasNext)) {
            adjustedX = deltaX * 0.18;
        }

        dragXRef.current = adjustedX;

        const direction = adjustedX < 0 ? 1 : adjustedX > 0 ? -1 : 0;

        const canPreview =
            (direction === 1 && hasNext && canGoNext) ||
            (direction === -1 && hasPrevious);

        const nextPreviewDirection = canPreview ? direction : 0;

        // Render the preview card's content before it's positioned.
        if (previewDirectionRef.current !== nextPreviewDirection) {
            flushSync(() => setPreviewDirectionSafe(nextPreviewDirection));
        }

        // Direct DOM writes keep dragging smooth.
        setCardX(activeCardRef.current, adjustedX);

        if (nextPreviewDirection !== 0) {
            setCardX(
                previewCardRef.current,
                nextPreviewDirection * getSpacing() + adjustedX
            );
        }
    }

    function handlePointerUp(event) {
        const start = pointerStart.current;

        if (!start) return;

        pointerStart.current = null;

        if (start.axis !== "horizontal") return;

        const deltaX = event.clientX - start.x;

        const threshold = Math.max(
            65,
            Math.min(105, cardWidthRef.current * 0.22)
        );

        const isFlick =
            Math.abs(start.velocity) > FLICK_VELOCITY &&
            Math.abs(deltaX) > FLICK_MIN_DISTANCE;

        if (!isFlick && Math.abs(deltaX) < threshold) {
            snapBack();
            return;
        }

        const direction = (isFlick ? start.velocity : deltaX) < 0 ? 1 : -1;

        commitSlide(direction, dragXRef.current);
    }

    function handlePointerCancel() {
        const start = pointerStart.current;

        if (!start) return;

        pointerStart.current = null;

        if (start.axis === "horizontal") {
            snapBack();
        }
    }

    // A drag that starts on a button must not also count as a click on it.
    function handleClickCapture(event) {
        if (!didDragRef.current) return;

        didDragRef.current = false;
        event.preventDefault();
        event.stopPropagation();
    }

    function handleFinish() {
        if (!allAnswered) return;

        finishPending();
        onComplete?.(answers);
    }

    function renderQuestionContent(question, index) {
        if (!question) return null;

        const rating = answers[question.answerKey];

        return (
            <>
                <div className="mb-6 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="inline-flex rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-800">
                            {question.sectionPrefix ? `${question.sectionPrefix} · ` : ""}
                            {question.sectionTitle ?? "Evaluation"}
                        </span>

                        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Question {index + 1} of {totalQuestions}
                        </p>
                    </div>

                    {rating !== undefined && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={14} />
                            Answered
                        </span>
                    )}
                </div>

                <h2 className="min-h-32 text-xl font-bold leading-[1.65] tracking-tight text-slate-900 sm:text-2xl sm:leading-[1.7]">
                    {question.text}
                </h2>

                <div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {RATINGS.map((item) => {
                            const isSelected = rating === item.value;

                            return (
                                <button
                                    key={item.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => handleRating(question.answerKey, item.value)}
                                    className={`rating-option relative flex min-h-24 flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition-all duration-200 ${isSelected
                                        ? "border-green-600 bg-green-50 text-green-900 ring-1 ring-green-600 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50/50"
                                        }`}
                                >
                                    <span className="text-2xl font-extrabold">
                                        {item.value}
                                    </span>

                                    <span className="mt-1 text-xs font-medium leading-tight">
                                        {item.label}
                                    </span>

                                    {isSelected && (
                                        <span className="absolute right-3 top-3 text-green-700">
                                            <Check size={15} />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Hand size={15} />
                    Swipe left for next question · Swipe right for previous
                </div>
            </>
        );
    }

    if (totalQuestions === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-semibold text-slate-700">
                    No evaluation questions are available.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                    Please try again later or contact the administrator.
                </p>
            </div>
        );
    }

    return (
        <section className="mx-auto w-full max-w-2xl">
            {/* Progress */}
            <div className="swipe-progress-card mb-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">
                            Your evaluation progress
                        </p>

                        <p className="mt-0.5 text-xs text-slate-500">
                            {answeredCount} of {totalQuestions} questions answered
                        </p>
                    </div>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-green-800">
                        {Math.round(progress)}%
                    </span>
                </div>

                <div
                    className="h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-valuenow={answeredCount}
                    aria-valuemin={0}
                    aria-valuemax={totalQuestions}
                    aria-label="Evaluation progress"
                >
                    <div
                        className="h-full rounded-full bg-green-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Card stack */}
            <div
                ref={cardAreaRef}
                className="swipe-card-area"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onClickCapture={handleClickCapture}
            >
                {/* Preview card stays mounted */}
                <article
                    ref={previewCardRef}
                    className="swipe-question-card swipe-preview-card"
                    aria-hidden={!previewQuestion}
                    style={{
                        zIndex: 1,
                        visibility: previewQuestion ? "visible" : "hidden",
                    }}
                >
                    {renderQuestionContent(previewQuestion, previewIndex)}
                </article>

                {/* Active card stays mounted */}
                <article
                    ref={activeCardRef}
                    className="swipe-question-card swipe-active-card"
                    style={{ zIndex: 2 }}
                >
                    {renderQuestionContent(currentQuestion, currentIndex)}
                </article>
            </div>

            {/* Navigation */}
            <div className="mt-5 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => step(-1)}
                    disabled={currentIndex === 0}
                    className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    <ChevronLeft size={18} />
                    Previous
                </button>

                {currentIndex < totalQuestions - 1 ? (
                    <button
                        type="button"
                        onClick={() => step(1)}
                        disabled={answers[currentQuestion.answerKey] === undefined}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:opacity-70"
                    >
                        Next question
                        <ChevronRight size={18} />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleFinish}
                        disabled={!allAnswered}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {allAnswered ? (
                            <>
                                Review answers
                                <ArrowRight size={18} />
                            </>
                        ) : (
                            <>
                                <Lock size={16} />
                                Answer all questions
                            </>
                        )}
                    </button>
                )}
            </div>

            {!allAnswered && currentIndex === totalQuestions - 1 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                    You still have {totalQuestions - answeredCount} unanswered{" "}
                    {totalQuestions - answeredCount === 1 ? "question" : "questions"}.
                </p>
            )}
        </section>
    );
}