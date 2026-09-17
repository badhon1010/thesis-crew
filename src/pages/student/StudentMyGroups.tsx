import { useState, useEffect } from "react";
import { Users, Search, Sparkles, X } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";
import { GroupCard } from "@/components/common/GroupCard";

import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebase/firestore";
import type { Team } from "@/firebase/teamFormation";
import type { ResearchTopic } from "@/firebase/researchTopics";

interface ResearchGroupWithTopic extends Team {
  topic?: ResearchTopic;
}

export default function StudentMyGroups() {
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
          const teamsQuery = query(
            collection(db, "teams"),
            where("memberIds", "array-contains", user.uid)
          );
          const snapshot = await getDocs(teamsQuery);
          
          const myTeams = snapshot.docs
            .map((doc) => doc.data() as Team)
            .filter((team) => team.memberIds.length >= team.maxTeamSize);
          setGroups(myTeams);
        } catch (error) {
          console.error("Failed to load research groups:", error);
          showToast("error", "Failed to load your research groups.");
        } finally {
          setLoading(false);
        }
      } else {
        setGroups([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredGroups = groups.filter((group) =>
    group.topicTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout role="student">
      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        <ToastAlert
          show={toast.show}
          type={toast.type}
          message={toast.message}
          duration={3000}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />

        {/* Hero Header */}
        <div className="relative mb-8 rounded-2xl bg-indigo-50/50 p-6 shadow-sm border border-indigo-100 dark:bg-[#181818] dark:border-[#2A2A2A] dark:shadow-sm">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Your Teams</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                My Research Groups
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500 dark:text-slate-400">
                Manage and collaborate with the research teams you are a member of.
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
            <>
              {[1, 2].map((i) => (
                <div key={i} className="col-span-1 h-[280px] animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-[#2A2A2A] dark:bg-[#181818] shadow-sm">
                  <div className="p-6">
                    <div className="mb-4 h-6 w-3/4 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
                    <div className="space-y-3">
                      <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/50"></div>
                      <div className="h-4 w-5/6 rounded bg-slate-100 dark:bg-slate-800/50"></div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 p-6 dark:border-slate-800/50">
                    <div className="h-10 w-full rounded-xl bg-slate-100 dark:bg-slate-800/50"></div>
                  </div>
                </div>
              ))}
            </>
          ) : filteredGroups.length === 0 ? (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-16 text-center dark:border-[#2A2A2A] dark:bg-[#181818]/50 animate-in fade-in zoom-in-95">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-inner dark:bg-indigo-500/20 dark:text-indigo-400">
                {searchQuery ? <Search className="h-8 w-8" /> : <Users className="h-8 w-8" />}
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {searchQuery ? "No matching groups found" : "No active groups yet"}
              </p>
              <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {searchQuery 
                  ? `We couldn't find any groups matching "${searchQuery}". Try adjusting your search.`
                  : "Teams will appear here once they reach their maximum member capacity and are ready to start."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-[#2A2A2A] dark:text-white dark:ring-[#3A3A3A] dark:hover:bg-[#333333] transition-all hover:scale-105"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map((group, index) => (
              <div 
                key={group.projectId} 
                className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                style={{ animationDelay: `${index * 100}ms`, animationDuration: '500ms' }}
              >
                <GroupCard group={group} role="student" />
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
