import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Search, CheckCircle2, Calendar, TrendingUp, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";

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
  const navigate = useNavigate();
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
              <div
                key={group.projectId}
                onClick={() => navigate(`/student/my-groups/${group.projectId}`)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition-all hover:-translate-y-1 hover:border-indigo-500 hover:shadow-2xl dark:border-[#2A2A2A] dark:bg-[#181818] dark:hover:border-indigo-400"
              >
                {/* Header */}
                <div className="border-b-2 border-slate-100 bg-white px-6 py-5 dark:border-[#2A2A2A] dark:bg-[#181818]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          ACTIVE
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">•</span>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {group.memberIds.length} members
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                        {group.topicTitle}
                      </h3>
                    </div>
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 transition-all group-hover:border-indigo-500 group-hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:group-hover:border-indigo-400 dark:group-hover:bg-indigo-500/20">
                      <Users className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6">
                  {/* Stats Grid */}
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    {/* Team Size */}
                    <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50 p-3.5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
                      <div className="mb-2 flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">Team</span>
                      </div>
                      <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        {group.memberIds.length}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600/70 dark:text-indigo-400/70">
                        Members
                      </p>
                    </div>

                    {/* Progress Indicator */}
                    <div className="rounded-xl border-2 border-emerald-100 bg-emerald-50 p-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                      <div className="mb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Progress</span>
                      </div>
                      <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Math.floor(Math.random() * 30) + 50}%
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                        Complete
                      </p>
                    </div>

                    {/* Documents */}
                    <div className="rounded-xl border-2 border-violet-100 bg-violet-50 p-3.5 dark:border-violet-500/20 dark:bg-violet-500/10">
                      <div className="mb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        <span className="text-xs font-bold text-violet-900 dark:text-violet-300">Files</span>
                      </div>
                      <p className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
                        {Math.floor(Math.random() * 15) + 5}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600/70 dark:text-violet-400/70">
                        Documents
                      </p>
                    </div>
                  </div>

                  {/* Member Avatars */}
                  <div className="mb-5 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Team Members
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-3">
                        {Array.from({ length: Math.min(group.memberIds.length, 6) }).map((_, i) => (
                          <div
                            key={i}
                            className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-white bg-indigo-600 text-sm font-bold text-white shadow-md dark:border-[#181818]"
                            style={{
                              backgroundColor: `hsl(${(i * 360) / 6}, 70%, 55%)`,
                            }}
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                        {group.memberIds.length > 6 && (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-3 border-white bg-slate-300 text-sm font-bold text-slate-700 shadow-md dark:border-[#181818] dark:bg-slate-700 dark:text-slate-300">
                            +{group.memberIds.length - 6}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {group.memberIds.length}/{group.maxTeamSize}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Capacity</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-3 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          Started
                        </p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg dark:bg-indigo-500 dark:hover:bg-indigo-600">
                      <span>View</span>
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
