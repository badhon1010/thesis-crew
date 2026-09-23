import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Search,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Edit2,
  Calendar,
} from "lucide-react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { db } from "@/firebase/firestore";

interface ResearchTopicDoc {
  id: string;
  title: string;
  category: string;
  description: string;
  requiredSkills?: string[];
  maxTeamSize: number;
  applicationDeadline?: string;
  researchObjectives?: string;
  supervisorId?: string;
  supervisorName?: string;
  status: "draft" | "published";
  isFlagged?: boolean;
  flagReason?: string;
}

export default function AdminTopics() {
  const [topics, setTopics] = useState<ResearchTopicDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Moderation state
  const [targetTopic, setTargetTopic] = useState<ResearchTopicDoc | null>(null);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReasonInput, setFlagReasonInput] = useState("");
  const [editingCategoryTopic, setEditingCategoryTopic] = useState<ResearchTopicDoc | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [updating, setUpdating] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3500);
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "researchTopics"),
      (snapshot) => {
        setTopics(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ResearchTopicDoc, "id">) })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching topics:", error);
        showToast("error", "Failed to load research topics.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Derive topic state (Open, Closing Soon, Closed)
  const getTopicState = (topic: ResearchTopicDoc): "open" | "closing-soon" | "closed" => {
    if (!topic.applicationDeadline) return "open";
    const deadlineDate = new Date(topic.applicationDeadline);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (deadlineDate < now) return "closed";
    
    const diffDays = (deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 7) return "closing-soon";

    return "open";
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.category) set.add(t.category.trim());
    });
    return Array.from(set).sort();
  }, [topics]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.supervisorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());

      const state = getTopicState(t);

      let matchesStatus = true;
      if (statusFilter === "open") matchesStatus = state === "open";
      else if (statusFilter === "closing-soon") matchesStatus = state === "closing-soon";
      else if (statusFilter === "closed") matchesStatus = state === "closed";
      else if (statusFilter === "flagged") matchesStatus = !!t.isFlagged;

      const matchesCategory = categoryFilter === "all" ? true : t.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [topics, searchQuery, statusFilter, categoryFilter]);

  // Flag / Unflag topic handler
  const handleToggleFlag = async () => {
    if (!targetTopic) return;
    setUpdating(true);

    try {
      const willBeFlagged = !targetTopic.isFlagged;
      await updateDoc(doc(db, "researchTopics", targetTopic.id), {
        isFlagged: willBeFlagged,
        flagReason: willBeFlagged ? flagReasonInput.trim() : "",
      });

      showToast("success", willBeFlagged ? `Topic "${targetTopic.title}" was flagged.` : `Flag removed for "${targetTopic.title}".`);
    } catch (error) {
      console.error("Error updating flag status:", error);
      showToast("error", "Failed to update topic flag status.");
    } finally {
      setUpdating(false);
      setTargetTopic(null);
      setFlagModalOpen(false);
      setFlagReasonInput("");
    }
  };

  // Category update handler
  const handleUpdateCategory = async () => {
    if (!editingCategoryTopic || !newCategoryInput.trim()) return;
    setUpdating(true);

    try {
      await updateDoc(doc(db, "researchTopics", editingCategoryTopic.id), {
        category: newCategoryInput.trim(),
      });
      showToast("success", `Category updated to "${newCategoryInput.trim()}".`);
    } catch (error) {
      console.error("Error updating category:", error);
      showToast("error", "Failed to update category.");
    } finally {
      setUpdating(false);
      setEditingCategoryTopic(null);
      setNewCategoryInput("");
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3500}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <BookOpen className="h-3.5 w-3.5 text-amber-500" />
              Academic Oversight
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Research Topics Oversight
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Inspect all published and draft research proposals, flag inappropriate items, and moderate categories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300">
              Total Topics: <strong className="text-slate-900 dark:text-white">{topics.length}</strong>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Search Field */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, supervisor, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300"
            >
              <option value="all">All States</option>
              <option value="open">Open (Deadline active)</option>
              <option value="closing-soon">Closing Soon (&le; 7 days)</option>
              <option value="closed">Closed (Deadline passed)</option>
              <option value="flagged">Flagged for Review</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Topics List */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              No research topics found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {filteredTopics.map((topic) => {
                const state = getTopicState(topic);

                return (
                  <div
                    key={topic.id}
                    className={`p-6 transition-colors hover:bg-slate-50/70 dark:hover:bg-[#222] ${topic.isFlagged ? "bg-amber-50/40 dark:bg-amber-500/5" : ""}`}
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="flex-1 min-w-0">
                        
                        {/* Category & Status Badges */}
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {topic.category}
                          </span>

                          <button
                            onClick={() => {
                              setEditingCategoryTopic(topic);
                              setNewCategoryInput(topic.category);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Edit Category"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>

                          {state === "open" && (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              Open
                            </span>
                          )}
                          {state === "closing-soon" && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                              Closing Soon
                            </span>
                          )}
                          {state === "closed" && (
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                              Closed
                            </span>
                          )}
                          {topic.status === "draft" && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Draft
                            </span>
                          )}

                          {topic.isFlagged && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                              <AlertTriangle className="h-3 w-3" /> Flagged
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {topic.title}
                        </h3>

                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {topic.description}
                        </p>

                        {/* Flag Reason if present */}
                        {topic.isFlagged && topic.flagReason && (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            <strong>Flag Reason:</strong> {topic.flagReason}
                          </div>
                        )}

                        {/* Metadata Row */}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Supervisor: {topic.supervisorName || "Unknown"}
                          </span>
                          <span>•</span>
                          <span>Max Team: {topic.maxTeamSize}</span>
                          {topic.applicationDeadline && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Deadline: {new Date(topic.applicationDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Action Column */}
                      <div className="flex items-center gap-2 shrink-0">
                        {topic.isFlagged ? (
                          <button
                            onClick={() => {
                              setTargetTopic(topic);
                              handleToggleFlag();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Remove Flag
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetTopic(topic);
                              setFlagModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                          >
                            <Flag className="h-4 w-4" /> Flag Topic
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Flag Modal */}
      {flagModalOpen && targetTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Flag Inappropriate Topic</h3>
            <p className="mt-1 text-xs text-slate-500">Provide an optional reason for flagging "{targetTopic.title}".</p>
            <textarea
              value={flagReasonInput}
              onChange={(e) => setFlagReasonInput(e.target.value)}
              placeholder="e.g. Inappropriate content or policy violation..."
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setFlagModalOpen(false);
                  setTargetTopic(null);
                }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleFlag}
                disabled={updating}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {updating ? "Flagging..." : "Confirm Flag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategoryTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-[#2A2A2A] dark:bg-[#181818]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Topic Category</h3>
            <p className="mt-1 text-xs text-slate-500">Change research category for "{editingCategoryTopic.title}".</p>
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder="e.g. Artificial Intelligence"
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none dark:border-[#2A2A2A] dark:bg-[#121212] dark:text-white"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditingCategoryTopic(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#2A2A2A] dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCategory}
                disabled={updating || !newCategoryInput.trim()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
