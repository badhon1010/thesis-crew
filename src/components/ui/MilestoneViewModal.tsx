import { X, Calendar, GitBranch } from "lucide-react";
import type { Milestone } from "./MilestoneModal";

interface MilestoneViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: Milestone | null;
}

export function MilestoneViewModal({ isOpen, onClose, milestone }: MilestoneViewModalProps) {
  if (!isOpen || !milestone) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Milestone Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Title</h3>
            <p className="mt-1 text-lg font-medium text-slate-900 dark:text-white">{milestone.title}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Description</h3>
            <div className="mt-2 rounded-xl bg-slate-50 p-4 dark:bg-[#0F0F0F]">
              <p className="text-sm text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                {milestone.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Deadline</h3>
              <div className="mt-1 flex items-center gap-2 text-slate-900 dark:text-white">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{new Date(milestone.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Status</h3>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                    milestone.status === "completed"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : milestone.status === "in-progress"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  }`}
                >
                  {milestone.status.replace("-", " ")}
                </span>
                
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const deadlineDate = new Date(milestone.deadline);
                  const isOverdue = deadlineDate < today && milestone.status !== "completed";
                  
                  return isOverdue ? (
                    <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                      Overdue
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
