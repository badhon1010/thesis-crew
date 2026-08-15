import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users, Clock3, CheckCircle2, Plus, Edit, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Firebase imports
import { auth } from "@/firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getTeacherResearchTopics, deleteResearchTopic, type ResearchTopic } from "@/firebase/researchTopics";

const db = getFirestore();

export default function TeacherDashboard() {
  const [topics, setTopics] = useState<ResearchTopic[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Real-time and user state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState("Supervisor");

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch the actual name from the users collection
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().name) {
          const fullName = userDoc.data().name;
          setUserName(fullName.split(" ")[0]); // Use the first name
        } else {
          const fallbackName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Teacher";
          setUserName(fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
        }

        // Fetch the teacher's research topics
        try {
          const data = await getTeacherResearchTopics(user.uid);
          setTopics(data);
        } catch (error) {
          console.error("Failed to load research topics:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Handle topic deletion
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      try {
        await deleteResearchTopic(id);
        setTopics(topics.filter((topic) => topic.id !== id)); // Update the state to remove the deleted topic
      } catch (error) {
        console.error("Failed to delete topic:", error);
        alert("Failed to delete topic.");
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
        
        {/* Top Header and Real-time Clock */}
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

        {/* Statistics Metric Cards */}
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BookOpen} value={String(topics.length).padStart(2, "0")} label="Active Topics" trend="+2 this month" />
          <StatCard icon={Users} value="24" label="Enrolled Students" trend="Active teams" />
          <StatCard icon={Clock3} value="06" label="Pending Requests" trend="Needs review" />
          <StatCard icon={CheckCircle2} value="03" label="Completed Projects" trend="Successfully closed" />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
          
          {/* Research Topic List */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">My research topics</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Your currently published projects and guidelines.</p>
              </div>
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                {topics.length} Total
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#2A2A2A]">
              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading topics...</div>
              ) : topics.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No research topics found.</div>
              ) : (
                topics.map((topic) => (
                  <div key={topic.id} className="group p-6 transition-colors hover:bg-slate-50 dark:hover:bg-[#222222]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{topic.title}</h3>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{topic.category}</span>
                          <span>•</span>
                          <span>Max Team Size: {topic.maxTeamSize}</span>
                        </div>
                      </div>
                      
                      {/* Edit and Delete Action Buttons */}
                      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
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
          <section className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2A2A2A] dark:bg-[#181818] overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-5 dark:border-[#2A2A2A]">
              <h2 className="font-bold text-slate-900 dark:text-white">Pending requests</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Students waiting for supervisor review.</p>
            </div>

            <div className="space-y-3 p-6">
              {[
                ["Sarah Ahmed", "Python · Machine Learning", "92%"],
                ["Tanvir Hasan", "IoT · C++ Embedded", "84%"],
              ].map(([name, skills, match]) => (
                <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:border-slate-200 dark:border-[#2A2A2A] dark:bg-[#121212] dark:hover:border-[#3a3a3a]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      {name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{skills}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {match}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, value, label, trend }: any) {
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