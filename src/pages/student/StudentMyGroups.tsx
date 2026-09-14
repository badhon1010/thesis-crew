import { useState, useEffect } from "react";
import { Users, Search } from "lucide-react";
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

        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Your Teams
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">
              My Research Groups
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Manage and collaborate with the research teams you are a member of.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-[#2A2A2A] dark:bg-[#181818]">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {groups.length} {groups.length === 1 ? "Group" : "Groups"}
            </span>
          </div>
        </div>

        {/* Search Control */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search groups by topic title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-white"
            />
          </div>
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
                No full research groups found
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Teams will appear here once they reach their maximum member capacity.
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <GroupCard key={group.projectId} group={group} role="student" />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
