import React, { useState, useEffect } from "react";
import {
  X,
  GitBranch,
  Repeat,
  CalendarClock,
  ListChecks,
  FlaskConical,
  Loader2,
} from "lucide-react";

export type MilestoneCadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "one-time";
export type MilestonePhase =
  | "proposal"
  | "literature"
  | "methodology"
  | "implementation"
  | "evaluation"
  | "writing"
  | "defense"
  | "other";

export interface Milestone {
  id?: string;
  title: string;
  description: string;
  deadline: string;
  status: "planned" | "in-progress" | "completed";
  cadence?: MilestoneCadence;
  phase?: MilestonePhase;
  deliverables?: string[];
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: Omit<Milestone, "id">) => Promise<void>;
  initialData?: Milestone | null;
  existingMilestones?: Milestone[];
}

export const MILESTONE_CADENCES: { value: MilestoneCadence; label: string; hint: string }[] = [
  { value: "weekly", label: "Weekly", hint: "Recurring check-in" },
  { value: "biweekly", label: "Biweekly", hint: "Every 2 weeks" },
  { value: "monthly", label: "Monthly", hint: "Monthly review" },
  { value: "quarterly", label: "Quarterly", hint: "Major gate" },
  { value: "one-time", label: "One-time", hint: "Single deliverable" },
];

export const MILESTONE_PHASES: { value: MilestonePhase; label: string }[] = [
  { value: "proposal", label: "Proposal" },
  { value: "literature", label: "Literature Review" },
  { value: "methodology", label: "Methodology" },
  { value: "implementation", label: "Implementation" },
  { value: "evaluation", label: "Evaluation" },
  { value: "writing", label: "Writing" },
  { value: "defense", label: "Defense" },
  { value: "other", label: "Other" },
];

const MILESTONE_STATUSES: { value: Milestone["status"]; label: string; dot: string }[] = [
  { value: "planned", label: "Planned", dot: "bg-slate-400" },
  { value: "in-progress", label: "In Progress", dot: "bg-amber-500" },
  { value: "completed", label: "Completed", dot: "bg-emerald-500" },
];

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:placeholder:text-slate-600 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

export function MilestoneModal({ isOpen, onClose, onSave, initialData, existingMilestones }: MilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Milestone["status"]>("planned");
  const [cadence, setCadence] = useState<MilestoneCadence>("one-time");
  const [phase, setPhase] = useState<MilestonePhase>("implementation");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setDeadline(initialData.deadline);
        setStatus(initialData.status);
        setCadence(initialData.cadence || "one-time");
        setPhase(initialData.phase || "implementation");
        setDeliverables(initialData.deliverables || []);
      } else {
        setTitle("");
        setDescription("");
        setDeadline("");
        setStatus("planned");
        setCadence("one-time");
        setPhase("implementation");
        setDeliverables([]);
      }
      setDeliverableInput("");
      setError("");
    }
  }, [isOpen, initialData]);

  const minDeadlineDate = React.useMemo(() => {
    if (initialData) return undefined;
    const safeMilestones = (existingMilestones as Milestone[] | undefined) || [];
    const otherMilestones = safeMilestones.filter(m => m.id !== (initialData as Milestone | null | undefined)?.id);
    if (otherMilestones.length === 0) return undefined;

    const latest = Math.max(...otherMilestones.map(m => new Date(m.deadline).getTime()));
    const nextDay = new Date(latest);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }, [existingMilestones, initialData]);

  if (!isOpen) return null;

  const addDeliverable = () => {
    const v = deliverableInput.trim();
    if (!v) return;
    if (!deliverables.includes(v)) setDeliverables((p) => [...p, v]);
    setDeliverableInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !deadline) {
      setError("Please complete all fields.");
      return;
    }

    // Validate overlapping/sequential deadlines
    const currentDeadline = new Date(deadline);
    currentDeadline.setHours(0, 0, 0, 0);

    const safeMilestones = existingMilestones as Milestone[] || [];
    const otherMilestones = safeMilestones.filter(m => m.id !== initialData?.id);
    if (otherMilestones.length > 0) {
      const latestExistingDeadline = new Date(
        Math.max(...otherMilestones.map(m => new Date(m.deadline).getTime()))
      );
      latestExistingDeadline.setHours(0, 0, 0, 0);

      if (currentDeadline <= latestExistingDeadline) {
        setError(`Deadline must be after the last milestone's deadline (${latestExistingDeadline.toLocaleDateString()}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave({
        title: title.trim(),
        description: description.trim(),
        deadline,
        status,
        cadence,
        phase,
        deliverables,
      });
      onClose();
    } catch (err) {
      console.error("Error saving milestone:", err);
      setError("Failed to save milestone. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {initialData ? "Edit milestone" : "Add milestone"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weekly check-ins, monthly reviews, or one-time gates — map the road to done.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form id="milestone-form" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 3 check-in — dataset cleaned & baselines running"
                className={inputCls}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What should be true when this milestone is done?"
                className={`${inputCls} resize-y leading-relaxed`}
                required
              />
            </div>

            {/* Cadence */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Repeat className="h-3.5 w-3.5 text-slate-400" /> Cadence
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {MILESTONE_CADENCES.map((c) => {
                  const selected = cadence === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCadence(c.value)}
                      title={c.hint}
                      className={`rounded-xl border p-2.5 text-center transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                      }`}
                    >
                      <span className="block text-xs font-bold">{c.label}</span>
                      <span className="block truncate text-[11px] opacity-70">{c.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phase */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <FlaskConical className="h-3.5 w-3.5 text-slate-400" /> Research phase
              </label>
              <div className="flex flex-wrap gap-2">
                {MILESTONE_PHASES.map((p) => {
                  const selected = phase === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPhase(p.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                        selected
                          ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <CalendarClock className="h-3.5 w-3.5 text-slate-400" /> Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={deadline}
                  min={minDeadlineDate}
                  onClick={(e) => {
                    if (typeof e.currentTarget.showPicker === 'function') {
                      e.currentTarget.showPicker();
                    }
                  }}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {MILESTONE_STATUSES.map((s) => {
                    const selected = status === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStatus(s.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                          selected
                            ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-[#333] dark:text-slate-400 dark:hover:bg-[#0F0F0F]"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${s.dot} ${selected ? "bg-white" : ""}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <ListChecks className="h-3.5 w-3.5 text-slate-400" /> Deliverables
              </label>
              <div className="flex gap-2">
                <input
                  value={deliverableInput}
                  onChange={(e) => setDeliverableInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addDeliverable();
                    }
                  }}
                  placeholder="e.g. cleaned dataset + baseline notebook"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={addDeliverable}
                  className="shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Add
                </button>
              </div>
              {deliverables.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {deliverables.map((d) => (
                    <span
                      key={d}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                    >
                      {d}
                      <button
                        type="button"
                        onClick={() => setDeliverables((p) => p.filter((x) => x !== d))}
                        className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-500/30"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-5 dark:border-[#2A2A2A] dark:bg-[#141414]">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="milestone-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                initialData ? "Save Changes" : "Add Milestone"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
