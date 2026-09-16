import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface Milestone {
  id?: string;
  title: string;
  description: string;
  deadline: string;
  status: "planned" | "in-progress" | "completed";
}

interface MilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (milestone: Omit<Milestone, "id">) => Promise<void>;
  initialData?: Milestone | null;
  existingMilestones?: Milestone[];
}

export function MilestoneModal({ isOpen, onClose, onSave, initialData, existingMilestones }: MilestoneModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<"planned" | "in-progress" | "completed">("planned");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setDeadline(initialData.deadline);
        setStatus(initialData.status);
      } else {
        setTitle("");
        setDescription("");
        setDeadline("");
        setStatus("planned");
      }
      setError("");
    }
  }, [isOpen, initialData]);

  // Calculate min deadline for new milestone
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
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {initialData ? "Edit Milestone" : "Add Milestone"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <form id="milestone-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Deadline <span className="text-rose-500">*</span>
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
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              >
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-6 dark:border-[#2A2A2A] dark:bg-[#181818]">
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
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
