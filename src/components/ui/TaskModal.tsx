import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

interface TeamMember {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  department?: string;
}

interface Task {
  id?: string;
  title: string;
  description: string;
  assignedTo: string[];
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, "id">) => Promise<void>;
  editingTask?: Task | null;
  teamMembers: TeamMember[];
}

export function TaskModal({ isOpen, onClose, onSave, editingTask, teamMembers }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [status, setStatus] = useState<"todo" | "in-progress" | "completed">("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setAssignedTo(editingTask.assignedTo || []);
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate || "");
    } else {
      setTitle("");
      setDescription("");
      setAssignedTo([]);
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
    }
    setError("");
  }, [editingTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!dueDate) {
      setError("Due Date is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      await onSave({
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        status,
        priority,
        dueDate,
      });
      onClose();
    } catch (err) {
      console.error("Error saving task:", err);
      setError("Failed to save task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignee = (studentId: string) => {
    setAssignedTo((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {editingTask ? "Edit Task" : "Create Task"}
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

          <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="E.g., Complete literature review"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide details about the task..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onClick={(e) => {
                    if (typeof e.currentTarget.showPicker === 'function') {
                      e.currentTarget.showPicker();
                    }
                  }}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "todo" | "in-progress" | "completed")}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 dark:border-[#333] dark:bg-[#0F0F0F] dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Assign to (Optional)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-2 dark:border-[#333] dark:bg-[#0F0F0F]">
                {teamMembers.length === 0 ? (
                  <p className="p-2 text-center text-sm text-slate-500">No team members available</p>
                ) : (
                  teamMembers.map((member) => (
                    <button
                      key={member.studentId}
                      type="button"
                      onClick={() => toggleAssignee(member.studentId)}
                      className={`flex w-full items-center justify-between rounded-lg p-2 text-left transition-colors ${
                        assignedTo.includes(member.studentId)
                          ? "bg-indigo-50 dark:bg-indigo-500/20"
                          : "hover:bg-slate-50 dark:hover:bg-[#181818]"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-medium ${
                          assignedTo.includes(member.studentId)
                            ? "text-indigo-700 dark:text-indigo-300"
                            : "text-slate-900 dark:text-white"
                        }`}>
                          {member.studentName}
                        </p>
                        {member.department && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{member.department}</p>
                        )}
                      </div>
                      {assignedTo.includes(member.studentId) && (
                        <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
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
              form="task-form"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Save Task"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
