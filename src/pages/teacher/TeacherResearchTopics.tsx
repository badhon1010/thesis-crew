import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Clock3, ArrowLeft, Search, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { ConfirmModal } from "@/components/common/ConfirmModal";

import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { getTeacherResearchTopics, deleteResearchTopic, type ResearchTopic } from "@/firebase/researchTopics";
import { getFullCapacityTeams } from "@/firebase/teamFormation";

export default function TeacherResearchTopics() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{
    show: boolean;
    type: "success" | "error";
    message: string;
  }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const [data, fullTeams] = await Promise.all([
            getTeacherResearchTopics(user.uid),
            getFullCapacityTeams(user.uid),
          ]);
          const fullProjectIds = new Set(fullTeams.map((t) => t.projectId));
          setTopics(data.filter((t) => !fullProjectIds.has(t.id)));
        } catch (error) {
          console.error("Failed to load research topics:", error);
          showToast("error", "Failed to load research topics.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const triggerDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteTopicId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTopicId) return;
    setIsDeleting(true);
    try {
      await deleteResearchTopic(deleteTopicId);
      setTopics((prev) => prev.filter((topic) => topic.id !== deleteTopicId));
      showToast("success", "Research topic deleted successfully!");
    } catch (error) {
      console.error("Failed to delete topic:", error);
      showToast("error", "Failed to delete research topic.");
    } finally {
      setIsDeleting(false);
      setDeleteTopicId(null);
    }
  };

  // Helper to check if deadline has passed
  const isTopicClosed = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const filteredTopics = topics
    .filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      const closed = isTopicClosed(t.applicationDeadline);

      let matchesStatus = true;
      if (statusFilter === "open") {
        matchesStatus = !closed;
      } else if (statusFilter === "closed") {
        matchesStatus = closed;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const aDeadline = a.applicationDeadline ? new Date(a.applicationDeadline) : null;
      const bDeadline = b.applicationDeadline ? new Date(b.applicationDeadline) : null;

      const aIsClosed = aDeadline ? aDeadline < now : false;
      const bIsClosed = bDeadline ? bDeadline < now : false;

      // No deadline topics go to the end
      if (!aDeadline && !bDeadline) return 0;
      if (!aDeadline) return 1;
      if (!bDeadline) return -1;

      // Open topics before closed topics
      if (!aIsClosed && bIsClosed) return -1;
      if (aIsClosed && !bIsClosed) return 1;

      // Within open topics: sort by nearest deadline first (ascending)
      if (!aIsClosed && !bIsClosed) {
        return aDeadline.getTime() - bDeadline.getTime();
      }

      // Within closed topics: sort by most recent deadline first (descending)
      if (aIsClosed && bIsClosed) {
        return bDeadline.getTime() - aDeadline.getTime();
      }

      return 0;
    });

  return (
    <DashboardLayout role="teacher">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              to="/teacher/dashboard"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              All Research Topics
            </h1>
          </div>

          <Link
            to="/teacher/topics/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-500 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create New Topic
          </Link>
        </div>

        {/* Search & Filter Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search topics by title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
          </div>

          <div className="relative flex items-center gap-2">
            <Filter className="hidden h-4 w-4 text-slate-400 sm:block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 sm:w-auto"
            >
              <option value="all">All States</option>
              <option value="open">Open (Deadline active)</option>
              <option value="closed">Closed (Deadline passed)</option>
            </select>
          </div>
        </div>

        {/* Topics List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">Loading topics...</div>
            ) : filteredTopics.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500">No research topics found.</div>
            ) : (
              filteredTopics.map((topic) => {
                const closed = isTopicClosed(topic.applicationDeadline);

                return (
                  <div
                    key={topic.id}
                    onClick={() => navigate(`/teacher/topics/details/${topic.id}`)}
                    className="group cursor-pointer p-6 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                            {topic.title}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                              closed
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            }`}
                          >
                            {closed ? "Closed" : "Open"}
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{topic.category}</span>
                          <span>•</span>
                          <span>Max Team Size: {topic.maxTeamSize}</span>
                          {topic.applicationDeadline && (
                            <>
                              <span>•</span>
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  closed
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                <Clock3 className="h-3 w-3" />
                                Deadline: {new Date(topic.applicationDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/teacher/topics/edit/${topic.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                          title="Edit Topic"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => triggerDelete(e, topic.id)}
                          className="rounded-lg bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          title="Delete Topic"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
                      {topic.description}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteTopicId}
        onClose={() => setDeleteTopicId(null)}
        onConfirm={confirmDelete}
        title="Delete Topic"
        description="Are you sure you want to delete this research topic? This action cannot be undone."
        confirmText="Yes, delete it"
        isLoading={isDeleting}
      />
    </DashboardLayout>
  );
}