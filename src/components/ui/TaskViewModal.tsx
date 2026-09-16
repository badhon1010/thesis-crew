import { X, Calendar, Flag, User, GitBranch, History, UserPlus, MoveRight } from "lucide-react";

export interface TaskStatusEvent {
  from: string;
  to: string;
  byUid: string;
  byName: string;
  at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedTo?: string[];
  milestoneId?: string;
  createdByName?: string;
  lastMovedByName?: string;
  lastMovedAt?: string;
  statusHistory?: TaskStatusEvent[];
}

interface TaskViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  milestoneName?: string;
  assigneeNames?: string[];
}

function formatWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function TaskViewModal({ isOpen, onClose, task, milestoneName, assigneeNames }: TaskViewModalProps) {
  if (!isOpen || !task) return null;

  const history = [...(task.statusHistory || [])].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm dark:bg-[#0A0A0A]/80">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:border dark:border-[#2A2A2A] dark:bg-[#181818]">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
              <Flag className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Task Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
          <div>
            <h3 className="mb-2 text-xl font-extrabold leading-snug text-slate-900 dark:text-white">{task.title}</h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                task.status === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                : task.status === "in-progress" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
              }`}>
                {task.status.replace("-", " ")}
              </span>

              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                task.priority === "high" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                : task.priority === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400"
              }`}>
                <Flag className="h-3 w-3" />
                {task.priority}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-[#2A2A2A] md:grid-cols-2">
            {task.dueDate && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                  <Calendar className="h-3 w-3" /> Due Date
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {milestoneName && (
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                  <GitBranch className="h-3 w-3" /> Milestone
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {milestoneName}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                <UserPlus className="h-3 w-3" /> Created by
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {task.createdByName || "Unknown"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                <MoveRight className="h-3 w-3" /> Last moved by
              </span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {task.lastMovedByName ? `${task.lastMovedByName}${task.lastMovedAt ? ` · ${formatWhen(task.lastMovedAt)}` : ""}` : "—"}
              </span>
            </div>

            {(assigneeNames?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                  <User className="h-3 w-3" /> Assignees ({assigneeNames!.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {assigneeNames!.map((name) => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-1 pr-2.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
            <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Description</span>
            {task.description ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
                {task.description}
              </p>
            ) : (
              <p className="text-sm italic text-slate-400">No description provided.</p>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 dark:border-[#2A2A2A]">
            <span className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
              <History className="h-3.5 w-3.5" /> Activity — who moved this task
            </span>
            {history.length === 0 ? (
              <p className="text-sm italic text-slate-400">No movement recorded yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-slate-100 pl-5 dark:border-[#2A2A2A]">
                {history.map((ev, i) => (
                  <li key={`${ev.at}-${i}`} className="relative">
                    <span className={`absolute -left-[27px] top-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#181818] ${
                      ev.to === "completed" ? "bg-emerald-500" : ev.to === "in-progress" ? "bg-amber-500" : "bg-sky-500"
                    }`} />
                    <p className="text-[13px] text-slate-700 dark:text-slate-300">
                      {ev.from === "created" ? (
                        <>Created in <b className="capitalize">{ev.to.replace("-", " ")}</b> by <b>{ev.byName}</b></>
                      ) : (
                        <>Moved <b className="capitalize">{ev.from.replace("-", " ")}</b> → <b className="capitalize">{ev.to.replace("-", " ")}</b> by <b>{ev.byName}</b></>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{formatWhen(ev.at)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
