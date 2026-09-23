import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  FolderKanban,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/firestore";

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  role?: "student" | "teacher" | "admin";
  department?: string;
  studentId?: string;
  designation?: string;
  accountStatus?: "active" | "suspended";
  createdAt?: string;
}

interface TopicDoc {
  id: string;
  title: string;
  category: string;
  status: string;
  applicationDeadline?: string;
  supervisorName?: string;
}

interface TeamDoc {
  projectId: string;
  topicTitle: string;
  supervisorId: string;
  memberIds: string[];
  maxTeamSize: number;
}

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [teams, setTeams] = useState<TeamDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<UserDoc, "id">) })));
      },
      (err) => console.error("Error fetching users:", err)
    );

    const unsubscribeTopics = onSnapshot(
      collection(db, "researchTopics"),
      (snapshot) => {
        setTopics(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<TopicDoc, "id">) })));
      },
      (err) => console.error("Error fetching topics:", err)
    );

    const unsubscribeTeams = onSnapshot(
      collection(db, "teams"),
      (snapshot) => {
        setTeams(snapshot.docs.map((doc) => doc.data() as TeamDoc));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching teams:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeTopics();
      unsubscribeTeams();
    };
  }, []);

  // Metric Calculations based strictly on Firestore data
  const totalStudents = useMemo(() => users.filter((u) => u.role === "student").length, [users]);
  const totalTeachers = useMemo(() => users.filter((u) => u.role === "teacher").length, [users]);
  
  // Active Projects: Teams formed in Firestore `teams` collection that are currently active
  const activeProjects = useMemo(() => teams.length, [teams]);
  
  // Completed Projects: Topics whose application deadline has passed
  const completedProjects = useMemo(() => {
    const now = new Date();
    return topics.filter((t) => {
      if (!t.applicationDeadline) return false;
      return new Date(t.applicationDeadline) < now;
    }).length;
  }, [topics]);

  const recentUsers = useMemo(() => {
    return [...users]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [users]);

  const openTopicsCount = useMemo(() => {
    const now = new Date();
    return topics.filter((t) => {
      if (t.status !== "published") return false;
      if (!t.applicationDeadline) return true;
      return new Date(t.applicationDeadline) >= now;
    }).length;
  }, [topics]);

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <DashboardLayout role="admin">
      <div className="mx-auto max-w-6xl px-2 sm:px-4">
        
        {/* Header Banner */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                University Coordinator
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-500/20 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{formattedDate}</span>
                <span className="text-slate-400">•</span>
                <span className="tabular-nums">{formattedTime}</span>
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Admin Overview
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              System-wide metrics, research topic oversight, and account governance.
            </p>
          </div>

          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 active:scale-95"
          >
            Manage Accounts <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Metric Cards Grid */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Users}
            value={loading ? "..." : String(totalStudents).padStart(2, "0")}
            label="Total Students"
            color="indigo"
            trend="Registered students"
            linkTo="/admin/users?role=student"
          />
          <StatCard
            icon={GraduationCap}
            value={loading ? "..." : String(totalTeachers).padStart(2, "0")}
            label="Total Supervisors"
            color="emerald"
            trend="Faculty members"
            linkTo="/admin/users?role=teacher"
          />
          <StatCard
            icon={FolderKanban}
            value={loading ? "..." : String(activeProjects).padStart(2, "0")}
            label="Active Teams"
            color="amber"
            trend="Formed research teams"
            linkTo="/admin/groups"
          />
          <StatCard
            icon={CheckCircle2}
            value={loading ? "..." : String(completedProjects).padStart(2, "0")}
            label="Closed Projects"
            color="violet"
            trend="Deadline passed topics"
            linkTo="/admin/topics"
          />
        </div>

        {/* Main Content Split Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          
          {/* Left: Recent User Registrations */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-[#2A2A2A] dark:bg-[#0F0F0F]">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Recent Registrations</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Latest user accounts created on the platform</p>
              </div>
              <Link to="/admin/users" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                View all users ({users.length})
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {loading ? (
                <div className="p-8 text-center text-sm text-slate-500">Loading registrations...</div>
              ) : recentUsers.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">No user accounts found.</div>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 px-6 transition-colors hover:bg-slate-50/80 dark:hover:bg-[#222]">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${user.role === "teacher" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : user.role === "admin" ? "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"}`}>
                        {user.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name || "Unnamed User"}</p>
                          {user.accountStatus === "suspended" && (
                            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                              Suspended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email} · {user.department || "No dept"}</p>
                      </div>
                    </div>

                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${user.role === "teacher" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : user.role === "admin" ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"}`}>
                      {user.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Right Sidebar: Quick Actions & Research Summary */}
          <div className="space-y-6">
            
            {/* Quick Actions */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Admin Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/admin/users"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-indigo-500 hover:bg-indigo-50/50 dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-indigo-500 dark:hover:bg-indigo-500/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/20">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">User Governance</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Suspend or activate accounts</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/topics"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-amber-500 hover:bg-amber-50/50 dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-amber-500 dark:hover:bg-amber-500/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/20">
                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Topic Moderation</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Flag or update topic details</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>

                <Link
                  to="/admin/groups"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-emerald-500 dark:hover:bg-emerald-500/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/20">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Reports & CSV Export</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Download data summaries</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              </div>
            </section>

            {/* Research Snapshot */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818]">
              <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">Research Topics Overview</h2>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Total Published Topics</span>
                  <span className="font-bold text-slate-900 dark:text-white">{topics.filter((t) => t.status === "published").length}</span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-[#2A2A2A]" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Currently Open Topics</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{openTopicsCount}</span>
                </div>
                <div className="h-px bg-slate-100 dark:bg-[#2A2A2A]" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Formed Research Groups</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{teams.length}</span>
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
  trend,
  linkTo,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  color: "indigo" | "emerald" | "amber" | "violet";
  trend: string;
  linkTo?: string;
}) {
  const colorClasses = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    amber: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    violet: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
  }[color];

  const cardContent = (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-[#2A2A2A] dark:bg-[#181818]">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colorClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{trend}</span>
      </div>
      <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block transition-transform hover:-translate-y-0.5">{cardContent}</Link>;
  }

  return cardContent;
}
