import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Search, CheckCircle2, Calendar, TrendingUp, FileText } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";

import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { getFullCapacityTeams, type Team } from "@/firebase/teamFormation";
import type { ResearchTopic } from "@/firebase/researchTopics";

interface ResearchGroupWithTopic extends Team {
  topic?: ResearchTopic;
}

export default function TeacherResearchGroups() {
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

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              to="/teacher/dashboard"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Research Groups
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Teams that have reached full capacity
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
                No research groups at full capacity yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Teams will appear here when they reach their maximum member count
              </p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.projectId}
                onClick={() => navigate(`/teacher/research-groups/${group.projectId}`)}
                className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-500/30 hover:shadow-lg dark:border-white/5 dark:bg-[#151515] dark:hover:border-indigo-500/30"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      ACTIVE
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {group.memberIds.length}/{group.maxTeamSize} Capacity
                    </span>
                  </div>
                  
                  <h3 className="mb-3 text-xl font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {group.topicTitle}
                  </h3>
                  
                  <div className="mb-6 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      <span>{Math.floor(Math.random() * 30) + 50}% Progress</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-violet-500" />
                      <span>{Math.floor(Math.random() * 15) + 5} Files</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/5">
                  <div className="flex -space-x-2.5">
                    {Array.from({ length: Math.min(group.memberIds.length, 5) }).map((_, i) => (
                      <div
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-medium shadow-sm dark:border-[#151515]"
                        style={{
                          backgroundColor: `hsl(${(i * 360) / 5}, 80%, 90%)`,
                          color: `hsl(${(i * 360) / 5}, 70%, 40%)`,
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                    {group.memberIds.length > 5 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-50 text-xs font-medium text-slate-600 shadow-sm dark:border-[#151515] dark:bg-slate-800 dark:text-slate-400">
                        +{group.memberIds.length - 5}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition-colors group-hover:text-indigo-600 dark:text-slate-500 dark:group-hover:text-indigo-400">
                    <span>Manage</span>
                    <ArrowLeft className="h-4 w-4 rotate-180" />
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
