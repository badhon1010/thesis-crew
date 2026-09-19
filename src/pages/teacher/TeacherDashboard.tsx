import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Users, Clock, CheckCircle2, Plus, Eye, ArrowRight, type LucideIcon } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ToastAlert } from "@/components/common/ToastAlert";

import { auth } from "@/firebase/auth";
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { ResearchTopic } from "@/firebase/researchTopics";

const db = getFirestore();

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const [acceptedStudents, setAcceptedStudents] = useState(0);
  const [publishedPapers, setPublishedPapers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Supervisor");
  const [currentTime, setCurrentTime] = useState(new Date());

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
    let unsubscribeTeams: Unsubscribe | undefined;
    let unsubscribePublications: Unsubscribe | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribeRequests?.();
      unsubscribeTeams?.();
      unsubscribePublications?.();
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
          const { getTeacherResearchTopics } = await import("@/firebase/researchTopics");
          const { getFullCapacityTeams } = await import("@/firebase/teamFormation");

          const [data, fullTeams] = await Promise.all([
            getTeacherResearchTopics(user.uid),
            getFullCapacityTeams(user.uid),
          ]);

          // Filter out topics that have reached full capacity
          const fullProjectIds = new Set(fullTeams.map((t) => t.projectId));
          setTopics(data.filter((t) => !fullProjectIds.has(t.id)));
        } catch (error) {
          console.error("Failed to load research topics:", error);
          showToast("error", "Failed to load research topics.");
        } finally {
          setLoading(false);
        }

        // Subscribe to pending requests
        unsubscribeRequests = onSnapshot(
          query(collection(db, "joinRequests"), where("supervisorId", "==", user.uid)),
          (snapshot) => setPendingRequestCount(snapshot.docs.filter((request) => request.data().status === "pending").length),
          (error) => console.error("Failed to subscribe to pending requests:", error),
        );

        // Subscribe to full capacity teams to count unique students in research groups
        unsubscribeTeams = onSnapshot(
          query(collection(db, "teams"), where("supervisorId", "==", user.uid)),
          async (snapshot) => {
            // Get teams at full capacity
            const fullCapacityTeams = snapshot.docs
              .map((doc) => doc.data())
              .filter((team: any) => team.memberIds?.length >= team.maxTeamSize);

            // Get unique student IDs across all full capacity teams
            const uniqueStudents = new Set<string>();
            fullCapacityTeams.forEach((team: any) => {
              if (team.memberIds) {
                team.memberIds.forEach((id: string) => uniqueStudents.add(id));
              }
            });

            setAcceptedStudents(uniqueStudents.size);
          },
          (error) => console.error("Failed to subscribe to teams:", error),
        );

        // Subscribe to publications across all research groups
        unsubscribePublications = onSnapshot(
          query(collection(db, "researchGroups")),
          async (snapshot) => {
            let totalPublished = 0;

            // For each research group, check if it belongs to this supervisor
            for (const groupDoc of snapshot.docs) {
              const groupId = groupDoc.id;

              // Check if this group belongs to this supervisor
              const topicDoc = await getDoc(doc(db, "researchTopics", groupId));
              if (topicDoc.exists() && topicDoc.data().supervisorId === user.uid) {
                // Count published publications in this group
                const pubsSnapshot = await getDocs(collection(db, "researchGroups", groupId, "publications"));
                const published = pubsSnapshot.docs.filter(
                  (pubDoc) => pubDoc.data().status === "published"
                ).length;
                totalPublished += published;
              }
            }

            setPublishedPapers(totalPublished);
          },
          (error) => console.error("Failed to subscribe to publications:", error),
        );
      } else {
        setPendingRequestCount(0);
        setAcceptedStudents(0);
        setPublishedPapers(0);
        setLoading(false);
      }
    });

    return () => { unsubscribe(); unsubscribeRequests?.(); unsubscribeTeams?.(); unsubscribePublications?.(); };
  }, []);

  // Helper to check if deadline has passed
  const isTopicClosed = (deadline?: string) => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  // Limit topics shown on the dashboard to 4 items with upcoming deadlines
  const sortedTopics = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Separate open and closed topics
    const openTopics = topics.filter(t => {
      if (!t.applicationDeadline) return true; // No deadline = always open
      const deadline = new Date(t.applicationDeadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= now;
    });

    const closedTopics = topics.filter(t => {
      if (!t.applicationDeadline) return false;
      const deadline = new Date(t.applicationDeadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < now;
    });

    // Sort open topics: upcoming deadlines first (earliest first)
    openTopics.sort((a, b) => {
      if (!a.applicationDeadline) return 1;
      if (!b.applicationDeadline) return -1;
      return new Date(a.applicationDeadline).getTime() - new Date(b.applicationDeadline).getTime();
    });

    // Sort closed topics: most recent deadline first (long gone last)
    closedTopics.sort((a, b) => {
      if (!a.applicationDeadline) return 1;
      if (!b.applicationDeadline) return -1;
      return new Date(b.applicationDeadline).getTime() - new Date(a.applicationDeadline).getTime();
    });

    // Combine: open topics first, then closed topics
    return [...openTopics, ...closedTopics].slice(0, 4);
  }, [topics]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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

        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-indigo-200 bg-indigo-50 px-4 py-1.5 dark:border-indigo-500/30 dark:bg-indigo-500/10">
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">SUPERVISOR WORKSPACE</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border-2 border-slate-200 bg-slate-50 px-4 py-1.5 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
              <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formattedDate}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-bold tabular-nums text-slate-900 dark:text-white">{formattedTime}</span>
            </div>
          </div>

          <h1 className="mb-2 text-4xl font-extrabold text-slate-900 dark:text-white">
            {greeting()}, {userName}
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400">
            Manage research topics, review applications, and track team progress
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={BookOpen}
            value={String(topics.length).padStart(2, "0")}
            label="Research Topics"
            color="indigo"
            linkTo="/teacher/topics"
          />
          <StatCard
            icon={Users}
            value={String(acceptedStudents).padStart(2, "0")}
            label="Active Students"
            color="emerald"
            linkTo="/teacher/research-groups"
          />
          <StatCard
            icon={Clock}
            value={String(pendingRequestCount).padStart(2, "0")}
            label="Pending Requests"
            color="amber"
            linkTo="/teacher/requests"
            isHighlight={pendingRequestCount > 0}
          />
          <StatCard
            icon={CheckCircle2}
            value={String(publishedPapers).padStart(2, "0")}
            label="Published Papers"
            color="violet"
            linkTo="/teacher/research-groups"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">

          {/* Research Topics List */}
          <section className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b-2 border-slate-100 bg-slate-50 px-6 py-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Research Topics</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Showing your latest topics</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/teacher/topics/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  <Plus className="h-4 w-4" />
                  Create New
                </Link>
              </div>
            </div>

            <div className="divide-y-2 divide-slate-100 dark:divide-[#2A2A2A]">
              {loading ? (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading topics...</p>
                </div>
              ) : sortedTopics.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">No topics yet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Create your first research topic to get started</p>
                  <Link
                    to="/teacher/topics/create"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create Topic
                  </Link>
                </div>
              ) : (
                sortedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="group p-5 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                            {topic.category}
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-500/20 dark:text-slate-300">
                            {topic.maxTeamSize} max
                          </span>
                          {isTopicClosed(topic.applicationDeadline) ? (
                            <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                              Closed
                            </span>
                          ) : (
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              Open
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{topic.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                          {topic.description}
                        </p>
                        {topic.applicationDeadline && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Deadline: {new Date(topic.applicationDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Link
                        to={`/teacher/topics/details/${topic.id}`}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-slate-600 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            {topics.length > 4 && (
              <div className="border-t-2 border-slate-100 bg-slate-50 px-6 py-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                <button
                  onClick={() => navigate("/teacher/topics")}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 dark:border-[#2A2A2A] dark:bg-[#181818] dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400"
                >
                  View All Topics
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <section className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <div className="border-b-2 border-slate-100 bg-slate-50 px-5 py-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</h2>
              </div>
              <div className="p-4 space-y-3">
                <Link
                  to="/teacher/topics"
                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                    <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Manage Topics</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">View all research topics</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </Link>

                <Link
                  to="/teacher/requests"
                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-amber-500 hover:bg-amber-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:hover:border-amber-500 dark:hover:bg-amber-500/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Review Requests</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{pendingRequestCount} pending</p>
                  </div>
                  {pendingRequestCount > 0 && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                      {pendingRequestCount}
                    </span>
                  )}
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </Link>

                <Link
                  to="/teacher/research-groups"
                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-[#2A2A2A] dark:bg-[#0F0F0F] dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Research Groups</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage active teams</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400" />
                </Link>
              </div>
            </section>

            {/* Overview Stats */}
            <section className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <div className="border-b-2 border-slate-100 bg-slate-50 px-5 py-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Overview</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Topics</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{topics.length}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-[#2A2A2A]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Students</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{acceptedStudents}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-[#2A2A2A]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pending Reviews</span>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingRequestCount}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-[#2A2A2A]"></div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Published</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {topics.filter(t => t.status === "published").length}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  linkTo,
  isHighlight = false
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
  linkTo?: string;
  isHighlight?: boolean;
}) {
  const colorClasses = {
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
  }[color];

  const content = (
    <>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 ${colorClasses}`}>
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {isHighlight && (
        <div className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
        </div>
      )}
    </>
  );

  const baseClasses = "relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:border-[#2A2A2A] dark:bg-[#181818]";

  if (linkTo) {
    return (
      <Link to={linkTo} className={`${baseClasses} hover:-translate-y-1`}>
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClasses}>
      {content}
    </div>
  );
}
