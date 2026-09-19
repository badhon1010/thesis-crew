import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowLeft, Search, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { GroupCard } from "@/components/common/GroupCard";

import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { getFullCapacityTeams, type Team } from "@/firebase/teamFormation";
import type { ResearchTopic } from "@/firebase/researchTopics";

interface ResearchGroupWithTopic extends Team {
  topic?: ResearchTopic;
}

export default function TeacherResearchGroups() {
  const [groups, setGroups] = useState<ResearchGroupWithTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
          const fullTeams = await getFullCapacityTeams(user.uid);
          setGroups(fullTeams);
        } catch (error) {
          console.error("Failed to load research groups:", error);
          showToast("error", "Failed to load research groups.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredGroups = groups.filter((group) =>
    group.topicTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="teacher">
      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        <div className="relative mb-8 rounded-2xl bg-indigo-50/50 p-6 shadow-sm border border-indigo-100 dark:bg-[#181818] dark:border-[#2A2A2A] dark:shadow-sm">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <Link
                to="/teacher/dashboard"
                className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Research Groups
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
                Teams that have reached full capacity and are ready to begin research.
              </p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-slate-200 dark:bg-[#181818] dark:border-[#2A2A2A]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Groups</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {groups.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Control */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups by topic title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-14 pr-14 text-base text-slate-900 shadow-sm transition-all hover:shadow-md focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#2A2A2A] dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-in fade-in">
              Found {filteredGroups.length} result{filteredGroups.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Groups Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-[#2A2A2A] dark:bg-[#181818]">
              Loading research groups...
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-[#2A2A2A] dark:bg-[#181818]">
              <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-4 text-sm font-medium text-slate-900 dark:text-white">
                No research groups at full capacity yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Teams will appear here when they reach their maximum member count
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard key={group.projectId} group={group} role="teacher" />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
