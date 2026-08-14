import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// ফায়ারবেস ইমপোর্ট
import { auth } from "@/firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/firestore";

// ফেক রিকমেন্ডেড টপিকস (পরবর্তীতে এটাও ডাটাবেজ থেকে আসবে)
const mockTopics = [
  {
    title: "AI-Based Fall Detection",
    supervisor: "Dr. Rahman",
    skills: "Python · ML · IoT",
    match: "92%",
  },
  {
    title: "Smart Campus Analytics",
    supervisor: "Dr. Karim",
    skills: "Python · Data Science",
    match: "86%",
  },
];

export default function StudentDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState("Student");

  // রিয়েল-টাইম ঘড়ি
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ফায়ারবেস থেকে স্টুডেন্টের আসল নাম আনা
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().name) {
            const fullName = userDoc.data().name;
            setUserName(fullName.split(" ")[0]); // শুধু নামের প্রথম অংশ দেখাবে
          } else {
            const fallbackName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Student";
            setUserName(fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1));
          }
        } catch (error) {
          console.error("Error fetching student name:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const hour = currentTime.getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

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
    <DashboardLayout role="student">
      <div className="mx-auto max-w-5xl px-2 sm:px-0">
        
        {/* ওয়েলকাম এবং রিয়েল-টাইম ক্লক সেকশন */}
        <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
              <Clock3 className="h-4 w-4" />
              <span>{formattedDate}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400" />
                <span className="tabular-nums">{formattedTime}</span>
              </div>
            </div>

            <h1 className="text-4xl font-semibold tracking-tighter text-slate-900 dark:text-white">
              {greeting}, {userName}.
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Here’s what’s happening with your research.
            </p>
          </div>

          <Link
            to="/student/research-topics"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Explore topics
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* স্ট্যাটিস্টিক্স গ্রিড */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={FolderKanban} value="03" label="Active projects" trend="+1 this month" />
          <StatCard icon={Clock3} value="02" label="Pending requests" trend="Needs attention" />
          <StatCard icon={CheckCircle2} value="18" label="Completed tasks" trend="+4 this week" />
          <StatCard icon={FileText} value="07" label="Saved papers" trend="+2 this month" />
        </div>

        {/* প্রজেক্ট এবং রিকমেন্ডেশন গ্রিড */}
        <div className="mb-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#1e2433] dark:bg-[#111622]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#1e2433]">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">Recommended for you</h2>
                <p className="mt-1 text-xs text-slate-500">Research topics based on your profile.</p>
              </div>
              <Link to="/student/research-topics" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                View all
              </Link>
            </div>

            <div className="p-4">
              {mockTopics.map((topic) => (
                <div key={topic.title} className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2133]">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{topic.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{topic.supervisor} · {topic.skills}</p>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{topic.match}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">match</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#1e2433] dark:bg-[#111622]">
            <div className="border-b border-slate-100 px-6 py-5 dark:border-[#1e2433]">
              <h2 className="font-semibold text-slate-900 dark:text-white">Current projects</h2>
              <p className="mt-1 text-xs text-slate-500">Keep an eye on your active work.</p>
            </div>

            <div className="space-y-6 p-6">
              <ProjectProgress title="AI-Based Fall Detection" progress={72} deadline="Aug 28" />
              <ProjectProgress title="Smart Campus Analytics" progress={44} deadline="Sep 04" />
              <ProjectProgress title="IoT Health Monitoring" progress={26} deadline="Sep 17" />
            </div>
          </section>
        </div>

        {/* টাস্ক এবং অ্যাক্টিভিটি */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#1e2433] dark:bg-[#111622]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#1e2433]">
              <h2 className="font-semibold text-slate-900 dark:text-white">Upcoming tasks</h2>
              <MoreHorizontal className="h-5 w-5 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#1e2433]">
              {[
                ["Literature review", "AI-Based Fall Detection", "Today"],
                ["Prepare dataset", "Smart Campus Analytics", "Aug 17"],
                ["Model evaluation", "IoT Health Monitoring", "Aug 20"],
              ].map(([task, project, date]) => (
                <div key={task} className="flex items-center gap-4 px-6 py-5 transition-colors hover:bg-slate-50 dark:hover:bg-[#1a2133]">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{task}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{project}</p>
                  </div>
                  <span className="text-xs text-slate-400">{date}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white dark:border-[#1e2433] dark:bg-[#111622]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-[#1e2433]">
              <h2 className="font-semibold text-slate-900 dark:text-white">Recent activity</h2>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
            </div>

            <div className="space-y-6 p-6">
              <Activity text="Dr. Rahman accepted your join request." time="2h ago" />
              <Activity text="New feedback added to Fall Detection." time="Yesterday" />
              <Activity text="You saved Smart Campus Analytics." time="2d ago" />
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, value, label, trend }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#1e2433] dark:bg-[#111622]">
      <div className="flex items-center justify-between">
        <Icon className="h-5 w-5 text-slate-400" />
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tighter text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ProjectProgress({ title, progress, deadline }: any) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-900 dark:text-white">{title}</p>
        <span className="text-xs font-semibold text-slate-900 dark:text-white">{progress}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Next deadline · {deadline}</p>
    </div>
  );
}

function Activity({ text, time }: any) {
  return (
    <div className="flex gap-4">
      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
      <div>
        <p className="text-sm text-slate-900 dark:text-white">{text}</p>
        <p className="mt-1 text-xs text-slate-500">{time}</p>
      </div>
    </div>
  );
}