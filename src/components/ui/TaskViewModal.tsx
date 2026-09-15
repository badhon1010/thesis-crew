import { X, Calendar, Flag, User, GitBranch } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedTo?: string[];
  milestoneId?: string;
}

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  milestoneName?: string;
}

export function TaskViewModal({ isOpen, onClose, task, milestoneName }: TaskViewModalProps) {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{task.title}</h3>
            
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                task.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : task.status === "in-progress" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
              }`}>
                {task.status.replace("-", " ")}
              </span>
              
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize flex items-center gap-1 ${
                task.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                : task.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400"
              }`}>
                <Flag className="h-3 w-3" />
                {task.priority}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-[#2A2A2A]">
            {task.dueDate && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due Date
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {milestoneName && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <GitBranch className="h-3 w-3" /> Milestone
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {milestoneName}
                </span>
              </div>
            )}
            
            {task.assignedTo && task.assignedTo.length > 0 && (
              <div className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <User className="h-3 w-3" /> Assignees
                </span>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {task.assignedTo.length} members assigned
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-[#2A2A2A]">
            <span className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Description</span>
            {task.description ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
