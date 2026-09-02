import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Users, Clock3, CheckCircle2, Plus, Edit, Trash2, ArrowRight, Eye, type LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";

import { auth } from "@/firebase/auth";
import { collection, doc, getDoc, getFirestore, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getTeacherResearchTopics, deleteResearchTopic, type ResearchTopic } from "@/firebase/researchTopics";

const db = getFirestore();

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState("Supervisor");

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
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let unsubscribeRequests: Unsubscribe | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribeRequests?.();
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().name) {
          const fullName = userDoc.data().name;
          setUserName(fullName.split(" ")[0]);
        } else {
          const fallbackName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Teacher";
          setUserName(fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
        }

        try {
          const data = await getTeacherResearchTopics(user.uid);
          setTopics(data);
        } catch (error) {
          console.error("Failed to load research topics:", error);
          showToast("error", "Failed to load research topics.");
        } finally {
          setLoading(false);
        }

        unsubscribeRequests = onSnapshot(
          query(collection(db, "joinRequests"), where("supervisorId", "==", user.uid)),
          (snapshot) => setPendingRequestCount(snapshot.docs.filter((request) => request.data().status === "pending").length),
          (error) => console.error("Failed to subscribe to pending requests:", error),
        );
      } else {
        setPendingRequestCount(0);
        setLoading(false);
      }
    });

    return () => { unsubscribe(); unsubscribeRequests?.(); };
  }, []);

  // Limit topics shown on the dashboard to a maximum of 3 items
  const sortedTopics = useMemo(() => {
    return [...topics]
      .sort((a, b) => {
        if (!a.applicationDeadline) return 1;
        if (!b.applicationDeadline) return -1;
        return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
      })
      .slice(0, 3);
  }, [topics]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      try {
        await deleteResearchTopic(id);
        setTopics((prev) => prev.filter((topic) => topic.id !== id));
        showToast("success", "Research topic deleted successfully!");
      } catch (error) {
        console.error("Failed to delete topic:", error);
        showToast("error", "Failed to delete research topic. Please try again.");
      }
    }
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

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

        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                Supervisor Workspace
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="tabular-nums">{formattedTime}</span>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome back, {userName}.
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Manage your published research directions and evaluate student applications seamlessly.
            </p>
          </div>

          <Link
            to="/teacher/topics/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-95 dark:border dark:border-indigo-500/50 dark:shadow-[0_0_20px_rgba(79,70,229,0.3)]"
          >
            <Plus className="h-4 w-4" />
            Create research topic
          </Link>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} value={String(topics.length).padStart(2, "0")} label="Active Topics" trend="+2 this month" />
          <StatCard icon={Users} value="24" label="Enrolled Students" trend="Active teams" />
          <StatCard icon={Clock3} value={String(pendingRequestCount).padStart(2, "0")} label="Pending Requests" trend="Live from Firestore" />
          <StatCard icon={CheckCircle2} value="03" label="Completed Projects" trend="Successfully closed" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
          
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">My research topics</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Showing top 3 upcoming deadline topics.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {topics.length} Total
                </span>
                <button
                  onClick={() => navigate("/teacher/topics")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading topics...</div>
              ) : sortedTopics.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No research topics found.</div>
              ) : (
                sortedTopics.map((topic) => (
                  <div key={topic.id} className="group p-6 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{topic.title}</h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{topic.category}</span>
                          <span>•</span>
                          <span>Max Team Size: {topic.maxTeamSize}</span>
                          {topic.applicationDeadline && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                <Clock3 className="h-3 w-3" />
                                Deadline: {new Date(topic.applicationDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons: View Details, Edit, Delete */}
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <Link
                          to={`/teacher/topics/details/${topic.id}`}
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/teacher/topics/edit/${topic.id}`}
                          className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                          title="Edit Topic"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(topic.id)}
                          className="rounded-lg bg-red-50 p-1.5 text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                          title="Delete Topic"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {topic.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Pending Requests */}
          <section className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Pending requests</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Students waiting for supervisor review.</p>
              </div>
              <button
                onClick={() => navigate("/teacher/requests")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-sm font-medium text-slate-900 dark:text-white">{pendingRequestCount ? `${pendingRequestCount} student request${pendingRequestCount === 1 ? "" : "s"} waiting for review.` : "No student requests are waiting for review."}</p>
              <Link to="/teacher/requests" className="mt-3 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">Open Team Requests →</Link>
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, value, label, trend }: { icon: LucideIcon; value: string; label: string; trend: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 dark:border-[#2A2A2A] dark:bg-[#181818]">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{trend}</span>
      </div>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
