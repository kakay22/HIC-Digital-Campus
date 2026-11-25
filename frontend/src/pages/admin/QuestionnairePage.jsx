import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Eye,
  FileText,
  Layers3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  Pencil,
  Copy,
  Check,
  GripVertical,
} from "lucide-react";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import toast from "react-hot-toast";

import questionnaireService from "../../services/questionnaireService";

const DIVISIONS = [
  { value: "COLLEGE", label: "College" },
  { value: "BASIC", label: "Basic Ed" },
  { value: "BOTH", label: "Both" },
];

function getErrorMessage(error) {
  const data = error?.response?.data;

  if (!data) {
    return error?.message || "Something went wrong. Please try again.";
  }

  if (typeof data.detail === "string") return data.detail;

  if (typeof data === "string") return data;

  return Object.entries(data)
    .map(([key, value]) => {
      const message = Array.isArray(value) ? value.join(", ") : value;
      return `${key}: ${message}`;
    })
    .join("\n");
}

function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
        <FileText size={23} />
      </div>
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
    </div>
  );
}

function Modal({ title, children, onClose, size = "max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-4">
      <div
        className={`w-full ${size} overflow-hidden rounded-2xl bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function QuestionEditor({
  initialText = "",
  title,
  onSave,
  onCancel,
  saving,
}) {
  const [text, setText] = useState(initialText);

  const submit = (event) => {
    event.preventDefault();

    if (!text.trim()) return;

    onSave(text.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {title}
        </label>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={4}
          autoFocus
          maxLength={3000}
          placeholder="Enter the question..."
          className="w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={!text.trim() || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <LoaderCircle size={16} className="animate-spin" />}
          <Save size={16} />
          Save
        </button>
      </div>
    </form>
  );
}

function SortableQuestion({
  question,
  index,
  saving,
  onEdit,
  onToggle,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: question.id,
    disabled: saving,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2 rounded-xl border bg-white p-3 transition ${isDragging
        ? "border-violet-400 shadow-lg ring-2 ring-violet-100 opacity-90"
        : question.is_active
          ? "border-gray-200"
          : "border-gray-100 opacity-60"
        }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={saving}
        title="Drag to change question numbering"
        aria-label={`Reorder question ${index + 1}`}
        className="mt-0.5 flex h-8 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-gray-400 transition hover:bg-violet-50 hover:text-violet-600 active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical size={19} />
      </button>

      {/* Automatic numbering */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-700">
        {index + 1}
      </div>

      {/* Question text */}
      <div className="min-w-0 flex-1 pt-1">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {question.text}
        </p>

        {!question.is_active && (
          <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Inactive
          </span>
        )}
      </div>

      {/* Question actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          title="Edit question"
          onClick={onEdit}
          disabled={saving}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40"
        >
          <Pencil size={15} />
        </button>

        <button
          type="button"
          title={
            question.is_active
              ? "Deactivate question"
              : "Activate question"
          }
          onClick={onToggle}
          disabled={saving}
          className={`rounded-lg p-1.5 disabled:opacity-40 ${question.is_active
            ? "text-emerald-600 hover:bg-emerald-50"
            : "text-gray-400 hover:bg-gray-100"
            }`}
        >
          {question.is_active ? (
            <ToggleRight size={19} />
          ) : (
            <ToggleLeft size={19} />
          )}
        </button>
      </div>
    </div>
  );
}

function SectionCard({

  section,
  division,
  sectionIndex,
  sectionCount,
  onEditSection,
  onAddQuestion,
  onEditQuestion,
  onToggleQuestion,
  onMoveSection,
  onReorderQuestions,
  saving,
}) {

  const [expanded, setExpanded] = useState(true);
  const activeCount = section.questions.filter((q) => q.is_active).length;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-lg font-bold text-violet-700">
            {section.prefix}
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-gray-900">
              {section.prefix} — {section.title}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              {section.questions.length} questions · {activeCount} active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Move section up"
            disabled={sectionIndex === 0 || saving}
            onClick={() => onMoveSection(sectionIndex, -1)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronUp size={17} />
          </button>

          <button
            type="button"
            title="Move section down"
            disabled={sectionIndex === sectionCount - 1 || saving}
            onClick={() => onMoveSection(sectionIndex, 1)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronDown size={17} />
          </button>

          {division !== "BOTH" && (
            <button
              type="button"
              title="Edit section"
              onClick={() => onEditSection(section)}
              className="rounded-lg p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-700"
            >
              <Pencil size={16} />
            </button>
          )}

          <button
            type="button"
            title={expanded ? "Collapse section" : "Expand section"}
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <ChevronDown
              size={18}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-4 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Questions in this section
            </h4>

            {division !== "BOTH" && (
              <button
                type="button"
                onClick={() => onAddQuestion(section)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                <Plus size={14} />
                Add question
              </button>
            )}
          </div>

          {section.questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
              No questions in this section yet.
            </p>
          ) : (
            <div className="space-y-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return;

                  onReorderQuestions(section, active.id, over.id);
                }}
              >
                <SortableContext
                  items={section.questions.map((question) => question.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {section.questions.map((question, index) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      saving={saving}
                      onEdit={() => onEditQuestion(section, question)}
                      onToggle={() => onToggleQuestion(question)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function QuestionnairePreview({ questionnaires, onClose }) {
  return (
    <Modal
      title="Questionnaire preview"
      onClose={onClose}
      size="max-w-3xl"
    >
      <div className="space-y-6">
        {questionnaires.map((questionnaire) => (
          <div key={questionnaire.education_level}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {questionnaire.education_level === "COLLEGE"
                  ? "College"
                  : "Basic Education"}
              </h3>

              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                Student preview
              </span>
            </div>

            {questionnaire.sections.map((section) => {
              const activeQuestions = section.questions.filter(
                (question) => question.is_active
              );

              return (
                <div
                  key={section.id}
                  className="mb-4 rounded-xl border border-gray-200 p-4"
                >
                  <h4 className="font-semibold text-gray-900">
                    {section.prefix} — {section.title}
                  </h4>

                  <div className="mt-3 space-y-3">
                    {activeQuestions.map((question, index) => (
                      <div key={question.id} className="text-sm">
                        <p className="text-gray-700">
                          {index + 1}. {question.text}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {["5", "4", "3", "2", "1", "N"].map((rating) => (
                            <span
                              key={rating}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-500"
                            >
                              {rating}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {activeQuestions.length === 0 && (
                      <p className="text-sm text-gray-400">
                        No active questions.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function QuestionnairePage() {
  const [division, setDivision] = useState("COLLEGE");
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editor, setEditor] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const reorderQuestions = async (section, activeId, overId) => {
    const next = [...section.questions];

    const oldIndex = next.findIndex(
      (question) => String(question.id) === String(activeId)
    );

    const newIndex = next.findIndex(
      (question) => String(question.id) === String(overId)
    );

    if (oldIndex === -1 || newIndex === -1) return;

    const [movedQuestion] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, movedQuestion);

    setSaving(true);

    try {
      await questionnaireService.reorderQuestions(
        section.id,
        next.map((question) => question.id)
      );

      setQuestionnaires((previous) =>
        previous.map((questionnaire) => ({
          ...questionnaire,
          sections: questionnaire.sections.map((item) =>
            String(item.id) === String(section.id)
              ? { ...item, questions: next }
              : item
          ),
        }))
      );

      toast.success("Question numbering updated!");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Failed to reorder questions.");
    } finally {
      setSaving(false);
    }
  };

  const loadQuestionnaire = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await questionnaireService.get(division);

      const list =
        division === "BOTH"
          ? result.questionnaires || []
          : [result];

      setQuestionnaires(list);
    } catch (err) {
      setError(getErrorMessage(err));
      setQuestionnaires([]);
    } finally {
      setLoading(false);
    }
  }, [division]);

  useEffect(() => {
    loadQuestionnaire();
  }, [loadQuestionnaire]);

  const selectedQuestionnaire = useMemo(
    () =>
      questionnaires.find(
        (item) => item.education_level === division
      ),
    [questionnaires, division]
  );

  const totalSections = questionnaires.reduce(
    (total, item) => total + item.sections.length,
    0
  );

  const totalQuestions = questionnaires.reduce(
    (total, item) =>
      total +
      item.sections.reduce(
        (sectionTotal, section) =>
          sectionTotal + section.questions.length,
        0
      ),
    0
  );

  const activeQuestions = questionnaires.reduce(
    (total, item) =>
      total +
      item.sections.reduce(
        (sectionTotal, section) =>
          sectionTotal +
          section.questions.filter((question) => question.is_active).length,
        0
      ),
    0
  );

  const notifySuccess = (message) => {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  };

  const perform = async (action, message) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await action();
      await loadQuestionnaire();
      notifySuccess(message);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openSectionEditor = (section) => {
    setEditor({
      type: "section",
      section,
    });
  };

  const openQuestionEditor = (section, question = null) => {
    setEditor({
      type: question ? "edit-question" : "add-question",
      section,
      question,
    });
  };

  const saveSection = async (title) => {
    if (!editor?.section) return;

    const success = await perform(
      () =>
        questionnaireService.updateSection(editor.section.id, {
          title,
        }),
      "Section updated successfully."
    );

    if (success) setEditor(null);
  };

  const saveQuestion = async (text) => {
    if (!editor) return;

    let success;

    if (editor.type === "add-question") {
      success = await perform(
        () =>
          questionnaireService.createQuestion({
            section: editor.section.id,
            text,
          }),
        "Question added successfully."
      );
    } else {
      success = await perform(
        () =>
          questionnaireService.updateQuestion(editor.question.id, {
            text,
          }),
        "Question updated successfully."
      );
    }

    if (success) setEditor(null);
  };

  const addSection = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const prefix = String(formData.get("prefix") || "").trim().toUpperCase();
    const title = String(formData.get("title") || "").trim();

    if (!selectedQuestionnaire) return;

    const success = await perform(
      () =>
        questionnaireService.createSection({
          education_level: division,
          prefix,
          title,
        }),
      "Section created successfully."
    );

    if (success) setEditor(null);
  };

  const toggleQuestion = async (question) => {
    await perform(
      () =>
        questionnaireService.toggleQuestion(
          question.id,
          !question.is_active
        ),
      question.is_active
        ? "Question deactivated."
        : "Question activated."
    );
  };

  const moveSection = async (questionnaire, index, direction) => {
    const next = [...questionnaire.sections];
    const target = index + direction;

    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];

    await perform(
      () =>
        questionnaireService.reorderSections(
          questionnaire.education_level,
          next.map((section) => section.id)
        ),
      "Sections reordered."
    );
  };

  const moveQuestion = async (section, index, direction) => {
    const next = [...section.questions];
    const target = index + direction;

    if (target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];

    await perform(
      () =>
        questionnaireService.reorderQuestions(
          section.id,
          next.map((question) => question.id)
        ),
      "Questions reordered."
    );
  };

  const applyQuestionnaire = async () => {
    const sourceDivision = division;

    const success = await perform(
      () => questionnaireService.applyBoth(sourceDivision),
      `Questionnaire copied from ${sourceDivision === "COLLEGE" ? "College" : "Basic Ed"
      } successfully.`
    );

    if (success) setApplyOpen(false);
  };

  return (
    <div className="min-h-full bg-gray-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <Settings2 size={15} />
              <span>Admin</span>
              <ChevronRight size={14} />
              <span className="text-gray-700">Questionnaire</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Questionnaire Management
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage evaluation sections and questions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={questionnaires.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Eye size={17} />
            Preview
          </button>
        </div>

        {/* Division selector */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Select division
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Choose which questionnaire you want to manage.
            </p>
          </div>

          <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1">
            {DIVISIONS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDivision(item.value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${division === item.value
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <p className="whitespace-pre-line">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <Check size={17} />
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Sections</span>
              <Layers3 size={19} className="text-violet-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading ? "—" : totalSections}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total questions</span>
              <BookOpen size={19} className="text-blue-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading ? "—" : totalQuestions}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Active questions</span>
              <ToggleRight size={19} className="text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {loading ? "—" : activeQuestions}
            </p>
          </div>
        </div>

        {/* Questionnaire content */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Evaluation Sections
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {division === "BOTH"
                  ? "Viewing both division questionnaires."
                  : `Managing the ${division === "COLLEGE" ? "College" : "Basic Education"
                  } questionnaire.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadQuestionnaire}
                disabled={loading || saving}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>

              {division !== "BOTH" && (
                <>
                  <button
                    type="button"
                    onClick={() => setApplyOpen(true)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Copy size={15} />
                    Apply to other division
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditor({
                        type: "add-section",
                      })
                    }
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Plus size={17} />
                    Add section
                  </button>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <LoaderCircle className="animate-spin text-violet-600" size={21} />
                Loading questionnaire...
              </div>
            </div>
          ) : questionnaires.length === 0 ? (
            <EmptyState
              title="Unable to load questionnaire"
              description="Check your backend connection and try refreshing the page."
            />
          ) : (
            questionnaires.map((questionnaire) => (
              <div
                key={questionnaire.education_level}
                className="space-y-3"
              >
                {division === "BOTH" && (
                  <div className="flex items-center gap-2 pt-3">
                    <span className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                      {questionnaire.education_level === "COLLEGE"
                        ? "COLLEGE"
                        : "BASIC EDUCATION"}
                    </span>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                )}

                {questionnaire.sections.length === 0 ? (
                  <EmptyState
                    title="No sections yet"
                    description="Add your first evaluation section to get started."
                  />
                ) : (
                  questionnaire.sections.map((section, index) => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      division={division}
                      sectionIndex={index}
                      sectionCount={questionnaire.sections.length}
                      saving={saving}
                      onEditSection={openSectionEditor}
                      onAddQuestion={(item) =>
                        openQuestionEditor(item)
                      }
                      onEditQuestion={openQuestionEditor}
                      onToggleQuestion={toggleQuestion}
                      onMoveSection={(currentIndex, direction) =>
                        moveSection(
                          questionnaire,
                          currentIndex,
                          direction
                        )
                      }
                      onReorderQuestions={reorderQuestions}
                    />
                  ))
                )}
              </div>
            ))
          )}
        </div>

        {/* Editor modal */}
        {editor && (
          <Modal
            title={
              editor.type === "add-section"
                ? "Add evaluation section"
                : editor.type === "section"
                  ? "Edit section"
                  : editor.type === "add-question"
                    ? "Add question"
                    : "Edit question"
            }
            onClose={() => setEditor(null)}
          >
            {editor.type === "add-section" ? (
              <form onSubmit={addSection} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Section prefix
                  </label>
                  <input
                    name="prefix"
                    required
                    maxLength={1}
                    placeholder="A"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Use one letter, such as A, B, or C.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Section title
                  </label>
                  <input
                    name="title"
                    required
                    maxLength={255}
                    placeholder="Teaching Effectiveness"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditor(null)}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {saving && <LoaderCircle size={15} className="animate-spin" />}
                    <Plus size={16} />
                    Create section
                  </button>
                </div>
              </form>
            ) : editor.type === "section" ? (
              <SectionTitleEditor
                section={editor.section}
                saving={saving}
                onCancel={() => setEditor(null)}
                onSave={saveSection}
              />
            ) : (
              <QuestionEditor
                title="Question text"
                initialText={editor.question?.text || ""}
                saving={saving}
                onCancel={() => setEditor(null)}
                onSave={saveQuestion}
              />
            )}
          </Modal>
        )}

        {/* Preview */}
        {previewOpen && (
          <QuestionnairePreview
            questionnaires={questionnaires}
            onClose={() => setPreviewOpen(false)}
          />
        )}

        {/* Apply to other division confirmation */}
        {applyOpen && (
          <Modal
            title="Apply questionnaire to other division?"
            onClose={() => setApplyOpen(false)}
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <CircleAlert
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">
                      This will replace the destination questionnaire.
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-800">
                      The sections and questions in the other division will
                      be replaced with a copy of the selected division.
                      This action is blocked by the backend if the
                      destination already has historical evaluations.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Copy{" "}
                <strong>
                  {division === "COLLEGE" ? "College" : "Basic Education"}
                </strong>{" "}
                to{" "}
                <strong>
                  {division === "COLLEGE" ? "Basic Education" : "College"}
                </strong>
                ?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApplyOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={applyQuestionnaire}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {saving && <LoaderCircle size={15} className="animate-spin" />}
                  <Copy size={16} />
                  Apply questionnaire
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}

function SectionTitleEditor({ section, saving, onCancel, onSave }) {
  const [title, setTitle] = useState(section.title);

  const submit = (event) => {
    event.preventDefault();
    if (title.trim()) onSave(title.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Section title
        </label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          autoFocus
          required
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
        />
        <p className="mt-1 text-xs text-gray-400">
          Prefix: {section.prefix}
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving && <LoaderCircle size={15} className="animate-spin" />}
          <Save size={16} />
          Save changes
        </button>
      </div>
    </form>
  );
}